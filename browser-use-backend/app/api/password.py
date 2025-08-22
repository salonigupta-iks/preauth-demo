from fastapi import APIRouter, HTTPException
from app.models.models import PasswordRetrieveRequest, PasswordSaveRequest, PasswordResponse, SaveResponse
from app.services.azure_service import AzureKeyVaultService


router = APIRouter()
azure_service = AzureKeyVaultService()


@router.post("/retrieve-password", response_model=PasswordResponse)
async def retrieve_password(request: PasswordRetrieveRequest):
    """
    Retrieve password from Azure Key Vault based on organization name, login URL, and username.
    The key is generated using SHA256 hash of login_url + username.
    """
    try:
        password = await azure_service.get_password(
            organization_name=request.organization_name,
            login_url=request.login_url,
            username=request.username
        )
        
        if password:
            return PasswordResponse(
                success=True,
                password=password,
                message="Password retrieved successfully"
            )
        else:
            return PasswordResponse(
                success=False,
                password=None,
                message="Password not found for the given credentials"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving password: {str(e)}"
        )


@router.post("/save-password", response_model=SaveResponse)
async def save_password(request: PasswordSaveRequest):
    """
    Save password to Azure Key Vault with organization name, login URL, username, and password.
    The key is generated using SHA256 hash of login_url + username.
    """
    try:
        success = await azure_service.save_password(
            organization_name=request.organization_name,
            login_url=request.login_url,
            username=request.username,
            password=request.password
        )
        
        if success:
            return SaveResponse(
                success=True,
                message="Password saved successfully"
            )
        else:
            return SaveResponse(
                success=False,
                message="Failed to save password"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error saving password: {str(e)}"
        )
