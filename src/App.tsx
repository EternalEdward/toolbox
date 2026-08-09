import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'

const CompressPage = lazy(() => import('./pages/CompressPage'))
const ConvertPage = lazy(() => import('./pages/ConvertPage'))
const PdfPage = lazy(() => import('./pages/PdfPage'))
const RemoveBgPage = lazy(() => import('./pages/RemoveBgPage'))
const ScanPage = lazy(() => import('./pages/ScanPage'))

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-gray-400 text-lg animate-pulse">加载中…</div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/compress" element={<CompressPage />} />
            <Route path="/convert" element={<ConvertPage />} />
            <Route path="/pdf" element={<PdfPage />} />
            <Route path="/remove-bg" element={<RemoveBgPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
