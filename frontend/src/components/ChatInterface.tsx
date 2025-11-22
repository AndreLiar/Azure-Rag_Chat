'use client'

import { useState, useEffect } from 'react'
import { Send, MessageSquare, Bot, User, BookOpen, Clock } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  sources?: Array<{
    title: string
    content: string
    source: string
    score: number
  }>
}

interface ChatResponse {
  response: string
  conversation_id: string
  sources: Array<{
    title: string
    content: string
    source: string
    score: number
  }>
}

interface ChatInterfaceProps {
  currentConversationId?: string | null
  onConversationCreated?: (conversationId: string) => void
}

export default function ChatInterface({ currentConversationId, onConversationCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [conversationTitle, setConversationTitle] = useState<string>('')
  const { token } = useAuth()

  // Load conversation when currentConversationId changes
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId)
    } else {
      setMessages([])
      setConversationTitle('')
    }
  }, [currentConversationId])

  const loadConversation = async (conversationId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ragchat12481-backend.gentlecoast-36ec39ac.westeurope.azurecontainerapps.io'
      const response = await axios.get(`${backendUrl}/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const conversation = response.data.conversation
      setConversationTitle(conversation.title)
      setMessages(conversation.messages || [])
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      
      if (diffInMinutes < 1) {
        return 'Just now'
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`
      } else if (diffInMinutes < 1440) { // 24 hours
        const hours = Math.floor(diffInMinutes / 60)
        return `${hours}h ago`
      } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    } catch {
      return ''
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(false)
    setIsLoading(true)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ragchat12481-backend.gentlecoast-36ec39ac.westeurope.azurecontainerapps.io'
      const response = await axios.post<ChatResponse>(`${backendUrl}/chat`, {
        message: input,
        conversation_id: currentConversationId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        sources: response.data.sources
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Notify parent about new conversation creation
      if (!currentConversationId && onConversationCreated) {
        onConversationCreated(response.data.conversation_id)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    
    // Show typing indicator when user starts typing
    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true)
    } else if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">FineDocChat</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">
              {currentConversationId ? 'Continue the conversation' : 'Start a conversation'}
            </p>
            <p className="text-sm">Upload documents and ask questions about them</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id || index} className="space-y-2">
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-3xl ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.created_at && (
                      <div className={`flex items-center space-x-1 mt-2 text-xs ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <Clock className="h-3 w-3" />
                        <span>{formatMessageTime(message.created_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="ml-10 space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <BookOpen className="h-4 w-4" />
                    <span>Sources:</span>
                  </div>
                  <div className="space-y-2">
                    {message.sources.map((source, idx) => (
                      <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-blue-900">{source.title}</h4>
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Score: {(source.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-sm text-blue-800">{source.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {(isLoading || isTyping) && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-xs text-gray-600">
                    {isLoading ? 'Thinking...' : 'You are typing...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
            style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}