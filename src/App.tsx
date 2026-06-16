import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CemeteryMap from './pages/CemeteryMap'
import PlotSales from './pages/PlotSales'
import BurialRegistration from './pages/BurialRegistration'
import SacrificeBooking from './pages/SacrificeBooking'
import GreenMaintenance from './pages/GreenMaintenance'
import CustomerService from './pages/CustomerService'
import FeeManagement from './pages/FeeManagement'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cemetery-map" element={<CemeteryMap />} />
          <Route path="/plot-sales" element={<PlotSales />} />
          <Route path="/burial-registration" element={<BurialRegistration />} />
          <Route path="/sacrifice-booking" element={<SacrificeBooking />} />
          <Route path="/green-maintenance" element={<GreenMaintenance />} />
          <Route path="/customer-service" element={<CustomerService />} />
          <Route path="/fee-management" element={<FeeManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
