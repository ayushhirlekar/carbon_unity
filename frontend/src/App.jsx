import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <>
      <Navbar />
      <div className="pt-16">
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
