import time
import statistics
import asyncio
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.models.event import SecurityEventModel
from backend.app.models.detection import DetectionModel
from backend.app.models.incident import IncidentModel
from backend.app.core.security import get_password_hash
from backend.app.services.queue import BackgroundJobWorker, BackgroundJob
from backend.app.services.analyst import LocalDeterministicProvider


@pytest.fixture
async def bench_auth(client: AsyncClient, db_session):
    user = User(
        id="USR-BENCH-P2",
        username="benchmarker@sentinel.ai",
        full_name="Performance Benchmarker",
        hashed_password=get_password_hash("bench_matrix_2026!"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={
        "username": "benchmarker@sentinel.ai",
        "password": "bench_matrix_2026!"
    })
    token = login.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY
    }


def calculate_percentiles(latencies: list[float]) -> dict:
    sorted_latencies = sorted(latencies)
    n = len(sorted_latencies)
    if n == 0:
        return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "mean": 0.0}
    p50 = sorted_latencies[int(0.50 * n)]
    p95 = sorted_latencies[min(int(0.95 * n), n - 1)]
    p99 = sorted_latencies[min(int(0.99 * n), n - 1)]
    return {
        "p50": round(p50, 3),
        "p95": round(p95, 3),
        "p99": round(p99, 3),
        "mean": round(statistics.mean(sorted_latencies), 3)
    }


