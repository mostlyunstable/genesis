import asyncio
import json
import time
from enum import Enum
from typing import Dict, Any, Optional, Callable, Awaitable, List
import redis.asyncio as aioredis
from backend.app.core.config import settings


class JobCategory(str, Enum):
    EVENT_INGESTION = "EVENT_INGESTION"
    EVENT_NORMALIZATION = "EVENT_NORMALIZATION"
    DETECTION_PROCESSING = "DETECTION_PROCESSING"
    INCIDENT_CORRELATION = "INCIDENT_CORRELATION"
    THREAT_INTEL_ENRICHMENT = "THREAT_INTEL_ENRICHMENT"
    AI_INVESTIGATION = "AI_INVESTIGATION"
    NOTIFICATION_DELIVERY = "NOTIFICATION_DELIVERY"
    SCHEDULED_MAINTENANCE = "SCHEDULED_MAINTENANCE"


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    DEAD_LETTER = "DEAD_LETTER"


class JobRecord:
    def __init__(
        self,
        job_type: str,
        payload: Dict[str, Any],
        job_id: Optional[str] = None,
        max_retries: int = 3,
        idempotency_key: Optional[str] = None
    ):
        self.id = job_id or f"JOB-{int(time.time()*1000)%1000000:06d}"
        self.job_type = job_type
        self.payload = payload
        self.status = JobStatus.QUEUED.value
        self.attempts = 0
        self.max_retries = max_retries
        self.idempotency_key = idempotency_key
        self.error_message: Optional[str] = None
        self.enqueued_at = time.time()
        self.started_at: Optional[float] = None
        self.completed_at: Optional[float] = None
        self.processing_latency_ms: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "job_type": self.job_type,
            "payload": json.dumps(self.payload),
            "status": self.status,
            "attempts": str(self.attempts),
            "max_retries": str(self.max_retries),
            "idempotency_key": self.idempotency_key or "",
            "error_message": self.error_message or "",
            "enqueued_at": str(self.enqueued_at),
            "processing_latency_ms": str(self.processing_latency_ms or 0.0)
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "JobRecord":
        rec = cls(
            job_type=data["job_type"],
            payload=json.loads(data["payload"]),
            job_id=data["id"],
            max_retries=int(data.get("max_retries", 3)),
            idempotency_key=data.get("idempotency_key") or None
        )
        rec.status = data.get("status", JobStatus.QUEUED.value)
        rec.attempts = int(data.get("attempts", 0))
        rec.error_message = data.get("error_message") or None
        rec.enqueued_at = float(data.get("enqueued_at", time.time()))
        rec.processing_latency_ms = float(data.get("processing_latency_ms", 0.0))
        return rec


# Backward compatibility alias
BackgroundJob = JobRecord


