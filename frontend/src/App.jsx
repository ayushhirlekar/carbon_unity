import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import Navbar from './components/layout/Navbar';
import DashboardLayout from './components/layout/DashboardLayout';
import AuthGuard from './components/auth/AuthGuard';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import MarketplacePage from './pages/MarketplacePage';
import ListingDetailPage from './pages/ListingDetailPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateProjectPage from './pages/admin/CreateProjectPage';
import ProjectsPage from './pages/admin/ProjectsPage';
import ProjectDetailPage from './pages/admin/ProjectDetailPage';
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import PurchaseHistoryPage from './pages/buyer/PurchaseHistoryPage';
import FarmerLayout from './components/farmer/FarmerLayout';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import MyParcelsPage from './pages/farmer/MyParcelsPage';
import FarmerPlaceholder from './pages/farmer/FarmerPlaceholder';
import FarmerProjectPage from './pages/farmer/FarmerProjectPage';
import SoilCardPage from './pages/farmer/SoilCardPage';
import AssistantPage from './pages/farmer/AssistantPage';
import AlertsPage from './pages/farmer/AlertsPage';
import ProjectsHostPage from './pages/admin/ProjectsHostPage';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isFarmerRoute = location.pathname.startsWith('/farmer');

  return (
    <>
      {!isFarmerRoute && <Navbar />}
      <div className={!isFarmerRoute ? "pt-16" : ""}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Public Marketplace (no auth required) */}
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:id" element={<ListingDetailPage />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AuthGuard requiredRole="admin">
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="create-project" element={<CreateProjectPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="carbon-projects" element={<ProjectsHostPage />} />
            <Route path="projects/:farm_id" element={<ProjectDetailPage />} />
          </Route>

          {/* Buyer Routes */}
          <Route
            path="/buyer"
            element={
              <AuthGuard requiredRole="buyer">
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route index element={<BuyerDashboard />} />
            <Route path="purchases" element={<PurchaseHistoryPage />} />
          </Route>

          {/* Farmer Routes — own layout: bottom tabs on phones,
              top nav from md up. Not DashboardLayout, which is
              admin/buyer chrome. */}
          <Route
            path="/farmer"
            element={
              <AuthGuard requiredRole="farmer">
                <FarmerLayout />
              </AuthGuard>
            }
          >
            <Route index element={<FarmerDashboard />} />
            <Route path="parcels" element={<MyParcelsPage />} />
            <Route path="soil-card" element={<SoilCardPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="project" element={<FarmerProjectPage />} />
            <Route
              path="profile"
              element={
                <FarmerPlaceholder
                  title="You"
                  body="Profile and earnings are being built. Your farmer code is shown on the home screen."
                />
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </Web3Provider>
    </BrowserRouter>
  );
}
