import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuthGuard({ children, requiredRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#639922] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to the correct dashboard
    const redirectPath = user?.role === 'admin' ? '/admin' : '/buyer';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
