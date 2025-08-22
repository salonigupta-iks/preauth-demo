
# Payers table
PAYERS = [
    {
        "payer_id": 1,
        "payer_name": "cohere",
        "payer_url": "https://portal.cohere.com", 
        "payer_credentials" : {"userid":"abc", "password": "123"}
    },
    {
        "payer_id": 2,
        "payer_name": "humana",
        "payer_url": "https://www.humana.com",
        "payer_credentials" : {"userid":"efg", "password": "456"}
    }
]


pre_auth_req_data = {
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