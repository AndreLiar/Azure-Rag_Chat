import os
import logging
from typing import Optional
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient
from azure.core.exceptions import ResourceNotFoundError

logger = logging.getLogger(__name__)


class Config:
    """Configuration management for both local development and Azure deployment."""

    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.key_vault_url = os.getenv("AZURE_KEY_VAULT_URL")
        self.client_id = os.getenv("AZURE_CLIENT_ID")
        self.secret_client: Optional[SecretClient] = None

        # Initialize Key Vault client if in production and Key Vault URL is provided
        if self.environment == "production" and self.key_vault_url:
            self._init_key_vault_client()

    def _init_key_vault_client(self):
        """Initialize Azure Key Vault client with appropriate credentials."""
        try:
            if self.client_id:
                # Use Managed Identity with specific client ID
                credential = ManagedIdentityCredential(client_id=self.client_id)
                logger.info(f"Using Managed Identity with client ID: {self.client_id}")
            else:
                # Use default credential chain
                credential = DefaultAzureCredential()
                logger.info("Using Default Azure Credential")

            self.secret_client = SecretClient(
                vault_url=self.key_vault_url, credential=credential
            )
            logger.info(f"Key Vault client initialized for: {self.key_vault_url}")
        except Exception as e:
            logger.error(f"Failed to initialize Key Vault client: {e}")
            self.secret_client = None

    def get_secret(
        self, secret_name: str, fallback_env_var: Optional[str] = None
    ) -> Optional[str]:
        """
        Get secret from Key Vault (production) or environment variable (development).

        Args:
            secret_name: The name of the secret in Key Vault
            fallback_env_var: Environment variable name to use as fallback

        Returns:
            The secret value or None if not found
        """
        # Try Key Vault first if available
        if self.secret_client:
            try:
                secret = self.secret_client.get_secret(secret_name)
                logger.debug(f"Retrieved secret '{secret_name}' from Key Vault")
                return secret.value
            except ResourceNotFoundError:
                logger.warning(f"Secret '{secret_name}' not found in Key Vault")
            except Exception as e:
                logger.error(
                    f"Error retrieving secret '{secret_name}' from Key Vault: {e}"
                )

        # Fallback to environment variable
        env_var_name = fallback_env_var or secret_name.upper().replace("-", "_")
        value = os.getenv(env_var_name)
        if value:
            logger.debug(
                f"Retrieved '{secret_name}' from environment variable '{env_var_name}'"
            )
        else:
            logger.warning(
                f"Secret '{secret_name}' not found in environment variable '{env_var_name}'"
            )

        return value

    # Configuration properties
    @property
    def database_url(self) -> Optional[str]:
        return self.get_secret("database-url", "DATABASE_URL")

    @property
    def openai_api_key(self) -> Optional[str]:
        return self.get_secret("openai-api-key", "OPENAI_API_KEY")

    @property
    def azure_search_key(self) -> Optional[str]:
        return self.get_secret("azure-search-key", "AZURE_SEARCH_KEY")

    @property
    def azure_storage_key(self) -> Optional[str]:
        return self.get_secret("azure-storage-key", "AZURE_STORAGE_KEY")

    @property
    def secret_key(self) -> Optional[str]:
        return self.get_secret("secret-key", "SECRET_KEY")

    @property
    def azure_search_endpoint(self) -> Optional[str]:
        return os.getenv("AZURE_SEARCH_ENDPOINT")

    @property
    def azure_storage_account_name(self) -> Optional[str]:
        return os.getenv("AZURE_STORAGE_ACCOUNT_NAME")

    @property
    def log_level(self) -> str:
        return os.getenv("LOG_LEVEL", "INFO")


# Global configuration instance
config = Config()
