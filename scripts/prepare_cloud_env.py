"""Generate a private cloud deployment environment without overwriting secrets."""
import argparse
import json
import os
import re
import secrets
from pathlib import Path
from urllib.parse import urlsplit


def cloud_values(api_domain, frontend_origin):
    domain = api_domain.strip().lower()
    if not re.fullmatch(r"(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}", domain):
        raise ValueError("Use a DNS hostname for API_DOMAIN, without a scheme, port or path.")
    if domain.endswith((".local", ".localhost", ".internal")):
        raise ValueError("API_DOMAIN must be a public DNS hostname.")
    origin = urlsplit(frontend_origin.strip())
    if (origin.scheme != "https" or not origin.hostname or origin.username or origin.password
            or origin.path not in ("", "/") or origin.query or origin.fragment):
        raise ValueError("Use the exact public HTTPS frontend origin, without a path.")
    return {
        "API_DOMAIN": domain,
        "POSTGRES_PASSWORD": secrets.token_hex(24),
        "JWT_SECRET": secrets.token_hex(32),
        "FORWARDER_API_KEY": secrets.token_hex(32),
        "CORS_ORIGINS": json.dumps([f"https://{origin.netloc}"]),
        "OLLAMA_MODEL": "qwen3.5:4b",
    }


def write_environment(destination, values):
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as output:
        output.write("\n".join(f"{name}={value}" for name, value in values.items()) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-domain", required=True)
    parser.add_argument("--frontend-origin", required=True)
    parser.add_argument("--output", type=Path, default=Path(".env.cloud"))
    args = parser.parse_args()
    try:
        write_environment(args.output, cloud_values(args.api_domain, args.frontend_origin))
    except (ValueError, OSError) as error:
        parser.exit(1, f"Cloud setup failed: {error}\n")
    print(f"Private deployment configuration saved to {args.output}. Secret values were not printed.")


if __name__ == "__main__":
    main()
