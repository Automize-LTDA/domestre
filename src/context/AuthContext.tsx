import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  role: 'admin' | 'member' | 'promotor' | null
  cargo: string | null
  fullName: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ cargo: string | null } | void>
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<'admin' | 'member' | 'promotor' | null>(null)
  const [cargo, setCargo] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  async function fetchUserRoleAndProfile(userId: string) {
    try {
      if (userId === '00000000-0000-0000-0000-000000000000' || userId === '11111111-1111-1111-1111-111111111111') {
        setRole('admin')
        setCargo('admin')
        setFullName(userId === '11111111-1111-1111-1111-111111111111' ? 'Kaua' : 'Administrador')
        return
      }

      const [roleRes, profileRes, usuarioRes] = await Promise.all([
        supabase.rpc('get_user_role', { _user_id: userId }),
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.from('usuarios').select('cargo, status').eq('id', userId).maybeSingle()
      ])
      
      setRole((roleRes.data as 'admin' | 'member' | 'promotor') || 'member')
      setFullName(profileRes.data?.full_name || null)

      if (usuarioRes.data) {
        const { cargo: userCargo, status } = usuarioRes.data
        if (status === 'bloqueado') {
          await signOut()
          alert('Seu acesso foi bloqueado. Entre em contato com o administrador.')
          return
        }

        setCargo(userCargo)

        if (status === 'ativo') {
          if (userCargo === 'admin' || userCargo === 'gestor' || userCargo === 'sup_tecnico') {
            if (window.location.pathname !== '/login') {
              let dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard-mestre.vercel.app/login'
              if (window.location.hostname !== 'localhost' && dashboardUrl.includes('localhost')) {
                dashboardUrl = 'https://dashboard-mestre.vercel.app/login'
              }
              
              // Validate redirect URL host to prevent Open Redirect
              try {
                const urlObj = new URL(dashboardUrl)
                const allowedDomains = ['dashboard-mestre.vercel.app', 'localhost', '127.0.0.1']
                const isAllowed = allowedDomains.includes(urlObj.hostname) || urlObj.hostname.endsWith('.vercel.app')
                if (!isAllowed) {
                  dashboardUrl = 'https://dashboard-mestre.vercel.app/login'
                }
              } catch (e) {
                if (!dashboardUrl.startsWith('/') && !dashboardUrl.startsWith('.')) {
                  dashboardUrl = 'https://dashboard-mestre.vercel.app/login'
                }
              }

              const mockSession = localStorage.getItem('domestre.mock_session')
              
              // Obter sessão atual para realizar o SSO
              const { data: { session: currentSession } } = await supabase.auth.getSession()
              let finalUrl = dashboardUrl
              
              const isProd = window.location.hostname === 'dashboard-mestre.vercel.app'
              if (mockSession && !isProd) {
                finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'mock=true'
              } else if (currentSession) {
                finalUrl += `#access_token=${currentSession.access_token}&refresh_token=${currentSession.refresh_token}`
              }
              window.location.href = finalUrl
            }
            return
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user roles and profile:', err)
      setRole('member')
      setCargo(null)
      setFullName(null)
    }
  }

  useEffect(() => {
    // Check if there is a mock session first (only if not on production)
    const isProd = window.location.hostname === 'dashboard-mestre.vercel.app'
    const savedMock = localStorage.getItem('domestre.mock_session')
    if (savedMock && isProd) {
      localStorage.removeItem('domestre.mock_session')
    } else if (savedMock) {
      const parsed = JSON.parse(savedMock)
      setUser(parsed)
      setRole('admin')
      setFullName('Administrador')
      setLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const isProdNow = window.location.hostname === 'dashboard-mestre.vercel.app'
      if (localStorage.getItem('domestre.mock_session') && !isProdNow) {
        return
      }
      setSession(newSession)
      setUser(newSession?.user || null)
      
      if (newSession?.user) {
        setTimeout(() => fetchUserRoleAndProfile(newSession.user.id), 0)
      } else {
        setRole(null)
        setFullName(null)
      }
    })

    // Get current session on load if no mock session
    if (!savedMock) {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        setSession(currentSession)
        setUser(currentSession?.user || null)
        
        if (currentSession?.user) {
          fetchUserRoleAndProfile(currentSession.user.id).finally(() => {
            setLoading(false)
          })
        } else {
          setLoading(false)
        }
      }).catch(() => {
        setLoading(false)
      })
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<{ cargo: string | null } | void> {
    const cleanEmail = email.trim().toLowerCase()
    const isProd = window.location.hostname === 'dashboard-mestre.vercel.app'
    if (!isProd && (cleanEmail === 'admin' || cleanEmail === 'admin@domestre.com') && password === '123') {
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'admin@domestre.com',
        user_metadata: { full_name: 'Administrador' }
      } as any
      setUser(mockUser)
      setRole('admin')
      setCargo('admin')
      setFullName('Administrador')
      localStorage.setItem('domestre.mock_session', JSON.stringify(mockUser))
      return { cargo: 'admin' }
    }

    if (!isProd && (cleanEmail === 'kaua' || cleanEmail === 'kaua@domestre.com') && password === 'dev@2026') {
      const mockUser = {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'kaua@domestre.com',
        user_metadata: { full_name: 'Kaua' }
      } as any
      setUser(mockUser)
      setRole('admin')
      setCargo('admin')
      setFullName('Kaua')
      localStorage.setItem('domestre.mock_session', JSON.stringify(mockUser))
      return { cargo: 'admin' }
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    if (authData?.user) {
      const { data: usuarioData, error: usuarioErr } = await supabase
        .from('usuarios')
        .select('cargo, status')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (usuarioErr) {
        console.error('Error fetching user details on signin:', usuarioErr)
      }

      if (usuarioData) {
        const { cargo: userCargo, status } = usuarioData
        if (status === 'bloqueado') {
          await supabase.auth.signOut()
          throw new Error('Seu acesso foi bloqueado. Entre em contato com o administrador.')
        }

        if (status === 'ativo') {
          return { cargo: userCargo }
        }
      }
      return { cargo: null }
    }
  }

  async function signOut() {
    localStorage.removeItem('domestre.mock_session')
    setUser(null)
    setRole(null)
    setCargo(null)
    setFullName(null)
    setSession(null)
    try {
      await supabase.auth.signOut()
    } catch (e) {
      // Ignore sign out errors if already offline
    }
  }

  async function refreshRole() {
    if (user) {
      await fetchUserRoleAndProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        cargo,
        fullName,
        loading,
        signIn,
        signOut,
        refreshRole
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
