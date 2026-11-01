from collections import defaultdict

log_file = "auth.log"

failed_attempts = defaultdict(int)

with open(log_file, "r") as file:
    for line in file:
        if "Failed password" in line:
            parts = line.split()
            ip = parts[-3]
            failed_attempts[ip] += 1

print("\n--- Suspicious Activity Report ---\n")

for ip, count in failed_attempts.items():
    if count >= 3:
        print(f"[ALERT] Possible brute force from {ip} - {count} failed attempts")
    else:
        print(f"{ip} - {count} failed attempts")
