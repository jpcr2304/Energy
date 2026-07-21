import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

import './index.css'
import EnergyDashboardHomepage from './HomePage/HomePage'
import Auth from './AuthPage/AuthPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EnergyDashboardHomepage />} />

        <Route
          path="/home"
          element={<EnergyDashboardHomepage />}
        />
        <Route
          path="/login"
          element={<Auth />}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)