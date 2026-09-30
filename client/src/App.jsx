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
import useIsPhone from './hooks/useIsPhone.js';
import MobileShell from './components/mobile/MobileShell.jsx';
import MobileHome from './pages/mobile/MobileHome.jsx';
import MobileBook from './pages/mobile/MobileBook.jsx';
import MobileTrips from './pages/mobile/MobileTrips.jsx';
import MobileProfile from './pages/mobile/MobileProfile.jsx';
import MobileTrack from './pages/mobile/MobileTrack.jsx';

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
  // Phones get a native-style shell (slim app bar + bottom tab bar) and the
  // dedicated mobile screens. Tablets and desktop keep the site layout below.
  const isPhone = useIsPhone();

  const page = (mobile, desktop) => (isPhone ? mobile : desktop);

  const shell = (children) => (isPhone ? <MobileShell>{children}</MobileShell> : children);

  return (
    <div className="flex min-h-screen flex-col">
      {!isPhone && <Navbar />}
      <VerifyEmailBanner />
      <main className={isPhone ? '' : 'flex-1'}>
        <Routes>
          <Route path="/" element={shell(page(<MobileHome />, <Home />))} />
          {/* Marketing + auth pages keep their existing layouts; on a phone they
              just lose the desktop navbar/footer and gain the app bar + tab bar. */}
          <Route path="/about" element={shell(<About />)} />
          <Route path="/services" element={shell(<Services />)} />
          <Route path="/services/:slug" element={shell(<ServiceDetail />)} />
          <Route path="/fleet" element={shell(<Fleet />)} />
          <Route path="/contact" element={shell(<Contact />)} />
          <Route path="/careers" element={shell(<Careers />)} />
          <Route path="/reservations" element={shell(page(<MobileBook />, <Reservations />))} />
          <Route path="/login" element={shell(<Login />)} />
          <Route path="/register" element={shell(<Register />)} />
          <Route path="/forgot-password" element={shell(<ForgotPassword />)} />
          <Route path="/reset-password" element={shell(<ResetPassword />)} />
          <Route path="/verify-email" element={shell(<VerifyEmail />)} />
          <Route path="/auth/social" element={shell(<SocialCallback />)} />

          <Route
            path="/rides/history"
            element={
              <RequireRole role="passenger">
                {shell(page(<MobileTrips />, <RideHistory />))}
              </RequireRole>
            }
          />
          <Route
            path="/rides/track/:id"
            element={
              <RequireRole role="passenger">
                {shell(page(<MobileTrack />, <RideTracking />))}
              </RequireRole>
            }
          />

          <Route
            path="/profile"
            element={
              <RequireRole>
                {shell(page(<MobileProfile />, <Profile />))}
              </RequireRole>
            }
          />

          <Route
            path="/driver"
            element={
              <RequireRole role="driver">
                {shell(<DriverDashboard />)}
              </RequireRole>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                {shell(<AdminDashboard />)}
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isPhone && <Footer />}
    </div>
  );
}