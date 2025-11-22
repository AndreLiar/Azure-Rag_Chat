'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ragchat12481-backend.gentlecoast-36ec39ac.westeurope.azurecontainerapps.io'

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      // Set default axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)

      const response = await axios.post(`${backendUrl}/auth/login`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const { access_token } = response.data
      
      // Decode JWT to get user info (basic client-side decode for display only)
      const payload = JSON.parse(atob(access_token.split('.')[1]))
      const userData = {
        id: payload.sub,
        email: payload.sub,
        role: 'user' // Default role, you might want to include this in the JWT
      }

      setToken(access_token)
      setUser(userData)
      
      // Store in localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      // Set default axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${backendUrl}/auth/register`, {
        email,
        password,
        name
      })

      const { access_token } = response.data
      
      // Decode JWT to get user info
      const payload = JSON.parse(atob(access_token.split('.')[1]))
      const userData = {
        id: payload.sub,
        email: payload.sub,
        role: 'admin' // First user becomes admin
      }

      setToken(access_token)
      setUser(userData)
      
      // Store in localStorage
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      // Set default axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      return true
    } catch (error) {
      console.error('Registration error:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}