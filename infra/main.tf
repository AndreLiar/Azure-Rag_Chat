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
# Container App (for FastAPI backend)
# ======================================================
resource "azurerm_container_app" "backend" {
  count                        = var.enable_container_apps ? 1 : 0
  name                         = "${var.project_name}-backend"
  container_app_environment_id = azurerm_container_app_environment.cae[0].id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

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
        name  = "ENVIRONMENT"
        value = "production"
      }

      env {
        name  = "LOG_LEVEL"
        value = "INFO"
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

  ingress {
    external_enabled = true
    target_port      = 8000
    traffic_weight {
      percentage = 100
      latest_revision = true
    }
  }
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
