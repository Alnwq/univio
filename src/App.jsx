import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import CourseDetail from './pages/CourseDetail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/feed" element={<Dashboard />} />
        <Route path="/courses" element={<Dashboard />} />
        <Route path="/course/:courseCode" element={<CourseDetail />} />
        <Route path="/map" element={<Dashboard />} />
        <Route path="/people" element={<Dashboard />} />
        <Route path="/groups" element={<Dashboard />} />
        <Route path="/profile" element={<Dashboard />} />
        <Route path="/supervisor" element={<SupervisorDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
