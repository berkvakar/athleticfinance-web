import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './api/aws-config' // Initialize AWS Amplify
import App from './App.jsx'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
