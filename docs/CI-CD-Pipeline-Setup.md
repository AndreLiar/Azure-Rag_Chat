# CI/CD Pipeline Setup Guide

## 🚀 Nouveau Pipeline Production

Votre système utilise maintenant un pipeline CI/CD optimisé pour SaaS multi-tenant avec déploiement blue-green et tests complets.

---

## 📋 Vue d'ensemble du Pipeline

```
Push Code → GitHub → Tests Parallèles → Build & Security → Staging → Production
│
├── Phase 1: Tests Parallèles
│   ├── Backend Tests (Python, Security, Coverage)
│   ├── Frontend Tests (Node.js, Lighthouse, TypeScript)
│   └── Integration Tests (Docker Compose, API)
│
├── Phase 2: Build & Sécurité  
│   ├── Docker Images (Backend + Frontend)
│   ├── Vulnerability Scanning (Trivy)
│   └── Push to GitHub Container Registry
│
├── Phase 3: Déploiement Staging
│   ├── Deploy to Azure Container Apps (Staging)
│   ├── Deploy to Azure Static Web Apps (Staging)
│   └── Smoke Tests + Performance Tests
│
└── Phase 4: Déploiement Production
    ├── Blue-Green Deployment
    ├── Gradual Traffic Switch (10% → 50% → 100%)
    ├── Health Checks
    └── Automatic Rollback si échec
```

---

## ⚙️ Configuration GitHub Secrets

Ajoutez ces secrets dans GitHub Settings → Secrets and Variables → Actions :

### 🔐 Azure Authentication
```bash
AZURE_CREDENTIALS           # Service Principal JSON
AZURE_SUBSCRIPTION_ID       # Your Azure subscription ID
```

### 🔐 Azure Resources  
```bash
# Production
AZURE_STATIC_WEB_APPS_API_TOKEN        # Production Static Web App token
DATABASE_URL_PRODUCTION                 # Production database connection
OPENAI_API_KEY                         # Production OpenAI key
AZURE_SEARCH_ENDPOINT                  # Production search endpoint  
AZURE_SEARCH_KEY                       # Production search key
AZURE_STORAGE_ACCOUNT_NAME             # Production storage account

# Staging  
AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING # Staging Static Web App token
DATABASE_URL_STAGING                    # Staging database connection
OPENAI_API_KEY_STAGING                 # Staging OpenAI key (can be same)
AZURE_SEARCH_ENDPOINT_STAGING          # Staging search endpoint
AZURE_SEARCH_KEY_STAGING               # Staging search key  
AZURE_STORAGE_ACCOUNT_NAME_STAGING     # Staging storage account
```

### 🔐 Notifications
```bash
SLACK_WEBHOOK_URL           # Slack webhook for deployment notifications
```

---

## 🏗️ Infrastructure Setup Requise

### 1. Azure Container Apps (2 environments)
```bash
# Production
az containerapp create \
  --name ragchat12481-backend \
  --resource-group ragchat12481-rg \
  --environment ragchat12481-cae

# Staging  
az containerapp create \
  --name ragchat12481-backend-staging \
  --resource-group ragchat12481-rg \
  --environment ragchat12481-cae
```

### 2. Azure Static Web Apps (2 environments)
- Production: `https://app.docuMind.com`
- Staging: `https://staging.docuMind.com`

### 3. Databases (2 environments)
- Production database
- Staging database (can be smaller tier)

---

## 🧪 Tests Configuration

### Backend Tests (Python)
```bash
# Dans backend/requirements-dev.txt (à créer)
pytest>=7.0.0
pytest-asyncio>=0.21.0
pytest-cov>=4.0.0
black>=23.0.0
flake8>=6.0.0
safety>=2.0.0
bandit>=1.7.0
```

### Frontend Tests (Node.js)
```json
// Dans frontend/package.json (déjà mis à jour)
{
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0"
  }
}
```

### Configuration Jest  
```javascript
// frontend/jest.config.js (à créer)
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ]
}
```

