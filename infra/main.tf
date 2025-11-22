# ======================================================
# Resource Group
# ======================================================
resource "azurerm_resource_group" "rg" {
  name     = "${var.project_name}-rg"
  location = var.location
}

# ======================================================
# Locals
# ======================================================
locals {
  deploy_log_analytics = var.enable_observability || var.enable_container_apps
}

# ======================================================
# Storage Account
# ======================================================
resource "azurerm_storage_account" "sa" {
  name                     = "${var.project_name}sa"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "docs" {
  name                  = "docs"
  storage_account_id    = azurerm_storage_account.sa.id
  container_access_type = "private"
}

# ======================================================
# Azure AI Search (Free tier by default to minimize spend)
# ======================================================
resource "azurerm_search_service" "aisearch" {
  name                = "${var.project_name}-search"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  sku                 = var.ai_search_sku
  partition_count     = 1
  replica_count       = 1
}

# ======================================================
# Azure Database for PostgreSQL
# ======================================================
resource "azurerm_postgresql_flexible_server" "pg" {
  name                = "${var.project_name}-pg"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  version             = "16"  # Updated to version 16 for better pgvector support
  sku_name            = "B_Standard_B1ms" # Smallest burstable SKU for dev/test
  administrator_login    = var.postgres_admin_username
  administrator_password = var.postgres_admin_password
  storage_mb           = 32768
  # Removed zone specification - let Azure choose automatically
  
  # Enable high availability for production workloads (optional)
  # high_availability {
  #   mode = "ZoneRedundant"
  # }
}

resource "azurerm_postgresql_flexible_server_database" "db" {
  name      = "${var.project_name}db"
  server_id = azurerm_postgresql_flexible_server.pg.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Enable pgvector extension for vector search capabilities
resource "azurerm_postgresql_flexible_server_configuration" "pgvector" {
  name      = "shared_preload_libraries"
  server_id = azurerm_postgresql_flexible_server.pg.id
  value     = "vector"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name                = "AllowAllWindowsAzureIps"
  server_id           = azurerm_postgresql_flexible_server.pg.id
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}

# ======================================================
# Key Vault for Secrets Management
# ======================================================
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "kv" {
  name                        = "${var.project_name}-kv-${random_string.kv_suffix.result}"
  location                    = var.location
  resource_group_name         = azurerm_resource_group.rg.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false
  sku_name                    = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get",
    ]

    secret_permissions = [
      "Get",
      "Set",
      "List",
      "Delete",
      "Purge",
      "Recover"
    ]

    storage_permissions = [
      "Get",
    ]
  }
}

resource "random_string" "kv_suffix" {
  length  = 4
  special = false
  upper   = false
}

# Store secrets in Key Vault
resource "azurerm_key_vault_secret" "openai_api_key" {
  name         = "openai-api-key"
  value        = var.openai_api_key
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "azure_search_key" {
  name         = "azure-search-key"
  value        = azurerm_search_service.aisearch.primary_key
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "database_url" {
  name         = "database-url"
  value        = "postgresql+asyncpg://${azurerm_postgresql_flexible_server.pg.administrator_login}:${var.postgres_admin_password}@${azurerm_postgresql_flexible_server.pg.fqdn}:5432/${azurerm_postgresql_flexible_server_database.db.name}?sslmode=require"
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "azure_storage_key" {
  name         = "azure-storage-key"
  value        = azurerm_storage_account.sa.primary_access_key
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "secret_key" {
  name         = "secret-key"
  value        = var.secret_key
  key_vault_id = azurerm_key_vault.kv.id
}

# ======================================================
# Observability (Log Analytics + App Insights)
# ======================================================
resource "azurerm_log_analytics_workspace" "law" {
  count               = local.deploy_log_analytics ? 1 : 0
  name                = "${var.project_name}-law"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "appi" {
  count               = var.enable_observability ? 1 : 0
  name                = "${var.project_name}-appi"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.law[0].id
}

# ======================================================
# Container Apps Environment (for FastAPI + Next.js)
# ======================================================
resource "azurerm_container_app_environment" "cae" {
  count                      = var.enable_container_apps ? 1 : 0
  name                       = "${var.project_name}-cae"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law[0].id
}

# ======================================================
# Managed Identity for Container App to access Key Vault
# ======================================================
resource "azurerm_user_assigned_identity" "backend_identity" {
  count               = var.enable_container_apps ? 1 : 0
  location            = var.location
  name                = "${var.project_name}-backend-identity"
  resource_group_name = azurerm_resource_group.rg.name
}

# Grant Key Vault access to the Managed Identity
resource "azurerm_key_vault_access_policy" "backend_access" {
  count        = var.enable_container_apps ? 1 : 0
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.backend_identity[0].principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# ======================================================
# Container App (for FastAPI backend)
# ======================================================
resource "azurerm_container_app" "backend" {
  count                        = var.enable_container_apps ? 1 : 0
  name                         = "${var.project_name}-backend"
  container_app_environment_id = azurerm_container_app_environment.cae[0].id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.backend_identity[0].id]
  }

  template {
    container {
      name   = "backend"
      image  = var.backend_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "AZURE_STORAGE_ACCOUNT_NAME"
        value = azurerm_storage_account.sa.name
      }

      env {
        name  = "AZURE_SEARCH_ENDPOINT"
        value = "https://${azurerm_search_service.aisearch.name}.search.windows.net"
      }

      env {
        name        = "AZURE_SEARCH_KEY"
        secret_name = "azure-search-key"
      }

      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }

      env {
        name        = "AZURE_STORAGE_KEY"
        secret_name = "azure-storage-key"
      }

      env {
        name  = "ENVIRONMENT"
        value = "production"
      }

      env {
        name  = "LOG_LEVEL"
        value = "INFO"
      }

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name  = "AZURE_KEY_VAULT_URL"
        value = azurerm_key_vault.kv.vault_uri
      }

      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.backend_identity[0].client_id
      }
    }

    min_replicas = 1
    max_replicas = 3
  }

  secret {
    name  = "azure-search-key"
    value = azurerm_search_service.aisearch.primary_key
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }

  secret {
    name  = "secret-key"
    value = var.secret_key
  }

  secret {
    name  = "azure-storage-key"
    value = azurerm_storage_account.sa.primary_access_key
  }

  secret {
    name  = "database-url"
    value = "postgresql+asyncpg://${azurerm_postgresql_flexible_server.pg.administrator_login}:${var.postgres_admin_password}@${azurerm_postgresql_flexible_server.pg.fqdn}:5432/${azurerm_postgresql_flexible_server_database.db.name}?sslmode=require"
  }

  ingress {
    external_enabled = true
    target_port      = 8000
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  depends_on = [azurerm_key_vault_access_policy.backend_access]
}

# ======================================================
# Static Web App (for Next.js frontend)
# ======================================================
resource "azurerm_static_web_app" "swa" {
  name                = "${var.project_name}-swa"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  sku_tier            = "Free"
  sku_size            = "Free"

  # NOTE: You must update the 'frontend_repo_url' variable with your actual repository
  # A GitHub token with repo access is required for the initial deployment.
  # Terraform will prompt you for it on the first 'apply'.
  repository_url      = var.frontend_repo_url
  repository_branch   = var.frontend_repo_branch
  repository_token    = var.github_pat
}
