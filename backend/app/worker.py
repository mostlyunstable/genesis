import asyncio
import signal
import sys
from backend.app.services.queue import redis_job_queue, JobCategory, JobRecord


async def sample_task_handler(job: JobRecord):
    print(f"[Worker] Processing job {job.id} [{job.job_type}] (attempt {job.attempts})")
    await asyncio.sleep(0.05)


def register_handlers():
    for cat in JobCategory:
        redis_job_queue.register_handler(cat.value, sample_task_handler)


async def main():
    print("[Sentinel AI] Starting dedicated Redis background worker...")
    register_handlers()
    await redis_job_queue.start()
    print("[Sentinel AI] Redis background worker is active and awaiting tasks.")

    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except NotImplementedError:
            pass

    try:
        await stop_event.wait()
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass
    finally:
        print("[Sentinel AI] Shutting down Redis background worker gracefully...")
        await redis_job_queue.stop()
        print("[Sentinel AI] Worker stopped cleanly.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
