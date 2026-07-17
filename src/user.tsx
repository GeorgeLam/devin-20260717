import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export const USERS = [
  { id: 'demo-user', name: 'Demo User' },
  { id: 'sarah.chen', name: 'Sarah Chen' },
  { id: 'james.wright', name: 'James Wright' },
  { id: 'priya.patel', name: 'Priya Patel' },
  { id: 'michael.brown', name: 'Michael Brown' },
]

interface UserContextValue {
  currentUser: string
  setCurrentUser: (user: string) => void
}

const UserContext = createContext<UserContextValue>({
  currentUser: 'demo-user',
  setCurrentUser: () => {},
})

export const STORAGE_KEY = 'novaops-current-user'

export function getCurrentUser(): string {
  return localStorage.getItem(STORAGE_KEY) || 'demo-user'
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'demo-user'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentUser)
  }, [currentUser])

  return <UserContext.Provider value={{ currentUser, setCurrentUser }}>{children}</UserContext.Provider>
}

export function useCurrentUser(): UserContextValue {
  return useContext(UserContext)
}

export function initialsFromName(name: string): string {
  const id = name.toLowerCase()
  const parts = id.split(/[.\-_\s]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
