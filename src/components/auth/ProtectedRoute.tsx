import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserType } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: UserType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredUserType 
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Se o usuário existe mas o profile ainda está carregando, aguarda
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando perfil...</span>
        </div>
      </div>
    );
  }

  if (requiredUserType && profile.user_type !== requiredUserType) {
    // Redirect to correct panel based on user type
    const correctPath = profile.user_type === 'matriz' ? '/dashboard' : '/unidade';
    return <Navigate to={correctPath} replace />;
  }

  return <>{children}</>;
};