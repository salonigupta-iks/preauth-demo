from functions.table_files import PAYERS
from functions.schema import ResponseModel
from functions.table_files import pre_auth_req_data
from functions.prompts import PAYER_NAME_TO_ID
from functions.config import PLANNER_BACKEND_URL
import httpx

# ---------- PLACEHOLDER FUNCTION ----------
def pre_authorization_workflow(patient_id: str, payer: str):
    # TODO: Replace this with calling the
    # print(f"jsoonn : {pre_auth_req_data}")    
    return pre_auth_req_data


def get_patient_details(patient_id: str, request_id: str) -> dict | None:
    """
    Returns standardized patient data for any patient ID.
    This function now returns a fixed JSON structure as specified.
    """
    # Return the standardized patient data structure
    standardized_patient_data = {
        "firstName": "Anurag",
        "lastName": "Sinha", 
        "dateOfBirth": "01/07/2001",
        "memberId": "12345",
        "groupNumber": "12",
        "phoneNumber": "9991123322",
        "email": "abc@def.com",
        "serviceType": "MRI",
        "cptCode": "72148",
        "diagnosis": "Persistent pain",
        "clinicalJustification": "Required to rule out",
        "urgency": "Routine",
        "requestedDate": "01/01/2025",
        "documents": [
            "/app/tmp/test_document.txt"
        ]
    }
    
    return standardized_patient_data


def get_payer_details_api(payer_id: str, request_id: str) -> dict:
    """
    Calls the /tools/check-payer API on the remote server (port 8001).
    Fetches payer details if onboarded.
    """
    url = f"{PLANNER_BACKEND_URL}/api/tools/check-payer/{payer_id}"
    params = {"request_id": request_id}

    try:
        with httpx.Client() as client:
            response = client.get(url, params=params, timeout=20.0)
            response.raise_for_status()
            payer_response = response.json()
    except Exception as e:
        return {"error": f"Failed to fetch payer details: {str(e)}"}

    return payer_response


def trigger_n8n(patient_id: str, payer: str, user_id: str, request_id:str) -> dict:
    """
    Calls pre_authorization_workflow(), enriches with payer details,
    then calls the /tools/trigger-n8n API (running on 8001) to trigger N8N.
    """
    # Step 1: Call workflow API
    # workflow_data = pre_authorization_workflow(patient_id, payer)
    workflow_data = get_patient_details(patient_id, request_id)
    print(f"patient data is : {workflow_data}")

    #step to get payer id frompayer name
    payer_id = get_payer_id_by_name(payer)
    print(f"payer id : {payer_id}")

    # Step 3: Fetch payer details
    # payer_details = get_payer_details(payer) 
    payer_details = get_payer_details_api(payer_id, request_id)
    print(f"payer details are : {payer_details}")

    # Step 3: Prepare payload for /tools/trigger-n8n
    n8n_payload = {
        "request_id": request_id,
        "user_id": user_id,  # <-- replace with actual user if available
        "patient_id": patient_id,
        "patient_name": "unknown name",
        "payer_id": payer_id,
        "prompt": "Pre-authorization request",  # or pass actual prompt
        "validated_json": workflow_data
    }
    # print(f"n8n payload is : {n8n_payload}")
    # Step 4: Call the APIs service at port 8001
    try:
        with httpx.Client() as client:
            response = client.post(
                f"{PLANNER_BACKEND_URL}/api/tools/trigger-n8n",
                json=n8n_payload,
                timeout=30.0
            )
            response.raise_for_status()
            n8n_response = response.json()
    except Exception as e:
        n8n_response = {"error": f"Failed to trigger N8N API: {str(e)}"}

    # Step 5: Combine and return enriched response
    enriched_response = {
        "n8n_response": n8n_response,
        "payer_details": payer_details,
        "workflow_data": workflow_data
    }
    return enriched_response


def handle_pre_authorization(Intent: str, patient_id: str, payer: str, user_id:str, request_id:str) -> ResponseModel:
    """Handles the pre-authorization intent logic and returns a ResponseModel with custom messages."""

    # Case 1: Both details missing
    if not patient_id and not payer:
        return ResponseModel(
            status="incomplete",
            message="Please provide patient_id and a valid payer name to proceed with pre-authorization.",
            Intent=Intent,
            patient_id=patient_id,
            payer=payer
        )

    # Case 2: Only patient_id missing
    if not patient_id:
        return ResponseModel(
            status="incomplete",
            message="Please provide patient_id to proceed with pre-authorization.",
            Intent=Intent,
            patient_id=patient_id,
            payer=payer
        )

    # Case 3: Only payer missing
    if not payer:
        return ResponseModel(
            status="incomplete",
            message="Please provide a valid payer name to proceed with pre-authorization.",
            Intent=Intent,
            patient_id=patient_id,
            payer=payer
        )

    # Case 4: All details present
    workflow_data = trigger_n8n(patient_id, payer, user_id, request_id)
    return ResponseModel(
        status="success",
        message="Thank you for the details, pre-authorization successfully proceeded.",
        Intent=Intent,
        patient_id=patient_id,
        payer=payer,
        data=workflow_data
    )


def start_request(user_id: str, prompt: str) -> dict:
    print(f"inside start req------------")
    """
    Calls the /api/tools/start-request API (running on port 8001).
    Starts a new request for the given user and prompt.
    """
    url = f"{PLANNER_BACKEND_URL}/api/tools/start-request"
    payload = {
        "user_id": user_id,
        "prompt": prompt
    }

    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, timeout=20.0)
            response.raise_for_status()
            api_response  = response.json()
    except Exception as e:
        return {f"Failed to call start-request API: {str(e)}"}
        # Ensure status is CREATED

    if api_response.get("status") == "CREATED":
        return api_response["request_id"]
    else:
        raise RuntimeError(
            f"Request creation failed. Status: {api_response.get('status')}, "
            f"Message: {api_response.get('message')}"
        )


def get_payer_id_by_name(payer_name: str) -> str | None:
    """
    Returns the payer_id corresponding to the given payer_name.
    Case-insensitive match. Returns None if not found.
    """
    for name, pid in PAYER_NAME_TO_ID.items():
        if name.lower() == payer_name.lower():
            return pid
    return None