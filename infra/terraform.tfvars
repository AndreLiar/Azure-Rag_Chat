# Azure Infrastructure Configuration
subscription_id = "e75e283f-2720-4ae5-8a7b-da0b8d4f6c11"

# Project Settings
project_name = "ragchat12481"
location = "eastus2"

# Cost Optimization Settings
ai_search_sku = "free"
enable_observability = true
enable_container_apps = true

# Repository Settings
frontend_repo_url = "https://github.com/AndreLiar/Azure-Rag_Chat"
frontend_repo_branch = "main"

# Backend Container Image
backend_image = "ghcr.io/andreliar/azure-rag_chat-backend:latest"

# PostgreSQL Settings
postgres_admin_username = "pgadmin"

# Sensitive variables - will be prompted for or set via environment variables
# github_pat = ""
# openai_api_key = ""
# postgres_admin_password = ""
# secret_key = ""