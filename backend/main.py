from fastapi import FastAPI, HTTPException, Depends
import uvicorn
from database import get_db
from models import UserCredentials
from supabase import Client
from ai_agent import get_ai_response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Interviewer API")

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
    
@app.get("/ask")
def ask_ai(question: str):
    answer = get_ai_response(question)

    return {
        "your_question": question, 
        "ai_answer": answer
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, we restrict this to your extension's ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)