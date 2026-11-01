import asyncio
import httpx
from datetime import datetime, timezone

FORWARDER_KEY = "sentinel_fwd_live_9942a8b9e1"
BASE_URL = "http://127.0.0.1:8000/api/v1"

async def main():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # 1. Ingest batch of real SSH logs
        logs = []
        now = datetime.now(timezone.utc)
        for i in range(15):
            logs.append({
                "timestamp": now.isoformat(),
                "raw": f"Nov 01 10:15:{i:02d} bastion-01 sshd[{12400+i}]: Failed password for invalid user root from 198.51.100.42 port {50000+i} ssh2"
            })
        # 1 accepted session
        logs.append({
            "timestamp": now.isoformat(),
            "raw": "Nov 01 10:15:30 bastion-01 sshd[12436]: Accepted password for deploy from 198.51.100.42 port 50016 ssh2"
        })

        print("Ingesting 16 real security events...")
        ingest_res = await client.post(
            "/ingest/batch",
            json={"source": "linux_ssh", "logs": logs},
            headers={"X-Sentinel-Forwarder-Key": FORWARDER_KEY}
        )
        print("Ingest status:", ingest_res.status_code, ingest_res.json())

        # 2. Check overview metrics
        overview_res = await client.get("/analytics/overview")
        print("Overview metrics:", overview_res.status_code, overview_res.json())

        # 3. List incidents
        incidents_res = await client.get("/incidents")
        print("Incidents count:", incidents_res.status_code, incidents_res.json().get("total"))

if __name__ == "__main__":
    asyncio.run(main())
