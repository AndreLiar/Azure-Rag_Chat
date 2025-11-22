# Azure Infrastructure Configuration
subscription_id = "e75e283f-2720-4ae5-8a7b-da0b8d4f6c11"

# Project Settings
project_name = "ragchat12481"
location = "westus2"

# Cost Optimization Settings
ai_search_sku = "free"
enable_observability = true
enable_container_apps = true

# Repository Settings
frontend_repo_url = "https://github.com/AndreLiar/Azure-Rag_Chat"
frontend_repo_branch = "main"

# Backend Container Image
backend_image = "ghcr.io/andreliar/azure-rag_chat-backend:latest"

# Supabase Settings
supabase_url = "https://qtdzycezqfnldpkylozk.supabase.co"

# Sensitive variables - Set via environment variables for security
# supabase_anon_key = ""  # Set via TF_VAR_supabase_anon_key
# supabase_service_role_key = ""  # Set via TF_VAR_supabase_service_role_key  
# database_url = ""  # Set via TF_VAR_database_url
# github_pat = ""  # Set via TF_VAR_github_pat
# openai_api_key = ""  # Set via TF_VAR_openai_api_key
# secret_key = ""  # Set via TF_VAR_secret_key