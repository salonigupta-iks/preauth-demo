from dotenv import load_dotenv
load_dotenv()
import os


# ---------- GEMINI SETUP ----------
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
openai_key = os.getenv("OPEN_AI_KEY")