@pytest.mark.asyncio
async def test_comprehensive_system_benchmarks(client: AsyncClient, bench_auth: dict, db_session):
    """
    Empirical benchmark measurement across all system subsystems:
    1. Ingestion throughput & latency percentiles (100 events).
    2. Detection processing latency.
    3. Incident query latency percentiles.
    4. Database query latency percentiles.
    5. Local deterministic AI latency percentiles.
    6. Queue processing latency percentiles.
    """
    benchmark_results = {}
    base_time = datetime.now(timezone.utc)

    # 1. Batch Ingestion Throughput & Latency (10 batches of 10 events = 100 events)
    batch_latencies = []
    total_events = 100
    batch_size = 10
    num_batches = total_events // batch_size

    t_start_total = time.perf_counter()
    for b in range(num_batches):
        logs = [
            {
                "timestamp": (base_time + timedelta(seconds=b * 10 + i)).isoformat(),
                "raw": f"Oct 31 10:00:{i:02d} auth-srv sshd[{1000+b*10+i}]: Failed password for invalid user user_{b}_{i} from 198.51.100.{10+b} port {40000+i} ssh2"
            }
            for i in range(batch_size)
        ]
        t0 = time.perf_counter()
        res = await client.post("/api/v1/ingest/batch", json={"source": "linux_ssh", "logs": logs}, headers=bench_auth)
        t1 = time.perf_counter()
        assert res.status_code == 202
        batch_latencies.append((t1 - t0) * 1000.0)

    total_ingest_duration = time.perf_counter() - t_start_total
    events_per_sec = total_events / total_ingest_duration

    benchmark_results["ingest_throughput_events_per_sec"] = round(events_per_sec, 2)
    benchmark_results["ingest_batch_latency_ms"] = calculate_percentiles(batch_latencies)
    per_event_latencies = [lat / batch_size for lat in batch_latencies]
    benchmark_results["ingest_per_event_latency_ms"] = calculate_percentiles(per_event_latencies)

    # 2. Database Query Latency (20 consecutive reads)
    db_latencies = []
    for _ in range(20):
        t0 = time.perf_counter()
        res = await client.get("/api/v1/events?limit=50", headers=bench_auth)
        t1 = time.perf_counter()
        assert res.status_code == 200
        db_latencies.append((t1 - t0) * 1000.0)
    benchmark_results["db_event_query_latency_ms"] = calculate_percentiles(db_latencies)

    # 3. Detection & Incident Query Latency
    det_latencies = []
    inc_latencies = []
    for _ in range(20):
        t0 = time.perf_counter()
        res_det = await client.get("/api/v1/detections?limit=50", headers=bench_auth)
        t1 = time.perf_counter()
        assert res_det.status_code == 200
        det_latencies.append((t1 - t0) * 1000.0)

        t2 = time.perf_counter()
        res_inc = await client.get("/api/v1/incidents?limit=50", headers=bench_auth)
        t3 = time.perf_counter()
        assert res_inc.status_code == 200
        inc_latencies.append((t3 - t2) * 1000.0)

    benchmark_results["detection_query_latency_ms"] = calculate_percentiles(det_latencies)
    benchmark_results["incident_query_latency_ms"] = calculate_percentiles(inc_latencies)

    # 4. Local Deterministic AI Latency (20 reasoning executions)
    res_evts = await db_session.execute(select(SecurityEventModel).limit(20))
    sample_evts = list(res_evts.scalars().all())
    ai_provider = LocalDeterministicProvider()

    ai_latencies = []
    for _ in range(20):
        t0 = time.perf_counter()
        res = await ai_provider.investigate("Synthesize threat activity", sample_evts, None)
        t1 = time.perf_counter()
        assert res.confidence > 0
        ai_latencies.append((t1 - t0) * 1000.0)
    benchmark_results["ai_local_reasoning_latency_ms"] = calculate_percentiles(ai_latencies)

    # 5. Background Queue Job Worker Latency
    worker = BackgroundJobWorker()
    queue_latencies = []

    async def job_handler(job: BackgroundJob):
        # Measure dispatch delay
        queue_latencies.append(job.processing_latency_ms or 0.0)

    worker.register_handler("BENCH_JOB", job_handler)
    await worker.start()

    try:
        for i in range(20):
            await worker.enqueue("BENCH_JOB", {"idx": i})
        # Wait for drain
        await asyncio.sleep(0.05)
    finally:
        await worker.stop()

    benchmark_results["queue_processing_latency_ms"] = calculate_percentiles(queue_latencies)

    # Print clean benchmark summary table to stdout for capture in pytest logs
    print("\n" + "=" * 60)
    print("SENTINEL AI EMPIRICAL BENCHMARK RESULTS (Phase 2 Verification)")
    print("=" * 60)
    print(f"Total Ingested Events: {total_events} events in {total_ingest_duration*1000:.2f} ms")
    print(f"Ingestion Throughput:  {benchmark_results['ingest_throughput_events_per_sec']} events/sec")
    print(f"Per-Event Ingest:      p50={benchmark_results['ingest_per_event_latency_ms']['p50']} ms, p95={benchmark_results['ingest_per_event_latency_ms']['p95']} ms, p99={benchmark_results['ingest_per_event_latency_ms']['p99']} ms")
    print(f"DB Event Query (n=50): p50={benchmark_results['db_event_query_latency_ms']['p50']} ms, p95={benchmark_results['db_event_query_latency_ms']['p95']} ms, p99={benchmark_results['db_event_query_latency_ms']['p99']} ms")
    print(f"Detections Query:      p50={benchmark_results['detection_query_latency_ms']['p50']} ms, p95={benchmark_results['detection_query_latency_ms']['p95']} ms, p99={benchmark_results['detection_query_latency_ms']['p99']} ms")
    print(f"Incidents Query:       p50={benchmark_results['incident_query_latency_ms']['p50']} ms, p95={benchmark_results['incident_query_latency_ms']['p95']} ms, p99={benchmark_results['incident_query_latency_ms']['p99']} ms")
    print(f"AI Local Fallback:     p50={benchmark_results['ai_local_reasoning_latency_ms']['p50']} ms, p95={benchmark_results['ai_local_reasoning_latency_ms']['p95']} ms, p99={benchmark_results['ai_local_reasoning_latency_ms']['p99']} ms")
    print(f"Queue Processing:      p50={benchmark_results['queue_processing_latency_ms']['p50']} ms, p95={benchmark_results['queue_processing_latency_ms']['p95']} ms, p99={benchmark_results['queue_processing_latency_ms']['p99']} ms")
    print("=" * 60)

    # Assertions on sanity thresholds
    assert benchmark_results["ingest_throughput_events_per_sec"] > 50  # Must ingest > 50 events/sec
    assert benchmark_results["ingest_per_event_latency_ms"]["p50"] < 50.0  # Under 50ms per event
    assert benchmark_results["db_event_query_latency_ms"]["p50"] < 30.0  # Under 30ms query
    assert benchmark_results["ai_local_reasoning_latency_ms"]["p50"] < 10.0  # Under 10ms local AI reasoning
