import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper para garantir números válidos
const safeNum = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function useOrdens() {
  const [ordens, setOrdens] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCanViewAll, setUserCanViewAll] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const checkUserPermissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        };

        const response = await fetch(`${apiUrl}/api`, { headers });
        
        if (response.ok) {
          const userData = await response.json();
          setUserCanViewAll(userData.pode_ver_todas_os || false);
          setCurrentUserId(userData.id);
          // console.log('👁️ User visibility permissions:', {
          //   pode_ver_todas_os: userData.pode_ver_todas_os,
          //   user_id: userData.id
          // });
        }
      } catch (err) {
        console.error('Erro ao verificar permissões de visualização:', err);
      }
    };

    checkUserPermissions();
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get authenticated user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Usuário não autenticado');
        }

        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        };

        const [ordensResponse] = await Promise.all([
          fetch(`${apiUrl}/api/ordens`, { headers }),
        ]);

        if (!ordensResponse.ok) {
          const errorText = await ordensResponse.text();
          throw new Error(`Erro ao buscar dados da API (${ordensResponse.status}): ${errorText}`);
        }

        const ordensData = await ordensResponse.json();
        
        // Filtrar OS baseado nas permissões do usuário
        const filteredOrdens = userCanViewAll ? ordensData : ordensData.filter((os: any) => {
          // Mostrar OS onde o usuário é responsável atual ou criador
          return os.responsavel_atual === currentUserId || 
                 os.created_by === currentUserId ||
                 // Ou onde participa como responsável em alguma etapa
                 (os.responsaveis && Object.values(os.responsaveis).includes(currentUserId));
        });
        
        // Calcular stats localmente a partir dos dados das ordens
        const statsData = {
          total_os: safeNum(filteredOrdens?.length),
          roteiro: safeNum(filteredOrdens?.filter((o: any) => o.status === 'ROTEIRO')?.length),
          audio: safeNum(filteredOrdens?.filter((o: any) => o.status === 'AUDIO')?.length),
          captacao: safeNum(filteredOrdens?.filter((o: any) => o.status === 'CAPTACAO')?.length),
          edicao: safeNum(filteredOrdens?.filter((o: any) => o.status === 'EDICAO')?.length),
          revisao: safeNum(filteredOrdens?.filter((o: any) => o.status === 'REVISAO')?.length),
          aprovacao: safeNum(filteredOrdens?.filter((o: any) => o.status === 'APROVACAO')?.length),
          agendamento: safeNum(filteredOrdens?.filter((o: any) => o.status === 'AGENDAMENTO')?.length),
          publicado: safeNum(filteredOrdens?.filter((o: any) => o.status === 'PUBLICADO')?.length),
          alta_prioridade: safeNum(filteredOrdens?.filter((o: any) => o.prioridade === 'HIGH')?.length),
          atrasadas: safeNum(filteredOrdens?.filter((o: any) => 
            o.prazo && !isNaN(new Date(o.prazo).getTime()) && new Date(o.prazo) < new Date() && o.status !== 'PUBLICADO'
          )?.length),
        };
        
        setOrdens(filteredOrdens);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        console.error('Erro ao carregar ordens:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId !== null) {
      fetchData();
    }
  }, [userCanViewAll, currentUserId]);

  const refetch = async () => {
    try {
      // Get authenticated user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const [ordensResponse] = await Promise.all([
        fetch(`${apiUrl}/api/ordens`, { headers }),
      ]);

      if (!ordensResponse.ok) {
        const errorText = await ordensResponse.text();
        throw new Error(`Erro ao recarregar dados da API (${ordensResponse.status}): ${errorText}`);
      }

      const ordensData = await ordensResponse.json();
      
      // Aplicar o mesmo filtro no refetch
      const filteredOrdens = userCanViewAll ? ordensData : ordensData.filter((os: any) => {
        return os.responsavel_atual === currentUserId || 
               os.created_by === currentUserId ||
               (os.responsaveis && Object.values(os.responsaveis).includes(currentUserId));
      });
      
      // Calcular stats localmente
      const statsData = {
        total_os: safeNum(filteredOrdens?.length),
        roteiro: safeNum(filteredOrdens?.filter((o: any) => o.status === 'ROTEIRO').length),
        audio: safeNum(filteredOrdens?.filter((o: any) => o.status === 'AUDIO').length),
        captacao: safeNum(filteredOrdens?.filter((o: any) => o.status === 'CAPTACAO').length),
        edicao: safeNum(filteredOrdens?.filter((o: any) => o.status === 'EDICAO').length),
        revisao: safeNum(filteredOrdens?.filter((o: any) => o.status === 'REVISAO').length),
        aprovacao: safeNum(filteredOrdens?.filter((o: any) => o.status === 'APROVACAO').length),
        agendamento: safeNum(filteredOrdens?.filter((o: any) => o.status === 'AGENDAMENTO').length),
        publicado: safeNum(filteredOrdens?.filter((o: any) => o.status === 'PUBLICADO').length),
          atrasadas: safeNum(filteredOrdens?.filter((o: any) => 
            o.prazo && !isNaN(new Date(o.prazo).getTime()) && new Date(o.prazo) < new Date() && o.status !== 'PUBLICADO'
          )?.length),
      }
      
      setOrdens(filteredOrdens);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao recarregar dados');
    }
  }

  return {
    ordens,
    stats,
    loading,
    error,
    refetch,
    safeNum,
    userCanViewAll, // Exportar para debug
  };
}