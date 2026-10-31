import asyncio
import time
import pytest
from backend.app.services.queue import (
    RedisJobQueue,
    JobCategory,
    JobStatus,
    JobRecord
)


@pytest.fixture
async def redis_queue():
    """Initializes and clears a real Redis-backed queue on localhost:6379."""
    queue = RedisJobQueue("redis://localhost:6379/0", queue_prefix="sentinel:test")
    client = await queue.get_client()
    # Clean keys for test isolation
    keys = await client.keys("sentinel:test:*")
    if keys:
        await client.delete(*keys)
    yield queue
    await queue.stop()


@pytest.mark.asyncio
async def test_redis_connection_and_health(redis_queue: RedisJobQueue):
    """Verify live Redis connectivity and health check probe."""
    assert await redis_queue.check_health() is True
    assert redis_queue.is_healthy is True


@pytest.mark.asyncio
async def test_redis_enqueue_all_categories(redis_queue: RedisJobQueue):
    """Verify jobs can be enqueued across all 8 required enterprise categories."""
    categories = [
        JobCategory.EVENT_INGESTION.value,
        JobCategory.EVENT_NORMALIZATION.value,
        JobCategory.DETECTION_PROCESSING.value,
        JobCategory.INCIDENT_CORRELATION.value,
        JobCategory.THREAT_INTEL_ENRICHMENT.value,
        JobCategory.AI_INVESTIGATION.value,
        JobCategory.NOTIFICATION_DELIVERY.value,
        JobCategory.SCHEDULED_MAINTENANCE.value,
    ]

    job_ids = []
    for cat in categories:
        jid = await redis_queue.enqueue(cat, {"source": "unit_test", "timestamp": time.time()})
        job_ids.append(jid)
        status_data = await redis_queue.get_job_status(jid)
        assert status_data is not None
        assert status_data["job_type"] == cat
        assert status_data["status"] == JobStatus.QUEUED.value

    metrics = await redis_queue.get_queue_metrics()
    assert metrics["queue_depth"] == 8
    assert metrics["backend"] == "redis"


@pytest.mark.asyncio
async def test_redis_idempotency_enforcement(redis_queue: RedisJobQueue):
    """Verify idempotency key prevents duplicate job enqueuing."""
    idemp_key = "idemp-secops-batch-001"
    jid_1 = await redis_queue.enqueue(
        JobCategory.EVENT_INGESTION.value,
        {"batch_id": 101},
        idempotency_key=idemp_key
    )
    # Attempt second enqueue with identical key
    jid_2 = await redis_queue.enqueue(
        JobCategory.EVENT_INGESTION.value,
        {"batch_id": 101, "extra": "ignored"},
        idempotency_key=idemp_key
    )

    assert jid_1 == jid_2
    metrics = await redis_queue.get_queue_metrics()
    assert metrics["queue_depth"] == 1  # Only 1 job in queue


@pytest.mark.asyncio
async def test_redis_worker_execution_and_completion(redis_queue: RedisJobQueue):
    """Verify worker consumes from Redis, invokes handler, and updates job to COMPLETED."""
    executed_jobs = []

    async def ingest_handler(job: JobRecord):
        await asyncio.sleep(0.01)  # Synthetic processing
        executed_jobs.append(job.payload["target"])

    redis_queue.register_handler(JobCategory.EVENT_NORMALIZATION.value, ingest_handler)
    await redis_queue.start()

    try:
        jid = await redis_queue.enqueue(JobCategory.EVENT_NORMALIZATION.value, {"target": "198.51.100.42"})
        # Allow processing
        for _ in range(20):
            status = await redis_queue.get_job_status(jid)
            if status and status["status"] == JobStatus.COMPLETED.value:
                break
            await asyncio.sleep(0.05)

        assert len(executed_jobs) == 1
        assert executed_jobs[0] == "198.51.100.42"
        final_status = await redis_queue.get_job_status(jid)
        assert final_status["status"] == JobStatus.COMPLETED.value
        assert float(final_status["processing_latency_ms"]) > 0
    finally:
        await redis_queue.stop()


@pytest.mark.asyncio
async def test_redis_retry_and_dead_letter_queue(redis_queue: RedisJobQueue):
    """
    Verify retry policy with exponential backoff and DLQ routing on failure:
    1. Handler fails for max_retries attempts.
    2. Job is routed to DLQ key 'sentinel:jobs:dlq' with status DEAD_LETTER.
    """
    failure_counts = {"count": 0}

    async def failing_handler(job: JobRecord):
        failure_counts["count"] += 1
        raise ValueError(f"Simulated processing error on attempt {failure_counts['count']}")

    redis_queue.register_handler("FAIL_TASK", failing_handler)
    await redis_queue.start()

    try:
        # Enqueue with max_retries = 2
        jid = await redis_queue.enqueue("FAIL_TASK", {"data": "test"}, max_retries=2)

        # Wait for retries to exhaust
        for _ in range(30):
            status = await redis_queue.get_job_status(jid)
            if status and status["status"] == JobStatus.DEAD_LETTER.value:
                break
            await asyncio.sleep(0.05)

        final_status = await redis_queue.get_job_status(jid)
        assert final_status["status"] == JobStatus.DEAD_LETTER.value
        assert int(final_status["attempts"]) == 2
        assert "Simulated processing error" in final_status["error_message"]

        # Verify job is present in Dead Letter Queue
        metrics = await redis_queue.get_queue_metrics()
        assert metrics["dlq_depth"] >= 1
    finally:
        await redis_queue.stop()
