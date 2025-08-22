from dotenv import load_dotenv
load_dotenv()
import os


# ---------- GEMINI SETUP ----------
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
openai_key = os.getenv("OPEN_AI_KEY")

# ---------- BACKEND URLS ----------
PLANNER_BACKEND_URL = os.getenv("PLANNER_BACKEND_URL", "http://127.0.0.1:8001")