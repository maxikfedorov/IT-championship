from datetime import datetime

def log(message: str, module: str = "main", level: str = "INFO"):
    dt = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{dt}] [{level}] [{module}] {message}")
