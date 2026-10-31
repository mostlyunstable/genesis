import pytest
import time
from httpx import AsyncClient
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_performance_benchmarks(client: AsyncClient):
    print("\n--- PERFORMANCE & RELIABILITY BENCHMARK SUITE ---")

    # 1. Benchmark Event Ingestion & Normalization Throughput
    batch_size = 100
    logs = [
        {
            "timestamp": f"2026-10-31T10:15:{i%60:02d}Z",
            "raw": f"Oct 31 10:15:{i%60:02d} bastion-01 sshd[{12400+i}]: Failed password for invalid user perf_{i} from 198.51.100.42 port {41200+i} ssh2"
        }
        for i in range(batch_size)
    ]

    t0 = time.perf_counter()
    res = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "linux_ssh", "logs": logs},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    t_ingest = time.perf_counter() - t0
    assert res.status_code == 202

    events_per_sec = batch_size / t_ingest
    ms_per_event = (t_ingest / batch_size) * 1000.0

    print(f"[BENCHMARK] Ingested {batch_size} events in {t_ingest*1000:.2f} ms")
    print(f"[BENCHMARK] Ingestion Throughput: {events_per_sec:.1f} events/sec")
    print(f"[BENCHMARK] Ingestion Latency: {ms_per_event:.3f} ms/event")

    # Ingestion latency must be under 25ms per event in test environment
    assert ms_per_event < 25.0

    # 2. Benchmark Detection Retrieval Latency
    t0 = time.perf_counter()
    det_res = await client.get("/api/v1/detections")
    t_detect = (time.perf_counter() - t0) * 1000.0
    assert det_res.status_code == 200
    print(f"[BENCHMARK] Detections Query Latency: {t_detect:.2f} ms")
    assert t_detect < 100.0

    # 3. Benchmark Incident Query Latency
    t0 = time.perf_counter()
    inc_res = await client.get("/api/v1/incidents")
    t_inc = (time.perf_counter() - t0) * 1000.0
    assert inc_res.status_code == 200
    print(f"[BENCHMARK] Incidents Query Latency: {t_inc:.2f} ms")
    assert t_inc < 100.0

    # 4. Benchmark AI Investigation Latency
    t0 = time.perf_counter()
    ai_res = await client.post("/api/v1/analyst/query", json={
        "prompt": "Summarize today's critical brute force incidents"
    })
    t_ai = (time.perf_counter() - t0) * 1000.0
    assert ai_res.status_code == 200
    print(f"[BENCHMARK] AI Analyst Reasoning Latency: {t_ai:.2f} ms")
    assert t_ai < 300.0

    print("--- ALL PERFORMANCE BENCHMARKS SATISFIED ---")
