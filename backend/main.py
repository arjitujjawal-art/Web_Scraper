import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from copilot import SignalCopilot

# Initialize FastAPI App
app = FastAPI(
    title="Signal Atlas — Chatbot Service",
    description="Backend API wrapper for the RAG-based Signal Copilot AI assistant.",
    version="1.0.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
# This is crucial so your teammates' frontend web code can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins during local hackathon dev
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Initialize the Copilot Engine
copilot = SignalCopilot()

# Pydantic schemas for request/response validation
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    map_action: dict | None
    retrieved_context: list[str]

# API Routes
@app.get("/api/health")
def health_check():
    """Simple heartbeat endpoint to verify the API is online."""
    return {
        "status": "online",
        "service": "Signal Atlas Chatbot API",
        "model_configured": copilot.model,
        "api_key_status": "present" if copilot.api_key else "missing (offline fallback active)"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main endpoint for chatbot interactions.
    Receives user query, runs RAG retrieval + LLM synthesis,
    and returns answer along with any map control actions.
    """
    try:
        result = copilot.process_chat(request.message)
        return {
            "answer": result["answer"],
            "map_action": result.get("map_action"),
            "retrieved_context": result.get("retrieved_context", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot processing error: {str(e)}")

# Local execution entrypoint
if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    print("[+] Starting Signal Atlas Chatbot API on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
