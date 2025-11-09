# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the infrastructure directory for an Azure RAG (Retrieval-Augmented Generation) Chat application. The project provisions Azure resources using Terraform to support a cost-effective RAG chat application with a containerized backend and static frontend.

## Infrastructure Components

- **Azure Static Web App**: Hosts the Next.js frontend (Free tier)
- **Azure Container Apps**: Runs the FastAPI backend in a serverless environment
- **Azure AI Search**: Provides vector search capabilities (free tier by default)
- **Azure Storage Account**: Stores documents to be indexed
- **Azure Monitor & Application Insights**: Observability (optional)

## Common Commands

### Terraform Operations

```bash
# Initialize Terraform (run from infra directory)
terraform init

# Plan infrastructure changes
terraform plan

# Deploy infrastructure
terraform apply

# View outputs
terraform output

# Destroy infrastructure
terraform destroy
```

### Azure Authentication

```bash
# Login to Azure CLI
az login

# Set subscription (if needed)
az account set --subscription <subscription-id>
```

## Configuration Requirements

### Required Variables
- `subscription_id`: Your Azure subscription ID
- `github_pat`: GitHub Personal Access Token for Static Web App deployment
- `frontend_repo_url`: GitHub repository URL for the frontend
- `frontend_repo_branch`: Branch to deploy (default: "main")

### Environment Setup
The backend expects these environment variables after deployment:
- `AZURE_STORAGE_ACCOUNT_NAME`: From terraform outputs
- `AZURE_SEARCH_ENDPOINT`: From terraform outputs  
- `AZURE_SEARCH_KEY`: Retrieved from Azure portal
- `OPENAI_API_KEY`: Your private OpenAI API key

## Cost Optimization

The infrastructure is configured for minimal cost:
- Azure AI Search uses the `free` tier
- Static Web App uses the `Free` tier
- Storage Account uses Standard LRS
- Observability can be disabled via `enable_observability = false`
- Container Apps can be disabled via `enable_container_apps = false`

## Important Files

- `main.tf`: Main infrastructure definitions
- `variables.tf`: Configurable parameters with defaults
- `outputs.tf`: Infrastructure outputs for application configuration
- `provider.tf`: Terraform and Azure provider configuration
- `GEMINI.md`: Detailed project documentation and deployment guide

## GitHub Integration

The Static Web App requires a GitHub PAT with "Contents" read/write permissions to deploy the frontend. Update the `frontend_repo_url` variable with your actual repository before deployment.