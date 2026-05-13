import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { storage } from '@/utils/storage';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated && !storage.getAccessToken()) {
    const nextPath = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
