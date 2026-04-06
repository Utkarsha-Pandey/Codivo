import os
import sys
import tempfile
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

load_dotenv(BACKEND_DIR / ".env")

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
import uvicorn
from database import get_db
from models import UserCredentials, ProblemContext
from supabase import Client
from fastapi.middleware.cors import CORSMiddleware
from backend.agents.workflow import interview_app
from langchain_core.messages import HumanMessage
from groq import Groq

app = FastAPI(title="AI Interviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW: Initialize the Groq client ---
# It will automatically pick up GROQ_API_KEY from your .env file
groq_client = Groq()
# ---------------------------------------

# --- Temporary in-memory database for session state ---
sessions_db = {}
# -----------------------------------------------------------

@app.get("/")
def read_root():
    return {"message": "Server is running"}

@app.post("/signup")
def create_user(user: UserCredentials, db: Client = Depends(get_db)):
    try:
        response = db.auth.sign_up({
            "email": user.email,
            "password": user.password
        })
        return {"message": "User created successfully!", "user_id": response.user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
def login_user(user: UserCredentials, db: Client = Depends(get_db)):
    try:
        response = db.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        return {
            "message": "Login successful!", 
            "access_token": response.session.access_token
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")

@app.post("/start-interview")
async def start_interview(problem: ProblemContext):
    """
    Receives the scraped problem data from the Chrome extension, 
    initializes the LangGraph state, and gets the first response.
    """
    # For now, we use a hardcoded session ID. 
    session_id = "test_session_123"
    
    hidden_prompt = f"""
    I am the candidate. Let's start the interview for the following problem:
    
    Title: {problem.title}
    Description: {problem.description}
    Examples: {problem.examples}
    Constraints: {problem.constraints}
    
    Please act as the interviewer, introduce this problem to me briefly, and ask if I have any clarifying questions before I begin coding.
    """
    
    initial_state = {
        "messages": [HumanMessage(content=hidden_prompt)],
        "current_stage": "problem_intro",
        "candidate_code": ""
    }
    
    # Run the graph
    try:
        result = interview_app.invoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {str(e)}")
    
    # Save the generated state to our in-memory DB
    sessions_db[session_id] = {
        "messages": result["messages"],
        "current_stage": result["current_stage"],
        "candidate_code": result.get("candidate_code", "")
    }
    
    # Extract the AI's response
    ai_response = result["messages"][-1].content
    
    return {"ai_answer": ai_response, "stage": result["current_stage"]} 

@app.post("/chat")
async def chat_endpoint(user_message: str, session_id: str = "test_session_123"):
    
    # Retrieve the existing conversation history
    if session_id not in sessions_db:
         raise HTTPException(status_code=400, detail="Session not found. Please click 'Scan Problem & Start' first.")
    
    current_state = sessions_db[session_id]
    
    # Append the user's new message to the history
    current_state["messages"].append(HumanMessage(content=user_message))
    
    # Run the graph with the FULL history
    try:
        result = interview_app.invoke(current_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat workflow failed: {str(e)}")
    
    # Update the database with the AI's new response
    sessions_db[session_id] = {
        "messages": result["messages"],
        "current_stage": result["current_stage"],
        "candidate_code": result.get("candidate_code", "")
    }
    
    # Extract the AI's response
    ai_response = result["messages"][-1].content
    
    return {"response": ai_response, "stage": result["current_stage"]}

# ---  Audio Transcription Endpoint ---
@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Receives a raw audio blob from the frontend, 
    saves it temporarily, and sends it to Groq Whisper for transcription.
    """
    try:
        # Create a temporary file to hold the audio blob
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(await file.read())
            temp_filepath = temp_audio.name

        # Send to Groq Whisper
        with open(temp_filepath, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=(temp_filepath, audio_file.read()),
                model="whisper-large-v3",
                response_format="json",
            )
            
        # Clean up the temp file
        os.remove(temp_filepath)
        
        # Return the clean text
        return {"text": transcription.text}

    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")
# -----------------------------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)