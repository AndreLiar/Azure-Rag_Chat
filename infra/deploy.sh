#!/bin/bash

# Azure RAG Chat Deployment Script
# This script helps you securely deploy the infrastructure

echo "🚀 Azure RAG Chat Infrastructure Deployment"
echo "==========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "main.tf" ]; then
    echo "❌ Error: Please run this script from the infra directory"
    exit 1
fi

# Check if terraform is initialized
if [ ! -d ".terraform" ]; then
    echo "🔧 Initializing Terraform..."
    terraform init
fi

echo "📝 Please provide the following required values:"
echo ""

# GitHub PAT
echo "🔑 GitHub Personal Access Token (for Static Web App deployment):"
echo "   You can create one at: https://github.com/settings/tokens"
echo "   Required permissions: repo, read:packages"
read -s -p "   Enter your GitHub PAT: " TF_VAR_github_pat
echo ""
echo ""

# OpenAI API Key  
echo "🤖 OpenAI API Key:"
echo "   Get your API key from: https://platform.openai.com/api-keys"
read -s -p "   Enter your OpenAI API Key: " TF_VAR_openai_api_key
echo ""
echo ""

# PostgreSQL Password
echo "🐘 PostgreSQL Admin Password:"
echo "   Create a strong password for the database admin user"
read -s -p "   Enter PostgreSQL password: " TF_VAR_postgres_admin_password
echo ""
echo ""

# JWT Secret Key
echo "🔐 JWT Secret Key:"
echo "   This will be used to sign authentication tokens"
read -s -p "   Enter a strong secret key (or press Enter for auto-generated): " TF_VAR_secret_key
echo ""

# Generate secret key if empty
if [ -z "$TF_VAR_secret_key" ]; then
    TF_VAR_secret_key=$(openssl rand -base64 32)
    echo "   ✅ Auto-generated secret key"
fi

echo ""
echo "🔍 Running Terraform Plan..."

# Export variables for Terraform
export TF_VAR_github_pat
export TF_VAR_openai_api_key  
export TF_VAR_postgres_admin_password
export TF_VAR_secret_key

# Run terraform plan
terraform plan

echo ""
echo "📋 Plan Summary:"
echo "   - Resource Group: ragchat12481-rg"
echo "   - PostgreSQL Database: ragchat12481-pg" 
echo "   - Key Vault: ragchat12481-kv-xxxx"
echo "   - Storage Account: ragchat12481sa"
echo "   - AI Search: ragchat12481-search"
echo "   - Static Web App: ragchat12481-swa"
echo "   - Container Apps: ragchat12481-backend"
echo ""

read -p "🚀 Do you want to apply these changes? (y/N): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    echo ""
    echo "🚀 Applying Terraform configuration..."
    terraform apply -auto-approve
    
    echo ""
    echo "✅ Deployment completed!"
    echo ""
    echo "📊 Getting infrastructure outputs..."
    terraform output
    
    echo ""
    echo "🎉 Your Azure RAG Chat infrastructure is now deployed!"
    echo ""
    echo "Next steps:"
    echo "1. Update your backend container image with the new configuration"
    echo "2. Deploy your frontend to the Static Web App"
    echo "3. Test the application end-to-end"
else
    echo ""
    echo "❌ Deployment cancelled"
fi

# Clear sensitive variables
unset TF_VAR_github_pat
unset TF_VAR_openai_api_key
unset TF_VAR_postgres_admin_password 
unset TF_VAR_secret_key