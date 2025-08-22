import hashlib
import os
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
from azure.keyvault.secrets import SecretClient
from azure.identity import ClientSecretCredential
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class AzureKeyVaultService:
    def __init__(self):
        self.client_id = os.getenv("AZURE_CLIENT_ID")
        self.client_secret = os.getenv("AZURE_CLIENT_SECRET")
        self.tenant_id = os.getenv("AZURE_TENANT_ID")
        
        # Create credential once
        self.credential = ClientSecretCredential(
            tenant_id=self.tenant_id,
            client_id=self.client_id,
            client_secret=self.client_secret
        )
        
        # Store clients for different organizations
        self._clients = {}
        self._executor = ThreadPoolExecutor(max_workers=4)
    
    def _get_key_vault_url(self, organization_name: str) -> str:
        """Generate Key Vault URL based on organization name"""
        # Convert organization name to lowercase and replace special characters
        org_name = organization_name.lower().replace('_', '-').replace(' ', '-')
        # Remove any characters that aren't alphanumeric or hyphens
        org_name = ''.join(c for c in org_name if c.isalnum() or c == '-')
        return f"https://{org_name}.vault.azure.net/"
    
    def _get_client(self, organization_name: str) -> SecretClient:
        """Get or create a Key Vault client for the specified organization"""
        if organization_name not in self._clients:
            key_vault_url = self._get_key_vault_url(organization_name)
            self._clients[organization_name] = SecretClient(
                vault_url=key_vault_url,
                credential=self.credential
            )
        return self._clients[organization_name]
    
    def _generate_key(self, login_url: str, username: str) -> str:
        """Generate SHA256 hash key from login_url + username"""
        combined = f"{login_url}{username}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    def _sanitize_secret_name(self, name: str) -> str:
        """Sanitize secret name to be compatible with Azure Key Vault naming rules"""
        # Azure Key Vault secret names can only contain alphanumeric characters and hyphens
        # and must be 1-127 characters long
        sanitized = ''.join(c if c.isalnum() else '-' for c in name)
        # Remove consecutive hyphens
        while '--' in sanitized:
            sanitized = sanitized.replace('--', '-')
        # Remove leading/trailing hyphens
        sanitized = sanitized.strip('-')
        # Ensure it's not empty and not too long
        if not sanitized:
            sanitized = 'secret'
        if len(sanitized) > 127:
            sanitized = sanitized[:127].rstrip('-')
        return sanitized
    
    def _save_password_sync(self, organization_name: str, login_url: str, username: str, password: str) -> bool:
        """Synchronous password save operation"""
        try:
            # Get the client for this organization
            client = self._get_client(organization_name)
            
            key = self._generate_key(login_url, username)
            secret_name = self._sanitize_secret_name(key)
            
            # Store the password with metadata
            secret_value = {
                "password": password,
                "login_url": login_url,
                "username": username,
                "organization_name": organization_name
            }
            
            # Convert to string for storage
            secret_json = json.dumps(secret_value)
            
            # Set secret with content type as password
            client.set_secret(secret_name, secret_json, content_type="Password")
            return True
        except Exception as e:
            print(f"Error saving password: {str(e)}")
            return False

    async def save_password(self, organization_name: str, login_url: str, username: str, password: str) -> bool:
        """Save password to Azure Key Vault"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            self._save_password_sync,
            organization_name,
            login_url,
            username,
            password
        )
    
    def _get_password_sync(self, organization_name: str, login_url: str, username: str) -> Optional[str]:
        """Synchronous password retrieval operation"""
        try:
            # Get the client for this organization
            client = self._get_client(organization_name)
            
            key = self._generate_key(login_url, username)
            secret_name = self._sanitize_secret_name(key)
            
            secret = client.get_secret(secret_name)
            
            # Parse the JSON value
            secret_data = json.loads(secret.value)
            
            return secret_data.get("password")
        except Exception as e:
            print(f"Error retrieving password: {str(e)}")
            return None

    async def get_password(self, organization_name: str, login_url: str, username: str) -> Optional[str]:
        """Retrieve password from Azure Key Vault"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            self._get_password_sync,
            organization_name,
            login_url,
            username
        )
