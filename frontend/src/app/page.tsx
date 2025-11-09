'use client'

import ChatInterface from '@/components/ChatInterface'
import DocumentUpload from '@/components/DocumentUpload'
import { useState } from 'react'

export default function Home() {
  const [refreshDocuments, setRefreshDocuments] = useState(0)

  const handleDocumentUploaded = () => {
    setRefreshDocuments(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              RAG Chat Assistant
            </h1>
            <p className="text-gray-600 mt-1">
              Upload documents and chat with your data using AI
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Document Upload Sidebar */}
          <div className="lg:col-span-1">
            <DocumentUpload 
              onDocumentUploaded={handleDocumentUploaded}
              refreshKey={refreshDocuments}
            />
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  )
}