import asyncio
import time
from typing import Dict, Any, Optional, Callable, Awaitable
from datetime import datetime, timezone


class BackgroundJob:
    def __init__(self, job_type: str, payload: Dict[str, Any]):
        self.id = f"JOB-{int(time.time()*1000)%1000000:06d}"
        self.job_type = job_type
        self.payload = payload
        self.enqueued_at = time.perf_counter()
        self.status = "QUEUED"
        self.processing_latency_ms: Optional[float] = None


class BackgroundJobWorker:
    def __init__(self):
        self._queue: asyncio.Queue[BackgroundJob] = asyncio.Queue()
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None
        self._handlers: Dict[str, Callable[[BackgroundJob], Awaitable[None]]] = {}
        self.processed_jobs_count = 0
        self.failed_jobs_count = 0
        self.total_queue_latency_ms = 0.0

    def register_handler(self, job_type: str, handler: Callable[[BackgroundJob], Awaitable[None]]):
        self._handlers[job_type] = handler

    async def enqueue(self, job_type: str, payload: Dict[str, Any]) -> str:
        job = BackgroundJob(job_type, payload)
        await self._queue.put(job)
        return job.id

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
                job.processing_latency_ms = (time.perf_counter() - job.enqueued_at) * 1000.0
                self.total_queue_latency_ms += job.processing_latency_ms
                job.status = "PROCESSING"

                handler = self._handlers.get(job.job_type)
                if handler:
                    await handler(job)
                job.status = "COMPLETED"
                self.processed_jobs_count += 1
                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.failed_jobs_count += 1
                print(f"[Worker Error] Job execution failed: {e}")

    @property
    def is_healthy(self) -> bool:
        return self._running or self._queue.empty()

    @property
    def average_latency_ms(self) -> float:
        if self.processed_jobs_count == 0:
            return 0.0
        return self.total_queue_latency_ms / self.processed_jobs_count


# Global singleton worker instance
job_worker = BackgroundJobWorker()
