'use client'

import { useAuth } from '@/contexts/AuthContext'
import AuthForm from '@/components/AuthForm'
import ChatInterface from '@/components/ChatInterface'
import DocumentUpload from '@/components/DocumentUpload'
import ConversationSidebar from '@/components/ConversationSidebar'
import { useState } from 'react'
import { LogOut, User } from 'lucide-react'

export default function ProtectedApp() {
  const { user, logout, loading } = useAuth()
  const [refreshDocuments, setRefreshDocuments] = useState(0)
  const [refreshConversations, setRefreshConversations] = useState(0)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  const handleDocumentUploaded = () => {
    setRefreshDocuments(prev => prev + 1)
  }

  const handleConversationSelect = (conversationId: string | null) => {
    setCurrentConversationId(conversationId)
  }

  const handleNewConversation = () => {
    setCurrentConversationId(null)
  }

  const handleConversationCreated = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    setRefreshConversations(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                FineDocChat
              </h1>
              <p className="text-gray-600 mt-1">
                Upload documents and chat with your data using AI
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <User className="h-4 w-4" />
                <span className="text-sm">{user.email}</span>
              </div>
              
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Conversation Sidebar */}
        <div className="w-80 border-r border-gray-200">
          <ConversationSidebar
            currentConversationId={currentConversationId}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            refreshKey={refreshConversations}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Chat Interface */}
          <div className="flex-1">
            <ChatInterface
              currentConversationId={currentConversationId}
              onConversationCreated={handleConversationCreated}
            />
          </div>

          {/* Document Upload Sidebar */}
          <div className="w-80 border-l border-gray-200">
            <DocumentUpload 
              onDocumentUploaded={handleDocumentUploaded}
              refreshKey={refreshDocuments}
            />
          </div>
        </div>
      </main>
    </div>
  )
}