import os
import numpy  as np
from google import genai
from openai import OpenAI
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from google.genai import types
from functions.prompts import Greetings
from functions.schema import UserInput, ResponseModel, Message, UserMessage
from functions.config import GEMINI_API_KEY, openai_key
from functions.model_congif import detect_intent_openai, detect_intent_gemini
from functions.helpers import pre_authorization_workflow, handle_pre_authorization, start_request
from functions.sse_manager import ConnectionManager
import asyncio
import json

client = genai.Client(api_key=GEMINI_API_KEY)
openclient = OpenAI(api_key=openai_key)

#now i want to add memory to this planner

# ---------- FASTAPI APP ----------
app = FastAPI()

# Add CORS middleware to allow frontend on port 3000 to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://host.docker.internal:3000"],  # Your frontend URL | allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SSE connection manager
manager = ConnectionManager()

@app.post("/detect_intent", response_model=ResponseModel)
async def detect_intent(user_input: UserInput):
    #start a request
    request_id = start_request(user_input.user_id, user_input.query)
    print(f"req id is: {request_id}")
    parsed = detect_intent_openai((user_input.query))
    # print(f"llm output is : {parsed}")
    # parsed = detect_intent_gemini((user_input.query))
    Intent, patient_id, payer = parsed.Intent, parsed.patient_id, parsed.payer

    # Logic flow
    if Intent == "other":
        return ResponseModel(
            status="error",
            message="User intent is not related to pre-authorization.",
            Intent=Intent
        )
    elif Intent == "greetings":
        return ResponseModel(
            status="error",
            message=np.random.choice(Greetings),
            Intent=Intent
        )
    elif Intent == "pre_authorization":
        return handle_pre_authorization(Intent, patient_id, payer, user_input.user_id, request_id)
    

# ---------- SSE ENDPOINTS ----------
@app.get("/")
async def root():
    """Root endpoint to verify server is running"""
    return {
        "message": "Planner SSE Server is running",
        "endpoints": ["/detect_intent", "/sse", "/events", "/send-message", "/send-user-message"],
        "active_connections": len(manager.active_connections)
    }


@app.get("/sse")
async def stream_events(request: Request):
    """SSE endpoint where all frontends listen for events"""
    async def event_stream():
        queue = await manager.connect()
        try:
            while True:
                # Check if client is still connected
                if await request.is_disconnected():
                    break
                
                try:
                    # Wait for a message - no timeout needed since EventSource handles reconnection
                    message = await queue.get()
                    yield message  # Message already contains proper SSE format
                except Exception as e:
                    break
        except Exception as e:
            pass
        finally:
            manager.disconnect(queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )


@app.get("/events")
async def stream_events_legacy(request: Request):
    """Legacy SSE endpoint for backward compatibility"""
    async def event_stream():
        queue = await manager.connect()
        try:
            while True:
                # Check if client is still connected
                if await request.is_disconnected():
                    break
                
                try:
                    # Wait for a message - no timeout needed since EventSource handles reconnection
                    message = await queue.get()
                    yield message  # Message already contains proper SSE format
                except Exception as e:
                    break
        except Exception as e:
            pass
        finally:
            manager.disconnect(queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )


@app.post("/send-user-message")
async def send_user_message(user_message: UserMessage):
    """Endpoint to send a message to a specific user via their user_id"""
    # Validate user_id format (16 digits)
    try:
        user_message.validate_user_id()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    message_data = {
        "message": user_message.message,
        "type": user_message.type,
        "user_id": user_message.user_id,
        "timestamp": asyncio.get_event_loop().time()
    }
    
    # Send event with user_id as event name (user-specific message)
    await manager.send_event(user_message.user_id, message_data)
    
    return {
        "status": "success", 
        "message": f"Message sent to user {user_message.user_id}",
        "user_id": user_message.user_id,
        "event_name": user_message.user_id,
        "active_connections": len(manager.active_connections)
    }


@app.post("/send-message")
async def send_message(message: Message):
    """Endpoint to send a global message to all connected SSE clients"""
    message_data = {
        "message": message.message,
        "type": message.type,
        "timestamp": asyncio.get_event_loop().time()
    }
    
    # Send as global message (no event name - all users receive this)
    await manager.broadcast(message_data)
    
    return {
        "status": "success", 
        "message": "Global message sent to all connected clients",
        "active_connections": len(manager.active_connections)
    }


# ---------- MAIN EXECUTION ----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8002, 
        log_level="info"
    )