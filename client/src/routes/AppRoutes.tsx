import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '../containers/HomePage/HomePage'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}