import os
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

load_dotenv(BACKEND_DIR / ".env")

from fastapi import FastAPI, HTTPException, Depends
import uvicorn
from database import get_db
from models import UserCredentials
from supabase import Client
from fastapi.middleware.cors import CORSMiddleware
from models import UserCredentials, ProblemContext
from backend.agents.workflow import interview_app
from langchain_core.messages import HumanMessage

app = FastAPI(title="AI Interviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    # We construct a hidden initial message that contains the scraped problem details.
    # The agent will read this and respond by introducing the problem.
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
    
    # Extract the AI's response
    ai_response = result["messages"][-1].content
    
    # Notice we are returning "ai_answer" to match what your api.js expects: return data.ai_answer;
    return {"ai_answer": ai_response, "stage": result["current_stage"]} 

@app.post("/chat")
async def chat_endpoint(user_message: str, session_id: str):
    # You would typically fetch the existing state/messages from your PostgreSQL DB here
    
    initial_state = {
        "messages": [HumanMessage(content=user_message)],
        "current_stage": "problem_intro", # Default or fetched from DB
        "candidate_code": ""
    }
    
    # Run the graph
    try:
        result = interview_app.invoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat workflow failed: {str(e)}")
    
    # Extract the AI's response
    ai_response = result["messages"][-1].content
    
    # Save the updated state/messages back to your database here
    
    return {"response": ai_response, "stage": result["current_stage"]}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
