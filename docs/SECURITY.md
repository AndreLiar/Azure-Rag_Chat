# Security Guide

## 🚨 CRITICAL SECURITY NOTICE

**All sensitive credentials are managed securely and never stored in version control.**

## Secret Management Overview

This project uses a three-tier secret management approach:

### 1. Development Environment (.env files)
- **Location**: `frontend/.env.local`, `backend/.env`
- **Purpose**: Local development only
- **Security**: Not committed to git (in .gitignore)

### 2. CI/CD Pipeline (GitHub Secrets)
- **Location**: GitHub Repository Settings > Secrets and variables > Actions
- **Purpose**: GitHub Actions workflow access
- **Security**: Encrypted at rest, only accessible during workflow execution

### 3. Production Environment (Azure Key Vault)
- **Location**: Azure Key Vault: `ragchat12481-kv-*`
- **Purpose**: Runtime secrets for deployed applications
- **Security**: Managed Identity access, no hardcoded secrets

## Required Secrets

### GitHub Repository Secrets
Set these in your GitHub repository settings:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anonymous-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres

# Application Secrets
OPENAI_API_KEY=your-openai-api-key-here
SECRET_KEY=your-jwt-secret-key-here
GH_PAT=your-github-personal-access-token

# Azure Deployment
AZURE_CREDENTIALS={"clientId":"xxx","clientSecret":"xxx","subscriptionId":"xxx","tenantId":"xxx"}
AZURE_STATIC_WEB_APPS_API_TOKEN=your-static-web-app-deployment-token
```

### Terraform Environment Variables
For infrastructure deployment, set these environment variables:

```bash
export TF_VAR_github_pat="your-github-personal-access-token"
export TF_VAR_openai_api_key="your-openai-api-key"
export TF_VAR_secret_key="your-jwt-secret-key"
export TF_VAR_supabase_anon_key="your-supabase-anonymous-key"
export TF_VAR_supabase_service_role_key="your-supabase-service-role-key"
export TF_VAR_database_url="your-database-connection-string"
```

## Quick Setup Instructions

### 1. Set up GitHub Secrets (Automated)
Run the setup script to automatically configure most secrets:
```bash
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

### 2. Create Azure Service Principal
You still need to manually create Azure credentials:
```bash
# Create service principal
az ad sp create-for-rbac --name 'ragchat-github-actions' --role contributor --scopes /subscriptions/YOUR_SUBSCRIPTION_ID --json-auth

# Set the output as AZURE_CREDENTIALS secret in GitHub
gh secret set AZURE_CREDENTIALS -R YourUsername/Your-Repo
```

### 3. Get Static Web App Token
1. Go to Azure Portal > Static Web Apps > your app
2. Manage deployment tokens
3. Copy the token and set as `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub secrets

## Security Features Implemented

✅ **No secrets in source code**  
✅ **Environment variable based configuration**  
✅ **Azure Key Vault integration**  
✅ **Managed Identity authentication**  
✅ **Secure CI/CD pipeline**  
✅ **Automatic secret rotation capability**  

## Security Checklist

- [ ] All GitHub secrets configured
- [ ] Azure Service Principal created
- [ ] Static Web App deployment token set
- [ ] terraform.tfvars file ignored in git
- [ ] Environment variables set for local development
- [ ] Key Vault permissions validated

## Emergency Procedures

### If secrets are exposed:
1. **Rotate immediately**: Change all affected credentials
2. **Update repositories**: GitHub secrets, Azure Key Vault
3. **Redeploy**: Trigger fresh deployment with new secrets
4. **Audit**: Check access logs for unauthorized usage

### Contact Information
- **Security Issues**: Open GitHub issue with `security` label
- **Emergency**: Contact project maintainer immediately