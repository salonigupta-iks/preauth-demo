#!/bin/bash

# Insert payer data into MongoDB
docker exec -i unified-mongo mongosh unified_db --eval '
db.payers.insertMany([
  {
    "_id": ObjectId("68a2fb2218b445867b89b040"),
    "id": "payer_001",
    "name": "BlueCross BlueShield",
    "url": "https://provider.bcbs.com/preauth",
    "serviceAccName": "bcbs_service_account",
    "payerStatus": "active",
    "createdBy": "system",
    "createdAt": new Date("2025-08-18T10:06:26.246Z"),
    "lastUpdatedBy": "system",
    "lastUpdatedAt": new Date("2025-08-18T10:06:26.246Z")
  },
  {
    "_id": ObjectId("68a2fb2218b445867b89b041"),
    "id": "payer_002",
    "name": "Aetna",
    "url": "https://www.aetna.com/preauth",
    "serviceAccName": "aetna_service_account",
    "payerStatus": "active",
    "createdBy": "system",
    "createdAt": new Date("2025-08-18T10:06:26.246Z"),
    "lastUpdatedBy": "system",
    "lastUpdatedAt": new Date("2025-08-18T10:06:26.246Z")
  },
  {
    "_id": ObjectId("68a2fb2218b445867b89b042"),
    "id": "payer_003",
    "name": "Cigna",
    "url": "https://www.cigna.com/preauth",
    "serviceAccName": "cigna_service_account",
    "payerStatus": "active",
    "createdBy": "system",
    "createdAt": new Date("2025-08-18T10:06:26.246Z"),
    "lastUpdatedBy": "system",
    "lastUpdatedAt": new Date("2025-08-18T10:06:26.246Z")
  },
  {
    "_id": ObjectId("68a2fb2218b445867b89b043"),
    "id": "payer_004",
    "name": "UnitedHealthcare",
    "url": "https://www.uhc.com/preauth",
    "serviceAccName": "uhc_service_account",
    "payerStatus": "active",
    "createdBy": "system",
    "createdAt": new Date("2025-08-18T10:06:26.246Z"),
    "lastUpdatedBy": "system",
    "lastUpdatedAt": new Date("2025-08-18T10:06:26.246Z")
  }
]);

print("Payer data inserted successfully!");
'
