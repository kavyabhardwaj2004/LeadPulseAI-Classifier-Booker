# MVP Stub - Replace with real webhook in production
def notify_slack(message: str, tenant_id: str = ""):
    print(f"SLACK_ALERT [{tenant_id}]: {message}")
    # Production: import requests; requests.post(SLACK_WEBHOOK_URL, json={"text": message})
