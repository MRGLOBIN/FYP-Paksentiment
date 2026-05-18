import os
import datetime

PERF_LOG_PATH = "/Users/mrgoblin/workspace/uni/fyp/new_current/main-server/logs/smart-search-perf.log"

def log_perf(message: str):
    """Appends a timestamped log to the centralized perf log file."""
    try:
        # Ensure directory exists (though the NestJS/Go side should have created it)
        os.makedirs(os.path.dirname(PERF_LOG_PATH), exist_ok=True)
        
        timestamp = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        log_entry = f"[{timestamp}] {message}\n"
        
        with open(PERF_LOG_PATH, "a") as f:
            f.write(log_entry)
    except Exception as e:
        print(f"Failed to write perf log: {e}")
