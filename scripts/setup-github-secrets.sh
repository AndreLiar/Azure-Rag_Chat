#!/bin/bash

# GitHub Repository Secrets Setup Script
# This script helps you set up GitHub repository secrets for CI/CD

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Repository settings
REPO_OWNER="AndreLiar"
REPO_NAME="Azure-Rag_Chat"

# Supabase configuration - YOUR ACTUAL VALUES
SUPABASE_URL="https://qtdzycezqfnldpkylozk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0ZHp5Y2V6cWZubGRwa3lsb3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM1NjcsImV4cCI6MjA3OTM5OTU2N30.Fk7D__Fm2Xb3sLa9cOB8AI9MsjZkJy6aRCJXJ_KHaJY"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0ZHp5Y2V6cWZubGRwa3lsb3prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgyMzU2NywiZXhwIjoyMDc5Mzk5NTY3fQ.e1AAm7wgf4o704IeuS7KZgWFuJHmdEblinleeE4oh3I"
DATABASE_URL="postgresql://postgres:WXCPUL1I4N5wP9Bj@db.qtdzycezqfnldpkylozk.supabase.co:5432/postgres"

echo -e "${BLUE}🔐 GitHub Repository Secrets Setup${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo -e "${YELLOW}Please install it from: https://github.com/cli/cli#installation${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}🔑 Please authenticate with GitHub first:${NC}"
    echo -e "${BLUE}gh auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is ready${NC}"

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo -e "${BLUE}Setting secret: ${secret_name}${NC}"
    if echo "$secret_value" | gh secret set "$secret_name" -R "${REPO_OWNER}/${REPO_NAME}"; then
        echo -e "${GREEN}✅ ${secret_name} set successfully${NC}"
    else
        echo -e "${RED}❌ Failed to set ${secret_name}${NC}"
        return 1
    fi
}

echo -e "${YELLOW}📝 Setting up repository secrets...${NC}"

# Azure credentials (you'll need to get these from your Azure setup)
echo -e "${YELLOW}⚠️  You need to manually set these Azure secrets:${NC}"
echo -e "${BLUE}AZURE_CREDENTIALS - Service Principal JSON${NC}"
echo -e "${BLUE}AZURE_SUBSCRIPTION_ID - Your Azure subscription ID${NC}"
echo -e "${BLUE}AZURE_RESOURCE_GROUP - ragchat12481-rg${NC}"
echo -e "${BLUE}KEY_VAULT_NAME - Your Azure Key Vault name${NC}"

# Set Supabase secrets
set_secret "SUPABASE_URL" "$SUPABASE_URL" "Supabase project URL"
set_secret "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "Supabase anonymous key"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key"
set_secret "DATABASE_URL" "$DATABASE_URL" "PostgreSQL connection string"

# Additional secrets - REPLACE WITH YOUR ACTUAL VALUES
echo -e "${YELLOW}⚠️  Please manually set these additional secrets with your actual values:${NC}"
echo -e "${BLUE}OPENAI_API_KEY - Your OpenAI API key${NC}"
echo -e "${BLUE}GH_PAT - Your GitHub Personal Access Token${NC}"
echo -e "${BLUE}SECRET_KEY - Your JWT secret key${NC}"

echo -e "${GREEN}🎉 Basic secrets setup complete!${NC}"
echo -e "${YELLOW}⚠️  Remember to set the Azure credentials mentioned above.${NC}"

# Show how to set Azure credentials
echo -e "\n${BLUE}📋 To set Azure credentials:${NC}"
echo -e "${BLUE}1. Create a service principal:${NC}"
echo -e "   az ad sp create-for-rbac --name 'ragchat-github-actions' --role contributor --scopes /subscriptions/YOUR_SUBSCRIPTION_ID --json-auth"
echo -e "\n${BLUE}2. Set the output as AZURE_CREDENTIALS secret:${NC}"
echo -e "   gh secret set AZURE_CREDENTIALS -R ${REPO_OWNER}/${REPO_NAME}"
echo -e "\n${BLUE}3. Set other Azure secrets:${NC}"
echo -e "   gh secret set AZURE_SUBSCRIPTION_ID -R ${REPO_OWNER}/${REPO_NAME}"
echo -e "   gh secret set AZURE_RESOURCE_GROUP -R ${REPO_OWNER}/${REPO_NAME}"
echo -e "   gh secret set KEY_VAULT_NAME -R ${REPO_OWNER}/${REPO_NAME}"

echo -e "\n${GREEN}✅ Setup script completed!${NC}"