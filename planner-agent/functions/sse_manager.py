import asyncio
import json
from typing import List

# ---------- SSE CONNECTION MANAGER ----------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[asyncio.Queue] = []

    async def connect(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.active_connections.append(queue)
        return queue

    def disconnect(self, queue: asyncio.Queue):
        if queue in self.active_connections:
            self.active_connections.remove(queue)

    async def send_event(self, event_name: str, data: dict):
        """Send an event with a specific name to all connected clients (user-specific)"""
        if self.active_connections:
            # Format: event: user_id\ndata: {json_data}\n\n
            event_message = f"event: {event_name}\ndata: {json.dumps(data)}\n\n"
            for connection in self.active_connections.copy():
                try:
                    await connection.put(event_message)
                except:
                    # Remove broken connections
                    self.disconnect(connection)

    async def broadcast(self, data: dict):
        """Send a global message to all connections (no event name)"""
        if self.active_connections:
            # Format: data: {json_data}\n\n
            for connection in self.active_connections.copy():
                try:
                    await connection.put(f"data: {json.dumps(data)}\n\n")
                except:
                    # Remove broken connections
                    self.disconnect(connection)