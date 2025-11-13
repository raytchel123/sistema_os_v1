import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
    if (!user) {
      setLoading(false);
      return;
    }

    setUserCanViewAll(user.pode_ver_todas_os || false);
    setCurrentUserId(user.id);
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.org_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: ordensData, error: ordensError } = await supabase
          .from('ordens_de_servico')
          .select(`
            *,
            aprovado_por_user:aprovado_por(nome),
            reprovado_por_user:reprovado_por(nome)
          `)
          .eq('org_id', user.org_id)
          .order('criado_em', { ascending: false });

        if (ordensError) {
          throw ordensError;
        }

        const filteredOrdens = userCanViewAll ? ordensData : ordensData.filter((os: any) => {
          return os.responsavel_atual === currentUserId ||
                 os.created_by === currentUserId ||
                 (os.responsaveis && Object.values(os.responsaveis).includes(currentUserId));
        });

        const ordensWithNames = filteredOrdens.map((ordem: any) => ({
          ...ordem,
          aprovado_por_nome: ordem.aprovado_por_user?.nome,
          reprovado_por_nome: ordem.reprovado_por_user?.nome
        }));

        setOrdens(ordensWithNames || []);

        const stats = {
          total: filteredOrdens.length,
          rascunho: filteredOrdens.filter((o: any) => o.status === 'RASCUNHO').length,
          intake: filteredOrdens.filter((o: any) => o.status === 'INTAKE').length,
          briefing: filteredOrdens.filter((o: any) => o.status === 'BRIEFING').length,
          aprovacao: filteredOrdens.filter((o: any) => o.status === 'APROVACAO_BRIEFING').length,
          roteiro: filteredOrdens.filter((o: any) => o.status === 'ROTEIRO').length,
          producao: filteredOrdens.filter((o: any) => o.status === 'PRODUCAO').length,
          pos: filteredOrdens.filter((o: any) => o.status === 'POS').length,
          revisao: filteredOrdens.filter((o: any) => o.status === 'REVISAO').length,
          entregue: filteredOrdens.filter((o: any) => o.status === 'ENTREGUE').length,
        };

        setStats(stats);
        setError(null);
      } catch (err: any) {
        console.error('Erro ao buscar ordens:', err);
        setError(err.message || 'Erro ao buscar dados');
        setOrdens([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userCanViewAll, currentUserId]);

  const refetch = async () => {
    setLoading(true);
    if (!user || !user.org_id) {
      setLoading(false);
      return;
    }

    try {
      const { data: ordensData, error: ordensError } = await supabase
        .from('ordens_de_servico')
        .select(`
          *,
          aprovado_por_user:aprovado_por(nome),
          reprovado_por_user:reprovado_por(nome)
        `)
        .eq('org_id', user.org_id)
        .order('criado_em', { ascending: false });

      if (ordensError) {
        throw ordensError;
      }

      const filteredOrdens = userCanViewAll ? ordensData : ordensData.filter((os: any) => {
        return os.responsavel_atual === currentUserId ||
               os.created_by === currentUserId ||
               (os.responsaveis && Object.values(os.responsaveis).includes(currentUserId));
      });

      const ordensWithNames = filteredOrdens.map((ordem: any) => ({
        ...ordem,
        aprovado_por_nome: ordem.aprovado_por_user?.nome,
        reprovado_por_nome: ordem.reprovado_por_user?.nome
      }));

      setOrdens(ordensWithNames || []);

      const stats = {
        total: filteredOrdens.length,
        rascunho: filteredOrdens.filter((o: any) => o.status === 'RASCUNHO').length,
        intake: filteredOrdens.filter((o: any) => o.status === 'INTAKE').length,
        briefing: filteredOrdens.filter((o: any) => o.status === 'BRIEFING').length,
        aprovacao: filteredOrdens.filter((o: any) => o.status === 'APROVACAO_BRIEFING').length,
        roteiro: filteredOrdens.filter((o: any) => o.status === 'ROTEIRO').length,
        producao: filteredOrdens.filter((o: any) => o.status === 'PRODUCAO').length,
        pos: filteredOrdens.filter((o: any) => o.status === 'POS').length,
        revisao: filteredOrdens.filter((o: any) => o.status === 'REVISAO').length,
        entregue: filteredOrdens.filter((o: any) => o.status === 'ENTREGUE').length,
      };

      setStats(stats);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar ordens:', err);
      setError(err.message || 'Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  return {
    ordens,
    stats,
    loading,
    error,
    safeNum,
    refetch,
    userCanViewAll,
    currentUserId
  };
}
