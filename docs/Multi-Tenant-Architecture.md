# Architecture Technique Multi-Tenant SaaS

## Vue d'ensemble

Ce document détaille l'architecture technique pour transformer le système RAG actuel en plateforme SaaS multi-tenant. L'objectif est de permettre à plusieurs organisations d'utiliser le système de manière isolée et sécurisée.

---

## 1. Stratégies Multi-Tenant

### 1.1. Approche Recommandée : Database-per-Tenant Hybrid

**Choix : Shared Database + Row-Level Security (RLS)**

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                  Tenant Context Middleware                  │
├─────────────────────────────────────────────────────────────┤
│     Shared Database with Row-Level Security (RLS)          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Tenant A  │  │   Tenant B  │  │   Tenant C  │        │
│  │   Data      │  │   Data      │  │   Data      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Avantages :**
- ✅ Coût optimal (infrastructure partagée)
- ✅ Maintenance simplifiée
- ✅ Scaling automatique
- ✅ Backup/monitoring centralisé

**Inconvénients :**
- ❌ Isolation moindre qu'avec DBs séparées
- ❌ Nécessite attention sécurité RLS

---

## 2. Architecture Base de Données

### 2.1. Schéma Multi-Tenant

```sql
-- Tables principales avec tenant_id
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- admin, member, viewer
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    content_hash VARCHAR(255),
    file_size BIGINT,
    upload_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Pour pgvector
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    sources JSONB, -- References to document chunks
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking pour billing
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- message, document_upload, api_call
    quantity INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2. Row-Level Security (RLS)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies pour isolation tenant
CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL TO application_user
    USING (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_chunks ON document_chunks
    FOR ALL TO application_user
    USING (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_conversations ON conversations
    FOR ALL TO application_user
    USING (organization_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_messages ON messages
    FOR ALL TO application_user
    USING (organization_id = current_setting('app.current_tenant_id')::UUID);
```

---

## 3. Architecture Application

### 3.1. Middleware Tenant Context

```python
# middleware/tenant_middleware.py
from fastapi import Request, HTTPException
import asyncio
from contextlib import asynccontextmanager

class TenantContext:
    """Context manager pour le tenant actuel"""
    _tenant_id = contextvars.ContextVar('tenant_id', default=None)
    
    @classmethod
    def get_current_tenant_id(cls) -> str:
        tenant_id = cls._tenant_id.get()
        if not tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        return tenant_id
    
    @classmethod
    @asynccontextmanager
    async def set_context(cls, tenant_id: str):
        token = cls._tenant_id.set(tenant_id)
        try:
            yield
        finally:
            cls._tenant_id.reset(token)

async def tenant_middleware(request: Request, call_next):
    """Middleware pour extraire et setter le tenant context"""
    
    # Extraction du tenant via plusieurs méthodes
    tenant_id = await extract_tenant_id(request)
    
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Tenant not identified")
    
    # Valider que le tenant existe et est actif
    tenant = await get_tenant_by_id(tenant_id)
    if not tenant or not tenant.is_active:
        raise HTTPException(status_code=403, detail="Invalid or inactive tenant")
    
    # Setter le context pour toute la requête
    async with TenantContext.set_context(tenant_id):
        # Configurer la session DB avec le tenant
        await set_db_tenant_context(tenant_id)
        response = await call_next(request)
        return response

async def extract_tenant_id(request: Request) -> str:
    """Extraire tenant_id via différentes méthodes"""
    
    # Méthode 1: Subdomain (app1.docuMind.com)
    host = request.headers.get("host", "")
    if "." in host:
        subdomain = host.split(".")[0]
        tenant = await get_tenant_by_subdomain(subdomain)
        if tenant:
            return tenant.id
    
    # Méthode 2: Header custom
    tenant_header = request.headers.get("X-Tenant-ID")
    if tenant_header:
        return tenant_header
    
    # Méthode 3: JWT token (pour API)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        payload = decode_jwt(token)
        return payload.get("tenant_id")
    
    # Méthode 4: Session user (pour UI)
    user = request.state.user  # Set par auth middleware
    if user and user.organization_id:
        return user.organization_id
    
    return None

async def set_db_tenant_context(tenant_id: str):
    """Configure la session DB pour le tenant"""
    # Pour PostgreSQL avec RLS
    await execute_sql(
        "SET app.current_tenant_id = %s", [tenant_id]
    )
```

### 3.2. Services Tenant-Aware

```python
# services/tenant_aware_search_service.py
from .base_service import TenantAwareService

class TenantAwareSearchService(TenantAwareService):
    """SearchService avec isolation tenant automatique"""
    
    def __init__(self):
        super().__init__()
        # Azure Search index par tenant ou isolation via filtering
        self.index_name = f"documents-{self.get_tenant_id()}"
    
    async def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search avec isolation automatique tenant"""
        tenant_id = self.get_tenant_id()
        
        # Option 1: Index séparé par tenant
        search_client = self.get_tenant_search_client(tenant_id)
        
        # Option 2: Filtering dans index shared
        # filter_expr = f"organization_id eq '{tenant_id}'"
        
        results = await search_client.search(
            search_text=query,
            # filter=filter_expr,  # Si index partagé
            top=top_k
        )
        
        return self.format_results(results)
    
    async def add_documents(self, documents: List[Dict]):
        """Ajout documents avec tenant_id automatique"""
        tenant_id = self.get_tenant_id()
        
        # Injection automatique du tenant_id
        for doc in documents:
            doc["organization_id"] = tenant_id
            doc["search_index"] = f"tenant_{tenant_id}"
        
        return await super().add_documents(documents)

class TenantAwareDocumentService(TenantAwareService):
    """DocumentService avec isolation tenant"""
    
    async def process_document(self, file_path: str, filename: str) -> str:
        """Process document avec tenant context"""
        tenant_id = self.get_tenant_id()
        
        # Vérifier les quotas tenant
        await self.check_tenant_quotas()
        
        # Process normal mais avec tenant_id
        doc_id = await super().process_document(file_path, filename)
        
        # Log usage pour billing
        await self.log_usage_event("document_upload", metadata={
            "filename": filename,
            "document_id": doc_id
        })
        
        return doc_id
    
    async def check_tenant_quotas(self):
        """Vérifier limites du plan tenant"""
        tenant = await self.get_current_tenant()
        usage = await self.get_tenant_usage()
        
        limits = PLAN_LIMITS[tenant.subscription_tier]
        
        if usage.documents >= limits.max_documents:
            raise QuotaExceededException("Document limit reached")
        
        if usage.monthly_messages >= limits.max_monthly_messages:
            raise QuotaExceededException("Monthly message limit reached")
```

### 3.3. Base Service Tenant-Aware

```python
# services/base_service.py
class TenantAwareService:
    """Base class pour tous les services avec tenant context"""
    
    def get_tenant_id(self) -> str:
        """Récupère le tenant_id du context actuel"""
        return TenantContext.get_current_tenant_id()
    
    async def get_current_tenant(self) -> Tenant:
        """Récupère l'objet tenant complet"""
        tenant_id = self.get_tenant_id()
        return await get_tenant_by_id(tenant_id)
    
    async def log_usage_event(self, event_type: str, quantity: int = 1, metadata: dict = None):
        """Log événement usage pour billing"""
        tenant_id = self.get_tenant_id()
        
        await create_usage_event(
            organization_id=tenant_id,
            event_type=event_type,
            quantity=quantity,
            metadata=metadata
        )
    
    async def get_tenant_usage(self) -> TenantUsage:
        """Récupère usage actuel du tenant"""
        tenant_id = self.get_tenant_id()
        return await calculate_tenant_usage(tenant_id)
```

---

## 4. Storage Strategy

### 4.1. Document Storage Multi-Tenant

```python
# storage/tenant_storage.py
class TenantAwareStorageService:
    """Stockage documents avec isolation tenant"""
    
    def __init__(self):
        self.base_container = "documents"
    
    def get_tenant_path(self, tenant_id: str, filename: str) -> str:
        """Génère path avec isolation tenant"""
        return f"tenants/{tenant_id}/documents/{filename}"
    
    async def upload_document(self, file_content: bytes, filename: str) -> str:
        """Upload avec path tenant-specific"""
        tenant_id = TenantContext.get_current_tenant_id()
        blob_path = self.get_tenant_path(tenant_id, filename)
        
        # Upload vers Azure Blob Storage
        blob_url = await self.azure_storage.upload_blob(
            container=self.base_container,
            blob_name=blob_path,
            data=file_content
        )
        
        return blob_url
    
    async def delete_tenant_data(self, tenant_id: str):
        """Suppression complète données tenant (GDPR)"""
        tenant_prefix = f"tenants/{tenant_id}/"
        
        # Supprimer tous les blobs du tenant
        await self.azure_storage.delete_blobs_by_prefix(
            container=self.base_container,
            prefix=tenant_prefix
        )
```

### 4.2. Vector Search Multi-Tenant

```python
# search/tenant_search.py
class TenantAwareVectorSearch:
    """Vector search avec isolation tenant"""
    
    STRATEGY_SHARED_INDEX = "shared"      # 1 index, filter par tenant
    STRATEGY_TENANT_INDEX = "per_tenant"  # 1 index par tenant
    
    def __init__(self, strategy: str = STRATEGY_SHARED_INDEX):
        self.strategy = strategy
    
    def get_index_name(self, tenant_id: str = None) -> str:
        """Détermine nom index selon stratégie"""
        if self.strategy == self.STRATEGY_TENANT_INDEX:
            tenant_id = tenant_id or TenantContext.get_current_tenant_id()
            return f"documents-{tenant_id}"
        else:
            return "documents-shared"
    
    async def create_tenant_index(self, tenant_id: str):
        """Crée index dédié pour nouveau tenant"""
        if self.strategy == self.STRATEGY_TENANT_INDEX:
            index_name = self.get_index_name(tenant_id)
            await self.azure_search.create_index(
                name=index_name,
                fields=self.get_index_schema()
            )
    
    async def search_documents(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search avec isolation tenant automatique"""
        tenant_id = TenantContext.get_current_tenant_id()
        index_name = self.get_index_name(tenant_id)
        
        if self.strategy == self.STRATEGY_SHARED_INDEX:
            # Filter dans index partagé
            filter_expr = f"organization_id eq '{tenant_id}'"
            results = await self.azure_search.search(
                index_name=index_name,
                query=query,
                filter=filter_expr,
                top=top_k
            )
        else:
            # Index dédié tenant
            results = await self.azure_search.search(
                index_name=index_name,
                query=query,
                top=top_k
            )
        
        return results
```

---

## 5. Configuration et Déploiement

### 5.1. Configuration Multi-Environment

```python
# config/settings.py
from pydantic import BaseSettings
from enum import Enum

class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"  
    PRODUCTION = "production"

class MultiTenantStrategy(str, Enum):
    SHARED_DB = "shared_db"
    DB_PER_TENANT = "db_per_tenant"
    SCHEMA_PER_TENANT = "schema_per_tenant"

class Settings(BaseSettings):
    # Multi-tenant config
    MULTI_TENANT_STRATEGY: MultiTenantStrategy = MultiTenantStrategy.SHARED_DB
    ENABLE_TENANT_ISOLATION: bool = True
    MAX_TENANTS_PER_INSTANCE: int = 1000
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30
    
    # Azure services
    AZURE_SEARCH_ENDPOINT: str
    AZURE_SEARCH_KEY: str
    AZURE_STORAGE_CONNECTION_STRING: str
    
    # Redis pour caching tenant data
    REDIS_URL: str = "redis://localhost:6379"
    
    # Billing/Usage
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    
    # Security
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    class Config:
        env_file = ".env"
```

### 5.2. Docker Multi-Tenant

```dockerfile
# Dockerfile.multitenant
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY . .

# Multi-tenant specific setup
ENV MULTI_TENANT_MODE=true
ENV ENABLE_TENANT_ISOLATION=true

# Health check tenant-aware
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python healthcheck.py --check-tenants

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.3. Infrastructure Scaling

```yaml
# docker-compose.multitenant.yml
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile.multitenant
    replicas: 3  # Load balancing
    environment:
      - MULTI_TENANT_STRATEGY=shared_db
      - DATABASE_POOL_SIZE=10
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: docuMind_multitenant
      POSTGRES_USER: app
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-multitenant.sql:/docker-entrypoint-initdb.d/init.sql
    
  redis:
    image: redis:7
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.multitenant.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

---

## 6. Monitoring et Observabilité

### 6.1. Métriques Tenant-Specific

```python
# monitoring/tenant_metrics.py
from prometheus_client import Counter, Histogram, Gauge
import asyncio

# Métriques par tenant
TENANT_REQUESTS = Counter(
    'tenant_requests_total',
    'Total requests per tenant',
    ['tenant_id', 'endpoint', 'status']
)

TENANT_RESPONSE_TIME = Histogram(
    'tenant_response_time_seconds',
    'Response time per tenant',
    ['tenant_id', 'endpoint']
)

TENANT_ACTIVE_USERS = Gauge(
    'tenant_active_users',
    'Active users per tenant',
    ['tenant_id']
)

TENANT_DOCUMENT_COUNT = Gauge(
    'tenant_documents_total',
    'Total documents per tenant',
    ['tenant_id']
)

TENANT_USAGE_EVENTS = Counter(
    'tenant_usage_events_total',
    'Usage events for billing',
    ['tenant_id', 'event_type']
)

class TenantMetricsMiddleware:
    """Middleware pour collecter métriques tenant"""
    
    async def __call__(self, request: Request, call_next):
        tenant_id = TenantContext.get_current_tenant_id()
        endpoint = request.url.path
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            status = response.status_code
        except Exception as e:
            status = 500
            raise
        finally:
            # Record metrics
            TENANT_REQUESTS.labels(
                tenant_id=tenant_id,
                endpoint=endpoint,
                status=status
            ).inc()
            
            TENANT_RESPONSE_TIME.labels(
                tenant_id=tenant_id,
                endpoint=endpoint
            ).observe(time.time() - start_time)
        
        return response

# Background task pour usage metrics
async def collect_tenant_usage_metrics():
    """Collecte périodique des métriques usage"""
    while True:
        tenants = await get_active_tenants()
        
        for tenant in tenants:
            # Active users last 24h
            active_users = await count_active_users(tenant.id)
            TENANT_ACTIVE_USERS.labels(tenant_id=tenant.id).set(active_users)
            
            # Total documents
            doc_count = await count_tenant_documents(tenant.id)
            TENANT_DOCUMENT_COUNT.labels(tenant_id=tenant.id).set(doc_count)
        
        await asyncio.sleep(300)  # Every 5 minutes
```

### 6.2. Alerting Multi-Tenant

```python
# monitoring/tenant_alerts.py
class TenantAlertManager:
    """Gestion alertes tenant-specific"""
    
    async def check_tenant_health(self, tenant_id: str) -> Dict:
        """Health check approfondi tenant"""
        checks = {
            "database_connectivity": await self.check_db_access(tenant_id),
            "search_service": await self.check_search_access(tenant_id),
            "storage_access": await self.check_storage_access(tenant_id),
            "quota_status": await self.check_quotas(tenant_id),
            "billing_status": await self.check_billing_status(tenant_id)
        }
        
        return {
            "tenant_id": tenant_id,
            "healthy": all(checks.values()),
            "checks": checks,
            "timestamp": datetime.utcnow()
        }
    
    async def check_quotas(self, tenant_id: str) -> bool:
        """Vérifier si tenant approche limites"""
        tenant = await get_tenant_by_id(tenant_id)
        usage = await get_tenant_usage(tenant_id)
        limits = PLAN_LIMITS[tenant.subscription_tier]
        
        # Alert si > 80% des limites
        if usage.documents > limits.max_documents * 0.8:
            await self.send_quota_alert(tenant_id, "documents", usage.documents, limits.max_documents)
        
        if usage.monthly_messages > limits.max_monthly_messages * 0.8:
            await self.send_quota_alert(tenant_id, "messages", usage.monthly_messages, limits.max_monthly_messages)
        
        return True
    
    async def send_quota_alert(self, tenant_id: str, resource: str, current: int, limit: int):
        """Envoi alerte quota"""
        tenant = await get_tenant_by_id(tenant_id)
        admins = await get_tenant_admins(tenant_id)
        
        for admin in admins:
            await send_email(
                to=admin.email,
                subject=f"Quota Alert - {resource}",
                template="quota_alert",
                context={
                    "tenant_name": tenant.name,
                    "resource": resource,
                    "current": current,
                    "limit": limit,
                    "percentage": (current / limit) * 100
                }
            )
```

Cette architecture multi-tenant robuste permet de servir des milliers d'organisations tout en maintenant isolation, sécurité et performance optimales.