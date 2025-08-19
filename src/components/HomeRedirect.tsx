import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function HomeRedirect() {
  const [userCanApprove, setUserCanApprove] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkUserPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get current session
        const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
        
        if (!session) {
          console.log('🔄 No session found, trying refresh...');
          const { data: refreshData } = await (await import('../lib/supabase')).supabase.auth.refreshSession();
          
          if (!refreshData?.session) {
            setLoading(false);
            return;
          }
          
          // Use refreshed session
          const freshSession = refreshData.session;
          const headers = {
            'Authorization': `Bearer ${freshSession.access_token}`,
            'Content-Type': 'application/json',
          };

          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
          const response = await fetch(apiUrl, { headers });
          
          if (response.ok) {
            const userData = await response.json();
            setUserCanApprove(userData.pode_aprovar || false);
          } else {
            setUserCanApprove(false);
          }
        } else {
          // Use existing session
          const headers = {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          };

          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
          const response = await fetch(apiUrl, { headers });
          
          if (response.ok) {
            const userData = await response.json();
            setUserCanApprove(userData.pode_aprovar || false);
          } else {
            setUserCanApprove(false);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar permissões:', err);
        setUserCanApprove(false);
      } finally {
        setLoading(false);
      }
    }
    checkUserPermissions();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to approval page if user can approve, otherwise to kanban
  return <Navigate to="/kanban" replace />;
}