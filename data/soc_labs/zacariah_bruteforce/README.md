# 🔐 Log Analysis & Brute Force Detection Lab

## 📌 Project Overview
This project simulates a Security Operations Center (SOC) scenario where brute force login attempts are detected through log analysis using Python.

The goal is to identify suspicious authentication behavior and flag potential attack sources based on repeated failed login attempts.

---

## 🛠️ Tools & Technologies
- Kali Linux
- Python 3
- VirtualBox
- Linux Authentication Logs (`auth.log`)

---

## 🔍 Scenario
A simulated SSH brute force attack was performed, generating multiple failed login attempts from a single IP address.

These events were recorded in the `auth.log` file and analyzed using a custom Python script.

---

## ⚙️ Detection Logic
The script performs the following:

- Reads and parses `auth.log`
- Detects lines containing "Failed password"
- Extracts IP addresses from log entries
- Counts failed attempts per IP
- Flags any IP with 3 or more failed attempts

---

## 🚨 Detection Output
Example alert generated:

---

```
[ALERT] Possible brute force from 192.168.1.10 - 5 failed attempts
```

## 📁 Project Structure

---

## 🎯 Skills Demonstrated
- Log analysis and parsing
- Threat detection (brute force attacks)
- Python scripting for security automation
- SOC investigation workflow simulation

---

## 💡 Key Takeaways
- Identifying brute force patterns through logs
- Automating detection using Python
- Understanding authentication logs in Linux systems
- Building hands-on cybersecurity projects

---

## 🚀 Future Improvements
- Detect unusual login times
- Identify new IP addresses
- Add email alerts
- Integrate SIEM tools

---
## 📸 Detection Output (Results)

![Detection Output](detection-output.png)

## 💻 Python Detection Script

![Python Script](python-script.png)

This output demonstrates detection of suspicious IP activity based on repeated failed SSH login attempts, indicating a potential brute force attack.

## 👨‍💻 Author
**Tinashe Zacariah Nyandoro**  
Aspiring SOC Analyst | Cybersecurity Enthusiast
