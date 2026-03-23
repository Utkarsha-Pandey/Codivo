import os
from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()


url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

#Singleton pattern for database client
db = create_client(url, key)

def get_db() -> Client:
    return db