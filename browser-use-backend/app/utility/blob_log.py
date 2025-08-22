import os
import json
from azure.storage.blob import BlobServiceClient
from browser_use.agent.service import Agent

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")

def get_blob_client(container_name: str, blob_name: str):
    blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    container_client = blob_service_client.get_container_client(container_name)
    return container_client.get_blob_client(blob_name)

def save_agent_history_to_blob(agent: Agent, session_id: str):
    blob_name = f"{session_id}.json"
    container_name = os.getenv('BLOB_CONTAINER_NAME', 'agent-states')

    blob_client = get_blob_client(container_name, blob_name)

    try:
        existing_blob = blob_client.download_blob()
        existing_data = json.loads(existing_blob.readall())
    except Exception:
        existing_data = []  # Start fresh if blob doesn't exist

    # ✅ Save entire agent state as a dict (deeply serializes everything inside)
    new_data = agent.state.model_dump()

    # Append the new snapshot
    existing_data.append(new_data)

    blob_client.upload_blob(
        json.dumps(existing_data, indent=2),
        overwrite=True,
        content_type="application/json"
    )

    print(f"✅ Agent state saved to blob: {blob_name}")

def load_agent_history_from_blob(session_id: str) -> list[dict]:
    blob_name = f"{session_id}.json"
    container_name = os.getenv('BLOB_CONTAINER_NAME', 'agent-states')

    blob_client = get_blob_client(container_name, blob_name)

    try:
        existing_blob = blob_client.download_blob()
        content = existing_blob.readall()
        return json.loads(content)
    except Exception:
        print(f"⚠️ No previous history found for session {session_id}")
        return []
