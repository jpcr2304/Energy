import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

import './index.css'

import AuthPage from './AuthPage/AuthPage'
import EnergyDashboardHomepage from './HomePage/HomePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />

        <Route
          path="/home"
          element={<EnergyDashboardHomepage />}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)