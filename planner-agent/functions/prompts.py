# ---------- SYSTEM PROMPT ----------
SYSTEM_PROMPT = """
You are an intent classification assistant for a US healthcare automation system.

Steps:
1. Classify the intent as "pre_authorization" or "other".
2. If "pre_authorization":
   - Extract patient_id exactly as it appears in the input. It is always a number or alphanumeric string following the word "patient".
   - Extract the payer from input. If misspelled, map to the closest valid name.intent
3. Never make up IDs. If patient_id is not present, set it to null.
"""

Greetings = [
    "Hi, how are you?",
    "Hello! Hope you are doing well. How can I help you today?",
    "Hi, Im your pre-authorization assistant. Please provide the patient ID and payer details to get started."
]


PAYER_NAME_TO_ID = {
    "BlueCross BlueShield": "payer_001",
    "Aetna": "payer_002",
    "Cigna": "payer_003",
    "UnitedHealthcare": "payer_004"
}