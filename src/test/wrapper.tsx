import { ReactNode } from 'react'
import { UserProvider } from '../user'
import { ThemeProvider } from '../theme'
import { ToastProvider } from '../toast'

export function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <UserProvider>
        <ToastProvider>{children}</ToastProvider>
      </UserProvider>
    </ThemeProvider>
  )
}
