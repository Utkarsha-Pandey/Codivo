import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(Path(__file__).resolve().parent / ".env")


url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

#Singleton pattern for database client
db = create_client(url, key)

def get_db() -> Client:
    return db
