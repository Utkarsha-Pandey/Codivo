import os
from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()


url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

def get_db() -> Client:
    return create_client(url, key)