import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import Home from './pages/marketing/Home.jsx';
import Services from './pages/marketing/Services.jsx';
import ServiceDetail from './pages/marketing/ServiceDetail.jsx';
import About from './pages/marketing/About.jsx';
import Fleet from './pages/marketing/Fleet.jsx';
import Contact from './pages/marketing/Contact.jsx';
import Careers from './pages/marketing/Careers.jsx';
import Reservations from './pages/passenger/Reservations.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import SocialCallback from './pages/SocialCallback.jsx';
import RideHistory from './pages/passenger/RideHistory.jsx';
import RideTracking from './pages/passenger/RideTracking.jsx';
import DriverDashboard from './pages/driver/Dashboard.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import { Spinner } from './components/ui/Spinner.jsx';
import VerifyEmailBanner from './components/auth/VerifyEmailBanner.jsx';

const RequireRole = ({ role, children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <VerifyEmailBanner />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/auth/social" element={<SocialCallback />} />

          <Route
            path="/rides/history"
            element={
              <RequireRole role="passenger">
                <RideHistory />
              </RequireRole>
            }
          />
          <Route
            path="/rides/track/:id"
            element={
              <RequireRole role="passenger">
                <RideTracking />
              </RequireRole>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireRole>
                <Profile />
              </RequireRole>
            }
          />

          <Route
            path="/driver"
            element={
              <RequireRole role="driver">
                <DriverDashboard />
              </RequireRole>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}