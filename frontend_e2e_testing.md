# Frontend End-to-End Testing Guide

## 🧪 Complete System Testing Strategy

### Phase 1: Frontend Accessibility Test
1. **Frontend Landing Page**
   - URL: http://localhost:3000
   - Expected: React/Next.js application loads
   - Check: No console errors, UI renders correctly

### Phase 2: Frontend API Integration Test
2. **Internal API Route**
   - URL: http://localhost:3000/api/chat/detect-intent
   - Method: POST
   - Body: {"message": "I need pre-authorization for MRI scan"}
   - Expected: JSON response with intent detection

### Phase 3: Backend Services Chain Test
3. **Planner Agent Direct**
   - URL: http://localhost:8002/detect_intent
   - Method: POST
   - Body: {"query": "I need pre-authorization", "user_id": "test-123"}
   - Expected: Intent detection response

4. **Planner Backend Direct**
   - URL: http://localhost:8001/
   - Method: GET
   - Expected: API system information

### Phase 4: Database Connectivity Test
5. **MongoDB Data Verification**
   - Check: Payer data exists in unified_db
   - Expected: 4 insurance providers (BCBS, Aetna, Cigna, UHC)

### Phase 5: External Services Test
6. **N8N Workflow Engine**
   - URL: http://localhost:5678
   - Expected: N8N interface loads

7. **Mongo Express Admin**
   - URL: http://localhost:8081
   - Auth: admin/admin123
   - Expected: Database management interface

## 🚀 Testing Commands

Run these tests in sequence to verify the entire system:
