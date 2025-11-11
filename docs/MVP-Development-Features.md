# Développement MVP Features - DocuMind SaaS

## Vue d'ensemble du MVP

**Objectif :** Transformer le système RAG actuel en MVP SaaS multi-tenant prêt pour les premiers clients payants en 12 semaines.

**Principe :** "Build fast, validate faster" - focus sur les features essentielles qui démontrent la value proposition core avec une expérience utilisateur professionnelle.

---

## 1. Architecture MVP vs. Version Actuelle

### 1.1. Transformations Nécessaires

```
Version Actuelle (Single-Tenant)    →    MVP SaaS (Multi-Tenant)
│
├── Single user system              →    Multi-user/organization system
├── Local document storage          →    Cloud storage avec isolation
├── In-memory conversations         →    Persistent conversation history  
├── No authentication              →    User auth + organization management
├── No usage tracking              →    Usage metering pour billing
├── Basic UI                       →    Professional SaaS interface
├── No payment system              →    Stripe billing integration
└── Manual deployment              →    Automated deployment pipeline
```

### 1.2. Stack Évolution

```python
# MVP Stack Enhancement
Current:                           MVP Addition:
FastAPI                    +       Multi-tenant middleware
Next.js                    +       User authentication UI
PostgreSQL (simple)        +       Multi-tenant schema + RLS
Azure AI Search            +       Tenant isolation
OpenAI                     +       Usage tracking/billing
Docker                     +       Production deployment
```

---

## 2. Features MVP Core (Must-Have)

### 2.1. Authentication & User Management

#### 2.1.1. User Registration/Login
```typescript
// Frontend: User Auth Components
components/auth/
├── SignupForm.tsx           // Organisation creation + admin user
├── LoginForm.tsx            // Email/password login
├── InviteUserForm.tsx       // Admin invites team members  
├── PasswordReset.tsx        // Password reset flow
└── UserProfile.tsx          // User settings

// API Endpoints
POST /auth/register          // Create organization + admin
POST /auth/login            // User authentication
POST /auth/logout           // Session termination
POST /auth/forgot-password  // Password reset initiation
PUT /auth/reset-password    // Password reset completion
```

**Acceptance Criteria :**
- [x] User can create account + organization in <2 minutes
- [x] Email verification required
- [x] Password requirements enforced (8+ chars, mixed case, numbers)
- [x] Session management with JWT tokens
- [x] "Remember me" functionality

#### 2.1.2. Organization Management
```typescript
// Organization Settings
components/organization/
├── OrganizationSettings.tsx    // Name, branding, plan info
├── TeamMembers.tsx            // User list, roles, invites
├── BillingSettings.tsx        // Subscription, payment methods
└── UsageAnalytics.tsx         // Current month usage

// User Roles
enum UserRole {
  ADMIN = "admin",           // Full access, billing
  MEMBER = "member",         // Document upload, chat
  VIEWER = "viewer"          // Read-only access
}
```

**Acceptance Criteria :**
- [x] Admin can invite users via email
- [x] Role-based access control working
- [x] Organization branding (logo, name) configurable
- [x] Usage visible to admin users

### 2.2. Document Management Multi-Tenant

#### 2.2.1. Secure Document Upload
```python
# Backend: Tenant-Aware Document Service
class MVPDocumentService(TenantAwareService):
    async def upload_document(self, file: UploadFile, user_id: str) -> dict:
        tenant_id = self.get_tenant_id()
        
        # 1. Validate file (size, type, quota)
        await self.validate_upload(file, tenant_id)
        
        # 2. Secure storage with tenant isolation
        storage_path = f"tenants/{tenant_id}/documents/{file.filename}"
        blob_url = await self.azure_storage.upload_blob(storage_path, file.file)
        
        # 3. Extract text and process
        text_content = await self.extract_text(file)
        chunks = self.create_chunks(text_content)
        
        # 4. Generate embeddings and index
        await self.index_chunks(chunks, tenant_id)
        
        # 5. Log usage for billing  
        await self.log_usage_event("document_upload")
        
        # 6. Store metadata
        document = await self.save_document_metadata({
            "tenant_id": tenant_id,
            "filename": file.filename,
            "uploaded_by": user_id,
            "file_size": file.size,
            "blob_url": blob_url,
            "status": "processed"
        })
        
        return document

    async def validate_upload(self, file: UploadFile, tenant_id: str):
        # Check file size (50MB limit)
        if file.size > 50 * 1024 * 1024:
            raise HTTPException(400, "File too large")
        
        # Check file type
        allowed_types = {'.pdf', '.docx', '.txt', '.csv'}
        if Path(file.filename).suffix.lower() not in allowed_types:
            raise HTTPException(400, "File type not supported")
        
        # Check tenant quota
        tenant_usage = await self.get_tenant_usage(tenant_id)
        plan_limits = await self.get_plan_limits(tenant_id)
        
        if tenant_usage.documents >= plan_limits.max_documents:
            raise HTTPException(402, "Document quota exceeded")
```

#### 2.2.2. Document Library Interface
```typescript
// Frontend: Document Management
components/documents/
├── DocumentUpload.tsx          // Drag-drop upload with progress
├── DocumentList.tsx           // Table with search/filter/sort
├── DocumentPreview.tsx        // Quick content preview
└── DocumentSettings.tsx       // Sharing, permissions

// Document List Features
interface DocumentListProps {
  documents: Document[]
  onUpload: (files: File[]) => void
  onDelete: (docId: string) => void
  onShare: (docId: string) => void
}

// Search & Filter
const [filters, setFilters] = useState({
  search: '',           // Full-text search in titles
  fileType: 'all',     // PDF, DOCX, TXT, CSV, all
  dateRange: '30d',    // 7d, 30d, 90d, all
  uploadedBy: 'all'    // User filter
})
```

**Acceptance Criteria :**
- [x] Drag-drop upload works on all modern browsers
- [x] Upload progress indicator visible
- [x] Batch upload supported (max 10 files)
- [x] Document list loads fast (<2s for 100+ docs)
- [x] Search works across filenames and content
- [x] Admin can see who uploaded what document

### 2.3. Intelligent Chat Interface

#### 2.3.1. Conversation Management
```python
# Backend: Multi-Tenant Chat Service
class MVPChatService(TenantAwareService):
    async def create_conversation(self, title: str = None, user_id: str = None) -> dict:
        tenant_id = self.get_tenant_id()
        
        conversation = await self.db.conversations.create({
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "user_id": user_id,
            "title": title or f"Conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "created_at": datetime.utcnow()
        })
        
        return conversation
    
    async def chat_message(self, conversation_id: str, message: str, user_id: str) -> dict:
        tenant_id = self.get_tenant_id()
        
        # 1. Validate conversation belongs to tenant
        conversation = await self.get_conversation(conversation_id, tenant_id)
        if not conversation:
            raise HTTPException(404, "Conversation not found")
        
        # 2. Check usage quota
        await self.check_message_quota(tenant_id)
        
        # 3. Search relevant documents (tenant-scoped)
        relevant_docs = await self.search_service.search(
            query=message,
            tenant_id=tenant_id,
            top_k=5
        )
        
        # 4. Generate response with LangChain
        context = self.build_context(relevant_docs)
        response = await self.llm_chain.arun({
            "question": message,
            "context": context,
            "conversation_history": await self.get_conversation_history(conversation_id)
        })
        
        # 5. Save message pair
        await self.save_messages([
            {
                "conversation_id": conversation_id,
                "tenant_id": tenant_id,
                "role": "user",
                "content": message,
                "user_id": user_id
            },
            {
                "conversation_id": conversation_id,
                "tenant_id": tenant_id, 
                "role": "assistant",
                "content": response,
                "sources": [doc["id"] for doc in relevant_docs]
            }
        ])
        
        # 6. Log usage for billing
        await self.log_usage_event("chat_message")
        
        return {
            "message": response,
            "sources": relevant_docs,
            "conversation_id": conversation_id
        }
```

#### 2.3.2. Chat UI Components
```typescript
// Frontend: Chat Interface
components/chat/
├── ConversationList.tsx       // Sidebar with conversation history  
├── ChatInterface.tsx          // Main chat area
├── MessageBubble.tsx          // Individual message display
├── SourceCitations.tsx        // Document sources with links
└── ChatInput.tsx             // Message input with file attach

// Chat Message Types
interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: DocumentSource[]
  timestamp: Date
  user?: {
    id: string
    name: string
    avatar?: string
  }
}

interface DocumentSource {
  id: string
  title: string
  excerpt: string
  confidence_score: number
  page_number?: number
}
```

**Acceptance Criteria :**
- [x] Chat responds within 5 seconds for typical queries
- [x] Sources clickable with document highlights
- [x] Conversation history persists across sessions
- [x] Real-time typing indicators
- [x] Message export functionality (PDF/text)
- [x] Mobile-responsive chat interface

### 2.4. Billing & Subscription Management

#### 2.4.1. Stripe Integration
```python
# Backend: Billing Service  
class BillingService:
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
    
    async def create_customer(self, organization_id: str, email: str, name: str) -> str:
        """Create Stripe customer for organization"""
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={"organization_id": organization_id}
        )
        
        await self.db.organizations.update(
            organization_id,
            {"stripe_customer_id": customer.id}
        )
        
        return customer.id
    
    async def create_subscription(self, organization_id: str, price_id: str) -> dict:
        """Create subscription for organization"""
        org = await self.get_organization(organization_id)
        
        subscription = stripe.Subscription.create(
            customer=org.stripe_customer_id,
            items=[{"price": price_id}],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"]
        )
        
        await self.db.organizations.update(organization_id, {
            "subscription_id": subscription.id,
            "subscription_status": subscription.status,
            "current_plan": self.get_plan_from_price(price_id)
        })
        
        return {
            "subscription_id": subscription.id,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret
        }
    
    async def handle_webhook(self, payload: bytes, sig_header: str):
        """Handle Stripe webhooks for subscription changes"""
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        
        if event["type"] == "customer.subscription.updated":
            await self.handle_subscription_update(event["data"]["object"])
        elif event["type"] == "invoice.payment_failed":
            await self.handle_payment_failure(event["data"]["object"])
```

#### 2.4.2. Usage Tracking & Quotas
```python
# Backend: Usage Service
class UsageService(TenantAwareService):
    
    PLAN_LIMITS = {
        "free": {
            "max_documents": 10,
            "max_monthly_messages": 50,
            "max_users": 1
        },
        "pro": {
            "max_documents": 1000,
            "max_monthly_messages": 999999,  # unlimited
            "max_users": 5
        },
        "business": {
            "max_documents": 999999,  # unlimited
            "max_monthly_messages": 999999,  # unlimited  
            "max_users": 25
        }
    }
    
    async def check_quota(self, event_type: str) -> bool:
        """Check if action is within quota limits"""
        tenant = await self.get_current_tenant()
        usage = await self.get_current_usage(tenant.id)
        limits = self.PLAN_LIMITS[tenant.current_plan]
        
        if event_type == "document_upload":
            return usage.documents < limits["max_documents"]
        elif event_type == "chat_message":
            return usage.monthly_messages < limits["max_monthly_messages"]
        
        return True
    
    async def log_usage(self, event_type: str, metadata: dict = None):
        """Log usage event for billing/analytics"""
        tenant_id = self.get_tenant_id()
        
        await self.db.usage_events.create({
            "tenant_id": tenant_id,
            "event_type": event_type,
            "timestamp": datetime.utcnow(),
            "metadata": metadata
        })
        
        # Update real-time usage cache
        await self.update_usage_cache(tenant_id, event_type)
```

**Acceptance Criteria :**
- [x] Free trial starts automatically (no credit card)
- [x] Upgrade flow works smoothly (Stripe Checkout)
- [x] Quotas enforced in real-time with clear error messages
- [x] Usage visible in dashboard with progress bars
- [x] Failed payment handling with grace period
- [x] Downgrade flow preserves data but limits access

---

## 3. Features MVP Nice-to-Have (Phase 2)

### 3.1. Advanced Analytics Dashboard

#### 3.1.1. Usage Analytics
```typescript
// Frontend: Analytics Dashboard
components/analytics/
├── UsageOverview.tsx          // Monthly usage summary
├── DocumentAnalytics.tsx      // Most accessed documents  
├── ChatAnalytics.tsx          // Query patterns, response times
├── UserActivity.tsx           // Team usage patterns
└── ExportReport.tsx           // PDF/CSV export

// Metrics to Track
interface AnalyticsDashboard {
  usage: {
    documents_uploaded: number
    total_documents: number  
    messages_sent: number
    active_users: number
    storage_used_mb: number
  }
  trends: {
    daily_messages: Array<{date: string, count: number}>
    weekly_documents: Array<{week: string, count: number}>
    user_engagement: Array<{user_id: string, last_active: Date}>
  }
  performance: {
    avg_response_time: number
    search_accuracy_score: number
    user_satisfaction: number
  }
}
```

#### 3.1.2. Document Intelligence Insights
```python
# Backend: Analytics Service
class AnalyticsService(TenantAwareService):
    
    async def get_document_insights(self) -> dict:
        """Analyze document collection for insights"""
        tenant_id = self.get_tenant_id()
        
        # Most referenced documents
        popular_docs = await self.db.execute("""
            SELECT d.title, COUNT(m.id) as reference_count
            FROM documents d
            JOIN message_sources ms ON d.id = ms.document_id  
            JOIN messages m ON ms.message_id = m.id
            WHERE d.tenant_id = %s
            GROUP BY d.id
            ORDER BY reference_count DESC
            LIMIT 10
        """, [tenant_id])
        
        # Knowledge gaps (questions without good answers)
        knowledge_gaps = await self.analyze_unanswered_queries(tenant_id)
        
        # Content recommendations
        recommendations = await self.suggest_missing_content(tenant_id)
        
        return {
            "popular_documents": popular_docs,
            "knowledge_gaps": knowledge_gaps,
            "content_recommendations": recommendations
        }
    
    async def analyze_query_patterns(self) -> dict:
        """Analyze user query patterns for optimization"""
        # Query frequency analysis
        # Topic clustering
        # Success rate by query type
        # Response time analysis
        pass
```

### 3.2. Team Collaboration Features

#### 3.2.1. Shared Conversations
```typescript
// Conversation Sharing
interface SharedConversation {
  id: string
  title: string
  shared_with: Array<{
    user_id: string
    permission: 'view' | 'comment' | 'edit'
  }>
  shared_link?: {
    url: string
    expires_at?: Date
    password_protected: boolean
  }
}

// Component for sharing
const ConversationShare = ({ conversation }: {conversation: Conversation}) => {
  const [shareSettings, setShareSettings] = useState({
    internal_users: [],
    external_link: false,
    link_expires: '7d',
    require_password: false
  })
  
  return (
    <ShareDialog>
      <UserPicker users={teamMembers} onChange={setInternalUsers} />
      <LinkSharing settings={shareSettings} onChange={setShareSettings} />
      <PermissionSelector defaultPermission="view" />
    </ShareDialog>
  )
}
```

#### 3.2.2. Comments & Annotations
```python
# Backend: Comment System
class CommentService(TenantAwareService):
    
    async def add_comment(self, message_id: str, content: str, user_id: str) -> dict:
        """Add comment to a chat message"""
        tenant_id = self.get_tenant_id()
        
        comment = await self.db.comments.create({
            "id": str(uuid.uuid4()),
            "message_id": message_id,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "content": content,
            "created_at": datetime.utcnow()
        })
        
        # Notify other conversation participants
        await self.notify_comment_added(message_id, comment)
        
        return comment
    
    async def add_document_annotation(self, document_id: str, annotation: dict, user_id: str):
        """Add annotation to document section"""
        # Support for highlighting document sections
        # Comments on specific paragraphs/pages
        # Collaborative document review
        pass
```

### 3.3. Integration Ecosystem

#### 3.3.1. Slack Integration
```python
# Backend: Slack Bot Integration
from slack_bolt import App

class SlackIntegration:
    def __init__(self):
        self.app = App(token=settings.SLACK_BOT_TOKEN)
        self.setup_handlers()
    
    def setup_handlers(self):
        @self.app.command("/docuMind")
        async def docuMind_command(ack, respond, command):
            await ack()
            
            # Extract organization from Slack workspace
            tenant_id = await self.get_tenant_from_slack_team(command["team_id"])
            
            if not tenant_id:
                return await respond("Please connect your DocuMind account first: /docuMind connect")
            
            # Process query through chat service
            query = command["text"]
            response = await self.chat_service.chat_message(
                tenant_id=tenant_id,
                message=query,
                channel="slack"
            )
            
            # Format response for Slack
            blocks = self.format_slack_response(response)
            await respond(blocks=blocks)
        
        @self.app.event("file_shared")
        async def handle_file_upload(event):
            # Auto-upload documents shared in connected channels
            await self.process_slack_file_upload(event)
```

#### 3.3.2. Microsoft Teams Integration  
```typescript
// Teams Tab Application
const TeamsDocuMindTab = () => {
  const [microsoftTeams, setMicrosoftTeams] = useState<any>(null)
  
  useEffect(() => {
    // Initialize Teams SDK
    microsoftTeams.initialize()
    
    // Get Teams context (user, tenant, team info)
    microsoftTeams.getContext((context: any) => {
      setTeamsContext(context)
      authenticateWithDocuMind(context)
    })
  }, [])
  
  return (
    <TeamsThemeProvider>
      <DocuMindChatInterface 
        teamsContext={teamsContext}
        showTeamsIntegrationFeatures={true}
      />
    </TeamsThemeProvider>
  )
}
```

### 3.4. Mobile Experience

#### 3.4.1. Progressive Web App (PWA)
```typescript
// PWA Configuration
const PWAConfig = {
  name: "DocuMind - AI Document Intelligence",
  short_name: "DocuMind",
  description: "Ask questions to your documents",
  theme_color: "#2563eb",
  background_color: "#ffffff",
  display: "standalone",
  start_url: "/",
  icons: [
    {
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: "/icons/icon-512.png", 
      sizes: "512x512",
      type: "image/png"
    }
  ]
}

// Mobile-First Chat Interface
const MobileChatInterface = () => {
  return (
    <div className="h-screen flex flex-col">
      {/* Mobile Header */}
      <MobileHeader />
      
      {/* Conversation List (slide-over) */}
      <ConversationDrawer />
      
      {/* Chat Messages (main area) */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>
      
      {/* Mobile Input (fixed bottom) */}
      <MobileChatInput />
    </div>
  )
}
```

---

## 4. Technical Implementation Roadmap

### 4.1. Phase 1: Multi-Tenant Foundation (Semaines 1-4)

#### Semaine 1: Database & Auth Setup
```bash
Tasks:
□ PostgreSQL multi-tenant schema setup
□ Row-Level Security (RLS) policies implementation  
□ JWT authentication system
□ User registration/login API endpoints
□ Basic frontend auth components

Deliverables:
- Multi-tenant database working
- User can register and login
- Organization isolation verified
- Basic frontend auth flow

Testing:
- Multiple organizations isolated
- Security testing (attempt cross-tenant access)
- Auth flow end-to-end testing
```

#### Semaine 2: Document Management Migration
```bash
Tasks:
□ Tenant-aware document upload API
□ Azure Blob Storage tenant isolation
□ Document metadata multi-tenant schema
□ Frontend document upload component
□ Document list with tenant scoping

Deliverables:
- Document upload working per tenant
- Document list showing only tenant docs
- File storage properly isolated
- Upload progress indicators

Testing:
- Cross-tenant document isolation
- Large file upload handling
- Concurrent upload stress testing
```

#### Semaine 3: Chat Service Multi-Tenant
```bash
Tasks:
□ Conversation management multi-tenant
□ Message storage with tenant isolation
□ LangChain integration with tenant context
□ Frontend chat interface upgrade
□ Real-time message persistence

Deliverables:
- Chat working with tenant isolation
- Conversation history persistent
- Multiple users can chat simultaneously
- Sources properly attributed per tenant

Testing:
- Multi-user concurrent chat
- Conversation isolation between tenants
- Performance testing (response times)
```

#### Semaine 4: Usage Tracking & Quotas
```bash
Tasks:
□ Usage events logging system
□ Quota enforcement middleware
□ Plan limits configuration
□ Usage dashboard frontend
□ Quota exceeded error handling

Deliverables:
- Real-time usage tracking working
- Quotas enforced (documents, messages)
- Usage visible in dashboard
- Graceful quota exceeded handling

Testing:
- Quota limits properly enforced
- Usage tracking accuracy
- Performance impact minimal
```

### 4.2. Phase 2: Billing & Professional UI (Semaines 5-8)

#### Semaine 5: Stripe Integration
```bash
Tasks:
□ Stripe customer creation
□ Subscription management API
□ Webhook handling for subscription events
□ Payment failure handling
□ Plan upgrade/downgrade logic

Deliverables:
- Stripe payments working end-to-end
- Subscription status tracked correctly
- Failed payment recovery flow
- Plan changes reflected immediately

Testing:
- Payment flow with test cards
- Webhook reliability testing
- Edge cases (failed payments, disputes)
```

#### Semaine 6: Professional Frontend UI
```bash
Tasks:
□ Dashboard layout redesign
□ Professional component library
□ Responsive design optimization  
□ Loading states and error handling
□ User onboarding flow

Deliverables:
- Professional-looking SaaS interface
- Mobile-responsive design
- Smooth user onboarding experience
- Consistent design system

Testing:
- Cross-browser compatibility
- Mobile device testing
- User experience testing
- Accessibility compliance
```

#### Semaine 7: Team Management
```bash
Tasks:
□ User invitation system
□ Role-based access control
□ Team member management UI
□ Permission enforcement
□ User settings and profile

Deliverables:
- Admin can invite team members
- Role permissions working correctly
- Team management interface
- User profile customization

Testing:
- Permission boundaries testing
- Invitation email delivery
- User role switching scenarios
```

#### Semaine 8: Performance & Security
```bash
Tasks:
□ Database query optimization
□ Caching layer implementation (Redis)
□ Security audit and fixes
□ Performance monitoring setup
□ Error tracking (Sentry)

Deliverables:
- System performance optimized
- Security vulnerabilities addressed
- Monitoring and alerting active
- Error tracking operational

Testing:
- Load testing with multiple tenants
- Security penetration testing
- Performance regression testing
```

### 4.3. Phase 3: Polish & Launch Prep (Semaines 9-12)

#### Semaine 9: Advanced Features
```bash
Tasks:
□ Document search and filtering
□ Conversation sharing
□ Export functionality
□ Advanced chat features (follow-ups)
□ Email notifications system

Deliverables:
- Rich document management features
- Conversation sharing working
- Export options available
- Email notifications for important events

Testing:
- Feature integration testing
- Email delivery testing
- Export format validation
```

#### Semaine 10: Admin & Analytics
```bash
Tasks:
□ Admin dashboard for usage insights
□ Basic analytics implementation
□ Customer support tooling
□ Help documentation
□ FAQ and knowledge base

Deliverables:
- Admin can monitor system health
- Usage analytics available
- Customer support processes
- Self-service help content

Testing:
- Analytics accuracy validation
- Admin dashboard performance
- Help content usefulness
```

#### Semaine 11: Integrations & API
```bash
Tasks:
□ Public API documentation
□ API rate limiting and authentication
□ Slack integration (basic)
□ Webhook system for external integrations
□ Developer documentation

Deliverables:
- Public API available and documented
- Slack integration working
- Developer-friendly documentation
- Webhook system operational

Testing:
- API functionality testing
- Integration testing with Slack
- Documentation accuracy
```

#### Semaine 12: Launch Preparation
```bash
Tasks:
□ Production deployment automation
□ Backup and disaster recovery setup
□ Customer onboarding automation
□ Support ticket system
□ Launch marketing assets

Deliverables:
- Production-ready deployment
- Automated customer onboarding
- Customer support system ready
- Marketing materials prepared

Testing:
- End-to-end production testing
- Disaster recovery procedures
- Customer onboarding flow
- Support system functionality
```

---

## 5. Quality Assurance & Testing Strategy

### 5.1. Testing Framework

#### Unit Testing
```python
# Backend Unit Tests
# tests/services/test_chat_service.py
@pytest.mark.asyncio  
class TestChatService:
    async def test_chat_message_with_tenant_isolation(self):
        # Test that chat messages are isolated per tenant
        tenant1_chat = ChatService(tenant_id="tenant1")
        tenant2_chat = ChatService(tenant_id="tenant2") 
        
        # Create conversations in each tenant
        conv1 = await tenant1_chat.create_conversation("Test 1")
        conv2 = await tenant2_chat.create_conversation("Test 2")
        
        # Verify tenant1 cannot access tenant2's conversation
        with pytest.raises(HTTPException):
            await tenant1_chat.get_conversation(conv2.id)
    
    async def test_usage_quota_enforcement(self):
        # Test quota limits are properly enforced
        service = ChatService(tenant_id="free_tenant")
        
        # Set up free plan limits
        await service.set_plan_limits("free", max_messages=2)
        
        # First two messages should work
        await service.chat_message("conv1", "Question 1", "user1")
        await service.chat_message("conv1", "Question 2", "user1")
        
        # Third message should fail
        with pytest.raises(QuotaExceededException):
            await service.chat_message("conv1", "Question 3", "user1")
```

#### Integration Testing
```typescript
// Frontend Integration Tests
// tests/integration/document-upload.test.ts
describe('Document Upload Flow', () => {
  test('complete upload and chat workflow', async () => {
    // 1. Login as organization admin
    await login('admin@testorg.com', 'password123')
    
    // 2. Upload a test document
    const file = new File(['Test content'], 'test.txt', { type: 'text/plain' })
    await uploadDocument(file)
    
    // 3. Wait for processing to complete
    await waitFor(() => expect(screen.getByText('Processed')).toBeInTheDocument())
    
    // 4. Start a chat about the document
    await startNewChat()
    await sendMessage('What is the content of the uploaded document?')
    
    // 5. Verify response contains document content
    await waitFor(() => {
      expect(screen.getByText(/Test content/)).toBeInTheDocument()
    })
    
    // 6. Verify source citation is shown
    expect(screen.getByText('Source: test.txt')).toBeInTheDocument()
  })
})
```

#### End-to-End Testing
```typescript
// E2E Testing with Playwright
// tests/e2e/complete-user-journey.spec.ts
test('complete user journey from signup to paid subscription', async ({ page }) => {
  // 1. Signup flow
  await page.goto('/signup')
  await page.fill('[data-testid="company-name"]', 'Test Company')
  await page.fill('[data-testid="admin-email"]', 'admin@testcompany.com')
  await page.fill('[data-testid="password"]', 'SecurePassword123!')
  await page.click('[data-testid="signup-button"]')
  
  // 2. Email verification (mock)
  await page.goto('/verify-email?token=test-token')
  
  // 3. Onboarding flow
  await page.click('[data-testid="upload-sample-docs"]')
  await page.waitForSelector('[data-testid="upload-complete"]')
  
  // 4. First chat interaction  
  await page.fill('[data-testid="chat-input"]', 'What are the key points in my documents?')
  await page.press('[data-testid="chat-input"]', 'Enter')
  await page.waitForSelector('[data-testid="ai-response"]')
  
  // 5. Upgrade to paid plan
  await page.click('[data-testid="upgrade-to-pro"]')
  
  // Use Stripe test environment
  await page.fill('[data-testid="card-number"]', '4242424242424242')
  await page.fill('[data-testid="card-expiry"]', '12/34')
  await page.fill('[data-testid="card-cvc"]', '123')
  await page.click('[data-testid="subscribe-button"]')
  
  // 6. Verify subscription active
  await expect(page.locator('[data-testid="plan-status"]')).toContainText('Pro Plan')
})
```

### 5.2. Performance Testing

#### Load Testing Strategy
```python
# Load Testing with Locust
# tests/load/chat_load_test.py
from locust import HttpUser, task, between

class ChatUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login and get auth token
        response = self.client.post("/auth/login", json={
            "email": f"user{self.environment.stats.num_users}@test.com",
            "password": "password123"
        })
        self.token = response.json()["token"]
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})
    
    @task(3)
    def send_chat_message(self):
        """Simulate user sending chat messages"""
        self.client.post("/chat/message", json={
            "conversation_id": "test-conv",
            "message": "What is the main topic of document 1?"
        })
    
    @task(1)  
    def upload_document(self):
        """Simulate document upload"""
        with open("test_document.pdf", "rb") as f:
            self.client.post("/documents/upload", files={"file": f})

# Target Performance Goals:
# - 100 concurrent users
# - <3 second response time for chat messages
# - <10 second document processing time
# - 99.9% uptime under normal load
```

#### Database Performance Testing
```sql
-- Database Performance Queries
-- Monitor query performance under load

-- Check slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;

-- Monitor tenant isolation performance
EXPLAIN ANALYZE 
SELECT * FROM documents 
WHERE tenant_id = 'tenant-123' 
  AND created_at > NOW() - INTERVAL '30 days';

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename IN ('documents', 'messages', 'conversations');
```

---

## 6. Deployment & DevOps Setup

### 6.1. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Python
      uses: actions/setup-python@v3
      with:
        python-version: '3.11'
    
    - name: Install Backend Dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install pytest pytest-asyncio
    
    - name: Run Backend Tests
      run: |
        cd backend
        pytest tests/ -v --cov=./ --cov-report=xml
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Frontend Dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run Frontend Tests
      run: |
        cd frontend
        npm run test:ci
        npm run build
    
    - name: E2E Tests
      run: |
        npm run e2e:ci

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Azure
      run: |
        # Build and push Docker images
        docker build -t docuMind-backend ./backend
        docker build -t docuMind-frontend ./frontend
        
        # Deploy to Azure Container Apps
        az containerapp update \
          --name docuMind-backend \
          --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} \
          --image docuMind-backend:latest
        
        # Deploy frontend to Static Web Apps
        az staticwebapp deploy \
          --name docuMind-frontend \
          --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} \
          --source ./frontend/out
```

### 6.2. Production Monitoring

```python
# monitoring/health_checks.py
from fastapi import APIRouter, HTTPException
import asyncio
import time

router = APIRouter()

@router.get("/health")
async def health_check():
    """Comprehensive health check"""
    checks = {
        "database": await check_database(),
        "azure_search": await check_azure_search(),
        "azure_storage": await check_azure_storage(),  
        "openai": await check_openai(),
        "redis": await check_redis()
    }
    
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return {
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": checks,
        "timestamp": time.time()
    }

async def check_database():
    """Check database connectivity and performance"""
    try:
        start = time.time()
        await db.execute("SELECT 1")
        response_time = time.time() - start
        return {
            "status": "ok",
            "response_time_ms": response_time * 1000
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

REQUEST_COUNT = Counter('requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('request_duration_seconds', 'Request duration')
ACTIVE_USERS = Gauge('active_users_total', 'Active users', ['tenant_id'])
```

Cette roadmap détaillée fournit un plan complet pour transformer votre MVP RAG en SaaS multi-tenant professionnel prêt pour les premiers clients payants en 12 semaines.