class RedisJobQueue:
    """
    Production Redis-backed persistent background queue.
    Features:
    - Dead-letter queue (DLQ) for failed jobs
    - Exponential backoff retry policies
    - Idempotency deduplication
    - Status tracking and queue metrics
    - Graceful shutdown
    """
    def __init__(self, redis_url: str = settings.REDIS_URL, queue_prefix: str = "sentinel"):
        self.redis_url = redis_url
        self._redis: Optional[aioredis.Redis] = None
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None
        self._handlers: Dict[str, Callable[[JobRecord], Awaitable[None]]] = {}
        self.queue_key = f"{queue_prefix}:jobs:queue"
        self.dlq_key = f"{queue_prefix}:jobs:dlq"
        self.job_prefix = f"{queue_prefix}:job:"
        self.idemp_prefix = f"{queue_prefix}:idemp:"
        self.processed_jobs_count = 0
        self.failed_jobs_count = 0
        self.total_latency_ms = 0.0

    async def get_client(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=3.0,
                socket_connect_timeout=3.0
            )
        return self._redis

    def register_handler(self, job_type: str, handler: Callable[[JobRecord], Awaitable[None]]):
        self._handlers[job_type] = handler

    async def enqueue(
        self,
        job_type: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        max_retries: int = 3
    ) -> str:
        client = await self.get_client()

        # Idempotency check: if key set within 1 hour, return existing job ID
        if idempotency_key:
            idemp_k = f"{self.idemp_prefix}{idempotency_key}"
            existing_job_id = await client.get(idemp_k)
            if existing_job_id:
                return existing_job_id

        job = JobRecord(job_type, payload, max_retries=max_retries, idempotency_key=idempotency_key)

        # Store job details in Redis Hash
        await client.hset(f"{self.job_prefix}{job.id}", mapping=job.to_dict())
        # Push job ID to work queue
        await client.lpush(self.queue_key, job.id)

        # Record idempotency key with 1-hour TTL
        if idempotency_key:
            await client.set(f"{self.idemp_prefix}{idempotency_key}", job.id, ex=3600)

        return job.id

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        client = await self.get_client()
        data = await client.hgetall(f"{self.job_prefix}{job_id}")
        if not data:
            return None
        return JobRecord.from_dict(data).to_dict()

    async def get_queue_metrics(self) -> Dict[str, Any]:
        client = await self.get_client()
        q_len = await client.llen(self.queue_key)
        dlq_len = await client.llen(self.dlq_key)
        avg_lat = (self.total_latency_ms / self.processed_jobs_count) if self.processed_jobs_count > 0 else 0.0
        return {
            "queue_depth": q_len,
            "dlq_depth": dlq_len,
            "processed_jobs": self.processed_jobs_count,
            "failed_jobs": self.failed_jobs_count,
            "average_latency_ms": round(avg_lat, 2),
            "backend": "redis"
        }

    @property
    def average_latency_ms(self) -> float:
        if self.processed_jobs_count == 0:
            return 0.0
        return self.total_latency_ms / self.processed_jobs_count

    @property
    def is_healthy(self) -> bool:
        return not self.failed_jobs_count or self._running

    async def check_health(self) -> bool:
        try:
            client = await self.get_client()
            return await client.ping() is True
        except Exception:
            return False

    async def start(self):
        if self._running:
            return
        self._running = True
        self._worker_task = asyncio.create_task(self._process_loop())

    async def stop(self):
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    async def _process_loop(self):
        client = await self.get_client()
        while self._running:
            try:
                # BRPOP from right side with 1 second timeout
                item = await client.brpop(self.queue_key, timeout=1)
                if not item:
                    continue
                _, job_id = item
                await self._execute_job(job_id)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[RedisWorker Loop Error] {e}")
                await asyncio.sleep(0.1)

    async def _execute_job(self, job_id: str):
        client = await self.get_client()
        job_data = await client.hgetall(f"{self.job_prefix}{job_id}")
        if not job_data:
            return

        job = JobRecord.from_dict(job_data)
        job.attempts += 1
        t_start = time.perf_counter()
        job.status = JobStatus.PROCESSING.value
        await client.hset(f"{self.job_prefix}{job.id}", "status", job.status)
        await client.hset(f"{self.job_prefix}{job.id}", "attempts", str(job.attempts))

        handler = self._handlers.get(job.job_type)
        try:
            if handler:
                await handler(job)
            job.status = JobStatus.COMPLETED.value
            job.processing_latency_ms = (time.perf_counter() - t_start) * 1000.0
            self.total_latency_ms += job.processing_latency_ms
            self.processed_jobs_count += 1
            await client.hset(f"{self.job_prefix}{job.id}", mapping={
                "status": job.status,
                "processing_latency_ms": str(round(job.processing_latency_ms, 3))
            })
        except Exception as e:
            job.error_message = str(e)
            if job.attempts < job.max_retries:
                # Exponential backoff retry
                delay = 0.05 * (2 ** (job.attempts - 1))
                await asyncio.sleep(delay)
                job.status = JobStatus.QUEUED.value
                await client.hset(f"{self.job_prefix}{job.id}", mapping={
                    "status": job.status,
                    "error_message": job.error_message
                })
                # Re-queue for next attempt
                await client.lpush(self.queue_key, job.id)
            else:
                # Move to Dead Letter Queue (DLQ)
                job.status = JobStatus.DEAD_LETTER.value
                self.failed_jobs_count += 1
                await client.hset(f"{self.job_prefix}{job.id}", mapping={
                    "status": job.status,
                    "error_message": job.error_message
                })
                await client.lpush(self.dlq_key, job.id)


class InMemoryJobQueue:
    """
    In-memory asynchronous queue adapter for isolated test suites or offline development.
    """
    def __init__(self):
        self._queue: asyncio.Queue[JobRecord] = asyncio.Queue()
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None
        self._handlers: Dict[str, Callable[[JobRecord], Awaitable[None]]] = {}
        self.processed_jobs_count = 0
        self.failed_jobs_count = 0
        self.total_latency_ms = 0.0
        self._jobs: Dict[str, JobRecord] = {}
        self._idemp_map: Dict[str, str] = {}

    def register_handler(self, job_type: str, handler: Callable[[JobRecord], Awaitable[None]]):
        self._handlers[job_type] = handler

    async def enqueue(
        self,
        job_type: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        max_retries: int = 3
    ) -> str:
        if idempotency_key and idempotency_key in self._idemp_map:
            return self._idemp_map[idempotency_key]

        job = JobRecord(job_type, payload, max_retries=max_retries, idempotency_key=idempotency_key)
        self._jobs[job.id] = job
        if idempotency_key:
            self._idemp_map[idempotency_key] = job.id
        await self._queue.put(job)
        return job.id

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self._jobs.get(job_id)
        return job.to_dict() if job else None

    @property
    def is_healthy(self) -> bool:
        return self._running or self._queue.empty()

    async def start(self):
        if self._running:
            return
        self._running = True
        self._worker_task = asyncio.create_task(self._process_loop())

    async def stop(self):
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

    async def _process_loop(self):
        while self._running:
            try:
                job = await self._queue.get()
                t0 = time.perf_counter()
                job.status = JobStatus.PROCESSING.value
                handler = self._handlers.get(job.job_type)
                try:
                    if handler:
                        await handler(job)
                    job.status = JobStatus.COMPLETED.value
                    job.processing_latency_ms = (time.perf_counter() - t0) * 1000.0
                    self.total_latency_ms += job.processing_latency_ms
                    self.processed_jobs_count += 1
                except Exception as e:
                    job.error_message = str(e)
                    job.status = JobStatus.DEAD_LETTER.value
                    self.failed_jobs_count += 1
                finally:
                    self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception:
                pass

    @property
    def average_latency_ms(self) -> float:
        if self.processed_jobs_count == 0:
            return 0.0
        return self.total_latency_ms / self.processed_jobs_count


# Global singleton worker instance configured with Redis default
redis_job_queue = RedisJobQueue()
in_memory_job_queue = InMemoryJobQueue()

# Default export for existing modules
job_worker = redis_job_queue
BackgroundJobWorker = InMemoryJobQueue
