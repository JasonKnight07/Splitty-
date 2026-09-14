import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { useApp } from './context/AppContext'
import Home from './pages/Home'
import Scan from './pages/Scan'
import SplitBill from './pages/SplitBill'
import Receipts from './pages/Receipts'
import ReceiptDetail from './pages/ReceiptDetail'
import Settings from './pages/Settings'

export default function App() {
  const { loading } = useApp()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-50">
        <div className="animate-pulse text-2xl font-extrabold text-brand-700">Splitty</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/bill/:id" element={<SplitBill />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/receipts/:id" element={<ReceiptDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
