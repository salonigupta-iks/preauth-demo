import os
import jwt
from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Setup OAuth
oauth = OAuth()
oauth.register(
    name='microsoft',
    client_id=os.getenv("AZURE_CLIENT_ID"),
    client_secret=os.getenv("AZURE_CLIENT_SECRET"),
    server_metadata_url=f'https://login.microsoftonline.com/{os.getenv("AZURE_TENANT_ID")}/v2.0/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'response_type': 'code'
    }
)

# 🔐 JWT secret
JWT_SECRET = os.getenv("SECRET_KEY", "super-secret-key")
JWT_ALGORITHM = "HS256"

@router.get("/login")
async def login(request: Request):
    """
    Redirect user to Microsoft login
    """
    # 👇 Force HTTPS redirect URI to match what's in Azure
    redirect_uri = "https://sessions.wissenworkflow.com/api/auth/callback"
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)



@router.get("/callback")
async def auth_callback(request: Request):
    """
    Handle Microsoft OAuth callback and issue JWT
    """
    try:
        token = await oauth.microsoft.authorize_access_token(request)
        user = await oauth.microsoft.parse_id_token(request, token)

        email = user.get("email") or user.get("preferred_username")
        if not email or not email.endswith("@wissen.com"):
            raise HTTPException(status_code=403, detail="Unauthorized domain")

        # Generate JWT token
        payload = {
            "email": email,
            "name": user.get("name"),
        }
        jwt_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        # Redirect to frontend with token
        frontend_url = f"https://sessions.wissenworkflow.com/dashboard?token={jwt_token}"
        return RedirectResponse(frontend_url)
    except Exception as e:
        print("OAuth error:", str(e))
        raise HTTPException(status_code=400, detail="Authentication failed")

@router.get("/me")
async def get_user_info(Authorization: str = Header(...)):
    """
    Return user info from JWT token
    """
    try:
        scheme, token = Authorization.split(" ")
        if scheme.lower() != "bearer":
            raise ValueError("Invalid token scheme")

        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"email": decoded.get("email"), "name": decoded.get("name")}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

