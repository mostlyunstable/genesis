# Free cloud backend for the same chatbot

The deployed bot uses the same Qwen model, conversation history, generated replies,
and read-only tools as local development. The cloud VM runs Ollama, FastAPI,
PostgreSQL, and Redis. Vercel hosts the frontend.

## Account and server required

No cloud account or VM is connected yet. Create an Oracle Cloud Free Tier account
yourself and obtain an Always Free-eligible VM before these commands can run.

As checked on November 4, 2026, Oracle documents an Always Free Ampere A1 allowance
equivalent to 2 OCPUs and 12 GB RAM across the tenancy, plus a storage allowance.
Use an eligible A1 Arm VM in your home region within those totals. Confirm the
Always Free label and current limits in your own console. Do not select paid
shapes or upgrade the account for this free-only setup.

Signup requires a supported credit/debit card for identity verification; Oracle
may place temporary authorization holds. Always Free has no uptime SLA, and idle
VMs can be reclaimed. Free capacity can be unavailable. CPU inference performance and uptime must be
verified after allocation. The model is unchanged, but a small CPU VM may answer
more slowly than the development Mac.

Official limits and availability:
https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
https://www.oracle.com/cloud/free/faq/

## Prepare the VM

Use Ubuntu with Docker Engine and Docker Compose installed using Docker's
official installation instructions. Permit HTTPS ports 80 and 443 in both the
cloud network and host firewall, and restrict SSH to your administrative address.
Keep ports 5432, 6379, 8000, and 11434 private.

Point an API hostname to the VM's public address. A subdomain you control works.
For testing without buying a domain, nip.io/sslip.io can resolve a hostname
containing the public VM IP. Review that third-party DNS dependency before use:
https://nip.io/

Clone the repository and generate private configuration on the server:

    git clone https://github.com/mostlyunstable/genesis.git
    cd genesis
    python3 scripts/prepare_cloud_env.py \
      --api-domain YOUR_API_HOSTNAME \
      --frontend-origin https://YOUR_PROJECT.vercel.app

The command generates independent secrets in .env.cloud with mode 0600 and
refuses to overwrite an existing file. The frontend origin must be the actual
Vercel project origin. The project can be created in Vercel first to determine
its name; deploying the frontend requires the API URL.

Start the backend and HTTPS gateway:

    docker compose --env-file .env.cloud \
      -f docker-compose.yml -f compose.cloud.yml up -d --build

The cloud overlay disables the bundled frontend by default. It publishes Caddy
on ports 80 and 443, keeps model and database services private, and persists model
files, uploaded logs, database records, and TLS certificates. Caddy obtains HTTPS
certificates when the hostname resolves correctly and ports are reachable.

The first start downloads the model. Cloud inference uses a five-minute read
timeout, periodic stream heartbeats, one parallel model request, and a 30-minute
model keep-alive period.

Create a production administrator:

    docker compose --env-file .env.cloud \
      -f docker-compose.yml -f compose.cloud.yml \
      exec backend python -m backend.app.create_admin

Only you enter the new administrator credentials.

## Connect Vercel

Set VITE_API_BASE_URL=https://YOUR_API_HOSTNAME in the Vercel project and redeploy
main. Keep credentials and database secrets on the backend, outside VITE_* values.

Verify HTTPS /health, sign-in, /api/v1/chat/model availability, a greeting, a
multi-turn follow-up, and log analysis. Test Stop and Retry across a page reload.
These are deployment acceptance checks; the account, VM, certificates, and live
cloud responses have not yet been provisioned or verified.

Ollama CPU containers:
https://docs.ollama.com/docker

Automatic HTTPS requirements:
https://caddyserver.com/docs/automatic-https
