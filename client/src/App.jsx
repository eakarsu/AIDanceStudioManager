import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ClassesPage from './pages/ClassesPage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import StudiosPage from './pages/StudiosPage';
import SchedulesPage from './pages/SchedulesPage';
import EnrollmentPage from './pages/EnrollmentPage';
import AttendancePage from './pages/AttendancePage';
import RecitalsPage from './pages/RecitalsPage';
import CompetitionsPage from './pages/CompetitionsPage';
import CostumesPage from './pages/CostumesPage';
import BillingPage from './pages/BillingPage';
import FamiliesPage from './pages/FamiliesPage';
import AIFeaturesPage from './pages/AIFeaturesPage';
import TicketsPage from './pages/TicketsPage';
import MerchandisePage from './pages/MerchandisePage';
import VolunteersPage from './pages/VolunteersPage';
import PropsPage from './pages/PropsPage';
import MusicPage from './pages/MusicPage';
import AchievementsPage from './pages/AchievementsPage';
import MeasurementsPage from './pages/MeasurementsPage';
import VideosPage from './pages/VideosPage';
import PhotosPage from './pages/PhotosPage';
import WaitlistPage from './pages/WaitlistPage';
import TrialClassesPage from './pages/TrialClassesPage';
import SummerIntensivesPage from './pages/SummerIntensivesPage';
import MakeupClassesPage from './pages/MakeupClassesPage';
import FinancialReportsPage from './pages/FinancialReportsPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><ClassesPage /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
      <Route path="/teachers" element={<ProtectedRoute><TeachersPage /></ProtectedRoute>} />
      <Route path="/studios" element={<ProtectedRoute><StudiosPage /></ProtectedRoute>} />
      <Route path="/schedules" element={<ProtectedRoute><SchedulesPage /></ProtectedRoute>} />
      <Route path="/enrollment" element={<ProtectedRoute><EnrollmentPage /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
      <Route path="/recitals" element={<ProtectedRoute><RecitalsPage /></ProtectedRoute>} />
      <Route path="/competitions" element={<ProtectedRoute><CompetitionsPage /></ProtectedRoute>} />
      <Route path="/costumes" element={<ProtectedRoute><CostumesPage /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
      <Route path="/families" element={<ProtectedRoute><FamiliesPage /></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute><AIFeaturesPage /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
      <Route path="/merchandise" element={<ProtectedRoute><MerchandisePage /></ProtectedRoute>} />
      <Route path="/volunteers" element={<ProtectedRoute><VolunteersPage /></ProtectedRoute>} />
      <Route path="/props" element={<ProtectedRoute><PropsPage /></ProtectedRoute>} />
      <Route path="/music" element={<ProtectedRoute><MusicPage /></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
      <Route path="/measurements" element={<ProtectedRoute><MeasurementsPage /></ProtectedRoute>} />
      <Route path="/videos" element={<ProtectedRoute><VideosPage /></ProtectedRoute>} />
      <Route path="/photos" element={<ProtectedRoute><PhotosPage /></ProtectedRoute>} />
      <Route path="/waitlist" element={<ProtectedRoute><WaitlistPage /></ProtectedRoute>} />
      <Route path="/trial-classes" element={<ProtectedRoute><TrialClassesPage /></ProtectedRoute>} />
      <Route path="/summer-intensives" element={<ProtectedRoute><SummerIntensivesPage /></ProtectedRoute>} />
      <Route path="/makeup-classes" element={<ProtectedRoute><MakeupClassesPage /></ProtectedRoute>} />
      <Route path="/financial-reports" element={<ProtectedRoute><FinancialReportsPage /></ProtectedRoute>} />
    </Routes>
  );
}
