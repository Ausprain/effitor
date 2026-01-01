import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/main.css'
import './i18n'
import { NavbarProvider } from './context/NavbarContext'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <NavbarProvider>
        <App />
      </NavbarProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