---

## 🔄 Fonctionnement du Pipeline

### 1. Détection des Changements
Le pipeline utilise `dorny/paths-filter` pour détecter quels composants ont changé :
```yaml
backend: 'backend/**'     → Execute backend tests
frontend: 'frontend/**'  → Execute frontend tests  
infrastructure: 'infra/**' → Skip tests, notify
```

### 2. Tests Parallèles
- **Backend** : Tests unitaires + sécurité + linting
- **Frontend** : Tests Jest + Lighthouse + TypeScript check
- **Integration** : Docker Compose + API tests

### 3. Build Sécurisé
- Build Docker images avec cache optimisé
- Scan vulnérabilités avec Trivy
- Push vers GitHub Container Registry

### 4. Déploiement Staging
- Deploy automatique vers environnement staging
- Tests smoke pour valider fonctionnement
- Performance tests avec Apache Bench

### 5. Déploiement Production
- **Manual approval required** (GitHub Environment)
- Blue-green deployment avec switch progressif
- Monitoring et rollback automatique si échec

---

## 📊 Monitoring et Observabilité

### Health Checks
- `/health` endpoint backend
- Frontend accessibility check
- Database connectivity  
- External services (OpenAI, Azure Search)

### Notifications Slack
```json
// Format des notifications
{
  "text": "🚀 Deployment successful!",
  "attachments": [{
    "color": "good",
    "fields": [
      {"title": "Commit", "value": "abc123"},
      {"title": "Environment", "value": "Production"},  
      {"title": "URL", "value": "https://app.docuMind.com"}
    ]
  }]
}
```

### Monitoring Azure
- Application Insights pour logs
- Container Apps metrics  
- Alert rules pour error rates
- Performance counters

---

## 🛠️ Commandes de Maintenance

### Vérifier Status Pipeline
```bash
# Via GitHub CLI
gh run list --repo your-repo --workflow=production.yml

# Voir logs d'un run
gh run view RUN_ID --repo your-repo
```

### Rollback Manuel
```bash
# Lister les revisions disponibles
az containerapp revision list \
  --name ragchat12481-backend \
  --resource-group ragchat12481-rg

# Rollback vers revision précédente  
az containerapp ingress traffic set \
  --name ragchat12481-backend \
  --resource-group ragchat12481-rg \
  --revision-weight PREVIOUS_REVISION=100
```

### Debug Déploiement
```bash
# Logs Container Apps
az containerapp logs show \
  --name ragchat12481-backend \
  --resource-group ragchat12481-rg

# Status Health Check
curl -f https://api.docuMind.com/health

# Métriques performance
curl -s https://api.docuMind.com/metrics
```

---

## 🚨 Résolution Problèmes

### ❌ Tests Backend Failing
```bash
# Debug localement
cd backend
python -m pytest tests/ -v --tb=short

# Check security issues
safety check
bandit -r . -f json
```

### ❌ Tests Frontend Failing  
```bash
# Debug localement
cd frontend
npm run test
npm run lint
npm run type-check
```

### ❌ Déploiement Failing
```bash
# Check Azure resources
az containerapp show --name ragchat12481-backend --resource-group ragchat12481-rg

# Verify secrets
az keyvault secret list --vault-name your-vault
```

### ❌ Performance Issues
```bash
# Check metrics
az monitor metrics list --resource /subscriptions/.../ragchat12481-backend

# Scale up if needed
az containerapp update \
  --name ragchat12481-backend \
  --cpu 1.0 --memory 2.0Gi
```

---

## 🎯 Next Steps

1. **Monitoring Setup** : Configure Application Insights dashboards
2. **Alert Rules** : Set up proactive monitoring alerts  
3. **Load Testing** : Implement comprehensive load tests
4. **Security** : Regular security scans et penetration testing
5. **Cost Optimization** : Monitor Azure costs et optimize resources

Ce pipeline vous donne une base robuste pour scaling votre SaaS avec confiance et sécurité.