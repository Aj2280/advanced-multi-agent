import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
)
