import { useState } from 'react';
import { showToast } from '../components/ui/Toast';

interface CronogramaItem {
  data_publicacao: string;
  hora_publicacao: string;
  marca: string;
  plataforma: string;
  tipo_conteudo: string;
  tema_post: string;
  objetivo_estrategico: string;
  roteiro_detalhado: string;
  copy_final: string;
  status_inicial: string;
  referencia_visual: string;
  trilha_sonora: string;
  stories_do_dia: string;
}

export function useCronograma() {
  const [items, setItems] = useState<CronogramaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Array<{ item: string; error: string }>>([]);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const processarCronograma = async (cronogramaItems: CronogramaItem[]) => {
    setLoading(true);
    setErrors([]);
    const loadingToast = showToast.loading('✨ Transformando cronograma em OS automáticas...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const results = {
        created: 0,
        skipped: 0,
        errors: [] as Array<{ item: string; error: string }>
      };

      for (const item of cronogramaItems) {
        try {
          // Converter data e hora para ISO string
          const [day, month, year] = item.data_publicacao.split('/');
          const dataPublicacao = new Date(`${year}-${month}-${day}T${item.hora_publicacao}:00`);
          
          if (isNaN(dataPublicacao.getTime())) {
            throw new Error('Data/hora inválida');
          }

          // Mapear marca
          const marcaMap: Record<string, string> = {
            'Raytchel': 'RAYTCHEL',
            'Zaffira18k': 'ZAFFIRA',
            'Zaff': 'ZAFF',
            'Crispim': 'CRISPIM',
            'Fazenda': 'FAZENDA'
          };
          
          const marca = marcaMap[item.marca] || 'RAYTCHEL';
          
          // Mapear objetivo
          const objetivoMap: Record<string, string> = {
            'Topo de Funil': 'ATRACAO',
            'Meio de Funil': 'NUTRICAO', 
            'Fundo de Funil': 'CONVERSAO'
          };
          
          const objetivo = objetivoMap[item.objetivo_estrategico] || 'ATRACAO';
          
          // Determinar tipo baseado no tema
          const tipo = item.tema_post.toLowerCase().includes('tutorial') || 
                      item.tema_post.toLowerCase().includes('dica') ? 'EDUCATIVO' : 
                      item.tema_post.toLowerCase().includes('case') ||
                      item.tema_post.toLowerCase().includes('história') ? 'HISTORIA' : 'CONVERSAO';
          
          // Extrair canais da plataforma
          const canais = [item.plataforma];
          
          // Criar OS
          const osData = {
            titulo: item.tema_post,
            descricao: item.roteiro_detalhado,
            marca,
            objetivo,
            tipo,
            status: item.status_inicial === 'Gravar' ? 'ROTEIRO' : 'AGENDAMENTO',
            data_publicacao_prevista: dataPublicacao.toISOString(),
            canais,
            prioridade: 'MEDIUM',
            script_text: item.roteiro_detalhado,
            legenda: item.copy_final,
            midia_bruta_links: item.referencia_visual ? [item.referencia_visual] : [],
            categorias_criativos: [item.tipo_conteudo],
            responsaveis: {
              edicao: '',
              arte: '',
              revisao: ''
            }
          };

          const response = await fetch(`${apiUrl}/api/ordens`, {
            method: 'POST',
            headers,
            body: JSON.stringify(osData)
          });

          if (response.ok) {
            results.created++;
          } else {
            const errorData = await response.json().catch(() => ({}));
            results.errors.push({
              item: item.tema_post,
              error: errorData.error || `HTTP ${response.status}`
            });
          }
        } catch (error) {
          results.errors.push({
            item: item.tema_post || 'Item sem título',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      setErrors(results.errors);

      if (results.errors.length > 0) {
        showToast.warning(`🎯 ${results.created} OS criadas com sucesso! ${results.errors.length} itens precisam de atenção.`);
      } else {
        showToast.success(`🚀 Perfeito! ${results.created} OS criadas e agendadas automaticamente!`);
        setItems([]);
      }

      return results;
      
    } catch (error) {
      console.error('Erro ao processar cronograma:', error);
      showToast.error(error instanceof Error ? error.message : 'Erro desconhecido');
      return { created: 0, skipped: 0, errors: [] };
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const parsearCSV = (csvText: string): CronogramaItem[] => {
    console.log('🔍 Iniciando parse do CSV...');
    console.log('📄 Primeiras linhas:', csvText.split('\n').slice(0, 3));
    
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('📋 Arquivo deve ter pelo menos cabeçalho e uma linha de dados');
    }
    
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    console.log('📊 Cabeçalho:', header);
    console.log('📝 Linhas de dados:', dataLines.length);
    
    const cronogramaData: CronogramaItem[] = [];
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;
      
      console.log(`📋 Processando linha ${i + 1}:`, line.substring(0, 100) + '...');
      
      // Melhor parsing de CSV com aspas
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      let i_char = 0;
      
      while (i_char < line.length) {
        const char = line[i_char];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
        i_char++;
      }
      values.push(current.trim()); // Last value
      
      if (values.length < 10) {
        console.warn(`⚠️ Linha ${i + 1} com poucas colunas (${values.length}):`, values);
        continue;
      }
      
      console.log(`✅ Linha ${i + 1} processada:`, {
        data: values[0],
        hora: values[1], 
        marca: values[2],
        tema: values[5]
      });
      
      const item: CronogramaItem = {
        data_publicacao: values[0] || '',
        hora_publicacao: values[1] || '',
        marca: values[2] || '',
        plataforma: values[3] || '',
        tipo_conteudo: values[4] || '',
        tema_post: values[5] || '',
        objetivo_estrategico: values[6] || '',
        roteiro_detalhado: values[7] || '',
        copy_final: values[8] || '',
        status_inicial: values[9] || 'ROTEIRO',
        referencia_visual: values[10] || '',
        trilha_sonora: values[11] || '',
        stories_do_dia: values[12] || ''
      };
      
      cronogramaData.push(item);
    }
    
    return cronogramaData;
  };

  return {
    items,
    setItems,
    loading,
    errors,
    processarCronograma,
    parsearCSV
  };
}