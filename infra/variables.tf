variable "project_name" {
  description = "Project prefix for naming resources"
  type        = string
  default     = "ragchat12481"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westeurope"
}

variable "ai_search_sku" {
  description = "SKU for Azure AI Search (use free for dev to minimize spend)"
  type        = string
  default     = "free"
}

variable "enable_observability" {
  description = "Provision Log Analytics and Application Insights (set false to save cost)"
  type        = bool
  default     = true
}

variable "enable_container_apps" {
  description = "Provision Azure Container Apps environment (requires Log Analytics workspace)"
  type        = bool
  default     = true
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "frontend_repo_url" {
  description = "Frontend Git repository URL for Static Web App"
  type        = string
  default     = "https://github.com/AndreLiar/Azure-Rag_Chat"
}

variable "frontend_repo_branch" {
  description = "Frontend Git repository branch for Static Web App"
  type        = string
  default     = "main"
}

variable "github_pat" {
  description = "GitHub Personal Access Token for Static Web App deployment"
  type        = string
  sensitive   = true
}

variable "backend_image" {
  description = "Docker image for the backend Container App"
  type        = string
  default     = "ghcr.io/andreliar/azure-rag_chat-backend:latest"
}

variable "openai_api_key" {
  description = "OpenAI API Key for the backend application"
  type        = string
  sensitive   = true
}

variable "postgres_admin_username" {
  description = "Admin username for the PostgreSQL server"
  type        = string
  default     = "pgadmin"
}

variable "postgres_admin_password" {
  description = "Admin password for the PostgreSQL server"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "JWT secret key for the backend application"
  type        = string
  sensitive   = true
}
