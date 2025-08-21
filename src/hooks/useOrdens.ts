import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Helper para garantir números válidos
const safeNum = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function useOrdens() {
  const [ordens, setOrdens] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        
        // Calcular stats localmente a partir dos dados das ordens
        const statsData = {
          total_os: safeNum(ordensData?.length),
          roteiro: safeNum(ordensData?.filter((o: any) => o.status === 'ROTEIRO')?.length),
          audio: safeNum(ordensData?.filter((o: any) => o.status === 'AUDIO')?.length),
          captacao: safeNum(ordensData?.filter((o: any) => o.status === 'CAPTACAO')?.length),
          edicao: safeNum(ordensData?.filter((o: any) => o.status === 'EDICAO')?.length),
          revisao: safeNum(ordensData?.filter((o: any) => o.status === 'REVISAO')?.length),
          aprovacao: safeNum(ordensData?.filter((o: any) => o.status === 'APROVACAO')?.length),
          agendamento: safeNum(ordensData?.filter((o: any) => o.status === 'AGENDAMENTO')?.length),
          postado: safeNum(ordensData?.filter((o: any) => o.status === 'PUBLICADO')?.length),
          alta_prioridade: safeNum(ordensData?.filter((o: any) => o.prioridade === 'HIGH')?.length),
          atrasadas: safeNum(ordensData?.filter((o: any) => 
            o.sla_atual && !isNaN(new Date(o.sla_atual).getTime()) && new Date(o.sla_atual) < new Date() && o.status !== 'POSTADO'
          )?.length),
        };
        
        setOrdens(ordensData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        console.error('Erro ao carregar ordens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      
      // Calcular stats localmente
      const statsData = {
        total_os: safeNum(ordensData?.length),
        roteiro: safeNum(ordensData?.filter((o: any) => o.status === 'ROTEIRO').length),
        audio: safeNum(ordensData?.filter((o: any) => o.status === 'AUDIO').length),
        captacao: safeNum(ordensData?.filter((o: any) => o.status === 'CAPTACAO').length),
        edicao: safeNum(ordensData?.filter((o: any) => o.status === 'EDICAO').length),
        revisao: safeNum(ordensData?.filter((o: any) => o.status === 'REVISAO').length),
        aprovacao: safeNum(ordensData?.filter((o: any) => o.status === 'APROVACAO').length),
        agendamento: safeNum(ordensData?.filter((o: any) => o.status === 'AGENDAMENTO').length),
        publicado: safeNum(ordensData?.filter((o: any) => o.status === 'PUBLICADO').length),
        atrasadas: safeNum(ordensData?.filter((o: any) => 
          o.sla_atual && new Date(o.sla_atual) < new Date() && o.status !== 'PUBLICADO'
        ).length),
      }
      
      setOrdens(ordensData);
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
    safeNum, // Exportar helper para uso nos componentes
  };
}