import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './usability.css'
import './v150.css'
import './tripPerformance.css'
import './scrollPerformance.css'
import './settings.css'
import './decodings.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
