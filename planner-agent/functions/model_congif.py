from google import genai
from openai import OpenAI
from google.genai import types
from functions.prompts import SYSTEM_PROMPT
from functions.config import GEMINI_API_KEY, openai_key
from functions.schema import OutputSchemaPurpose, PurposeClass

client = genai.Client(api_key=GEMINI_API_KEY)
openclient = OpenAI(api_key=openai_key)

# ---------- LLM FUNCTIONS ----------
def detect_intent_gemini(user_query: str) -> OutputSchemaPurpose:
    """Classify intent using Gemini."""
    model='gemini-2.0-flash-001'
    response = client.models.generate_content(
        model='gemini-2.0-flash-001',
        contents=user_query,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type='application/json',
            response_schema=list[PurposeClass],
        ),
    )
    print(f"model used is : {model}")
    return response.parsed[0].items[0]  # OutputSchemaPurpose instance


def detect_intent_openai(user_query: str) -> OutputSchemaPurpose:
    """Classify intent using OpenAI."""
    model="gpt-4.1-mini"
    response = openclient.responses.parse(
        model=model,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_query},
        ],
        text_format=OutputSchemaPurpose,
    )
    print(f"model used is : {model}")
    return response.output_parsed  
