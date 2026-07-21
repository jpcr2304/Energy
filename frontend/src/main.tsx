import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

import './index.css'
import EnergyDashboardHomepage from './HomePage/HomePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EnergyDashboardHomepage />} />

        <Route
          path="/home"
          element={<EnergyDashboardHomepage />}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)