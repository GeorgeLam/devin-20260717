import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './user.tsx'
import { ThemeProvider } from './theme.tsx'
import { ToastProvider } from './toast.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <UserProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </UserProvider>
    </ThemeProvider>
  </StrictMode>,
)
