'use client'

import { useState, useEffect } from 'react'
import { Upload, File, Trash2, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import axios from 'axios'

interface Document {
  id: string
  title: string
  source: string
}

interface DocumentUploadProps {
  onDocumentUploaded: () => void
  refreshKey: number
}

export default function DocumentUpload({ onDocumentUploaded, refreshKey }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [refreshKey])

  const fetchDocuments = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ragchat12481-backend.gentlecoast-36ec39ac.westeurope.azurecontainerapps.io'
      const response = await axios.get(`${backendUrl}/documents`)
      setDocuments(response.data.documents)
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    setUploadStatus(null)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ragchat12481-backend.gentlecoast-36ec39ac.westeurope.azurecontainerapps.io'
      await axios.post(`${backendUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setUploadStatus({
        type: 'success',
        message: `${file.name} uploaded successfully!`
      })
      
      onDocumentUploaded()
      fetchDocuments()
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadStatus({
        type: 'error',
        message: `Error uploading ${file.name}. Please try again.`
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
  }

  const deleteDocument = async (documentId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ragchat12481-backend.gentlecoast-36ec39ac.westeurope.azurecontainerapps.io'
      await axios.delete(`${backendUrl}/documents/${documentId}`)
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'txt':
        return <FileText className="h-4 w-4 text-gray-600" />
      case 'csv':
        return <FileText className="h-4 w-4 text-green-600" />
      default:
        return <File className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      {/* Upload Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h3>
        
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supports PDF, DOCX, TXT, CSV
          </p>
          
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.csv"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {/* Upload Status */}
        {uploadStatus && (
          <div className={`mt-3 p-3 rounded-lg flex items-center space-x-2 ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <p className="text-sm">{uploadStatus.message}</p>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Your Documents ({documents.length})
        </h3>
        
        {documents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No documents uploaded yet</p>
            <p className="text-sm">Upload documents to start chatting</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getFileIcon(doc.title)}
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500">{doc.source}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              How it works
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Upload your documents (PDF, DOCX, TXT, CSV)</li>
                <li>Documents are processed and indexed</li>
                <li>Ask questions and get AI-powered answers</li>
                <li>Answers include relevant source citations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}