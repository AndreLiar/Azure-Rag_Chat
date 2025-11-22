'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Search, Trash2, Edit3, Clock } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'

interface Conversation {
  id: string
  title: string
  created_at: string
}

interface ConversationSidebarProps {
  currentConversationId?: string
  onConversationSelect: (conversationId: string | null) => void
  onNewConversation: () => void
  refreshKey: number
}

export default function ConversationSidebar({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  refreshKey
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const { token } = useAuth()
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ragchat12481-backend.gentlecoast-36ec39ac.westeurope.azurecontainerapps.io'

  useEffect(() => {
    fetchConversations()
  }, [refreshKey])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${backendUrl}/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      setConversations(response.data.conversations || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewConversation = async () => {
    try {
      await axios.post(`${backendUrl}/conversations`, null, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      onNewConversation()
      fetchConversations()
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return
    }

    try {
      await axios.delete(`${backendUrl}/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (currentConversationId === conversationId) {
        onConversationSelect(null)
      }
      
      fetchConversations()
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const handleEditTitle = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(conversation.id)
    setEditTitle(conversation.title)
  }

  const handleSaveTitle = async (conversationId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      await axios.put(`${backendUrl}/conversations/${conversationId}`, {
        title: editTitle
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      setEditingId(null)
      fetchConversations()
    } catch (error) {
      console.error('Error updating conversation title:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, conversationId: string) => {
    if (e.key === 'Enter') {
      handleSaveTitle(conversationId)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      
      if (days === 0) {
        return 'Today'
      } else if (days === 1) {
        return 'Yesterday'
      } else if (days < 7) {
        return `${days} days ago`
      } else {
        return date.toLocaleDateString()
      }
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchTerm && (
              <p className="text-xs text-gray-400 mt-1">
                Start a new chat to begin
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`group cursor-pointer rounded-lg p-3 hover:bg-gray-50 transition-colors ${
                  currentConversationId === conversation.id ? 'bg-blue-50 border border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, conversation.id)}
                        onBlur={() => handleSaveTitle(conversation.id)}
                        className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.title}
                        </p>
                        <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(conversation.created_at)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditTitle(conversation, e)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Edit title"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}