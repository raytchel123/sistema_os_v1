import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Database {
  public: {
    Tables: {
      ordens_de_servico: {
        Row: {
          id: string;
          titulo: string;
          status: string;
          sla_atual: string | null;
          responsavel_atual: string | null;
          prioridade: string;
          marca: string;
          org_id: string | null;
          criado_em: string;
          atualizado_em: string;
        };
      };
      users: {
        Row: {
          id: string;
          nome: string;
          email: string;
          papel: string;
          org_id: string | null;
        };
      };
      logs_evento: {
        Insert: {
          os_id: string;
          user_id?: string | null;
          acao: string;
          detalhe?: string | null;
        };
      };
      audit_logs: {
        Insert: {
          org_id?: string | null;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          details?: any;
        };
      };
    };
  };
}

// Notification services
class NotificationService {
  private slackWebhookUrl: string;
  private whatsappApiUrl: string;
  private whatsappToken: string;

  constructor() {
    this.slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL') || '';
    this.whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL') || '';
    this.whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN') || '';
  }

  async sendSlackNotification(message: string, channel?: string): Promise<boolean> {
    if (!this.slackWebhookUrl) {
      console.log('[SLACK STUB] Would send:', message);
      return true;
    }

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          channel: channel || '#os-conteudo',
          username: 'SLA Monitor',
          icon_emoji: ':warning:'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar Slack:', error);
      return false;
    }
  }

  async sendWhatsAppNotification(phone: string, message: string): Promise<boolean> {
    if (!this.whatsappApiUrl || !this.whatsappToken) {
      console.log(`[WHATSAPP STUB] Would send to ${phone}:`, message);
      return true;
    }

    try {
      const response = await fetch(`${this.whatsappApiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: phone,
          type: 'text',
          text: { body: message }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      return false;
    }
  }
}

// SLA Monitor Service
class SLAMonitor {
  private supabase: any;
  private notifications: NotificationService;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.notifications = new NotificationService();
  }

  async checkOverdueTasks(): Promise<void> {
    console.log('🔍 Iniciando verificação de SLA...');

    try {
      // Buscar OS com SLA vencido ou em risco
      const now = new Date();
      const riskThreshold = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 horas

      const { data: overdueOS, error } = await this.supabase
        .from('ordens_de_servico')
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(
            id, nome, email, papel
          )
        `)
        .lt('sla_atual', now.toISOString())
        .neq('status', 'POSTADO')
        .not('sla_atual', 'is', null);

      const { data: riskOS, error: riskError } = await this.supabase
        .from('ordens_de_servico')
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(
            id, nome, email, papel
          )
        `)
        .gte('sla_atual', now.toISOString())
        .lt('sla_atual', riskThreshold.toISOString())
        .neq('status', 'POSTADO')
        .not('sla_atual', 'is', null);

      if (error || riskError) {
        throw error || riskError;
      }

      console.log(`⚠️ Encontradas ${overdueOS?.length || 0} OS atrasadas`);
      console.log(`🟡 Encontradas ${riskOS?.length || 0} OS em risco`);

      // Process overdue OS
      if (overdueOS && overdueOS.length > 0) {
        for (const os of overdueOS) {
          await this.processOverdueOS(os, 'OVERDUE');
        }
      }

      // Process at-risk OS
      if (riskOS && riskOS.length > 0) {
        for (const os of riskOS) {
          await this.processOverdueOS(os, 'AT_RISK');
        }
      }

      console.log('✅ Verificação de SLA concluída');
    } catch (error) {
      console.error('❌ Erro na verificação de SLA:', error);
      throw error;
    }
  }

  private async processOverdueOS(os: any, type: 'OVERDUE' | 'AT_RISK'): Promise<void> {
    const now = new Date();
    const slaDate = new Date(os.sla_atual);
    const horasAtraso = Math.floor((now.getTime() - slaDate.getTime()) / (1000 * 60 * 60));

    console.log(`📋 Processando OS ${type}: ${os.titulo} (${horasAtraso}h)`);

    // Verificar se já foi notificado recentemente (últimas 4 horas)
    const { data: recentLogs } = await this.supabase
      .from('logs_evento')
      .select('*')
      .eq('os_id', os.id)
      .eq('acao', type === 'OVERDUE' ? 'SLA_VENCIDO' : 'SLA_EM_RISCO')
      .gte('timestamp', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recentLogs && recentLogs.length > 0) {
      console.log(`⏭️ OS ${os.titulo} já foi notificada recentemente`);
      return;
    }

    // Criar log
    await this.logSLAEvent(os, type, horasAtraso);

    // Enviar notificações
    await this.sendNotifications(os, type, horasAtraso);
  }

  private async logSLAEvent(os: any, type: 'OVERDUE' | 'AT_RISK', horasAtraso: number): Promise<void> {
    const acao = type === 'OVERDUE' ? 'SLA_VENCIDO' : 'SLA_EM_RISCO';
    const detalhe = type === 'OVERDUE' 
      ? `SLA vencido há ${horasAtraso} horas. Status: ${os.status}. Prioridade: ${os.prioridade}`
      : `SLA em risco (${Math.abs(horasAtraso)} horas restantes). Status: ${os.status}`;

    await this.supabase
      .from('logs_evento')
      .insert({
        os_id: os.id,
        user_id: null,
        acao,
        detalhe
      });

    // Audit log
    await this.supabase
      .from('audit_logs')
      .insert({
        org_id: os.org_id,
        user_id: null,
        action: acao,
        resource_type: 'OS',
        resource_id: os.id,
        details: {
          titulo: os.titulo,
          status: os.status,
          prioridade: os.prioridade,
          horas_atraso: horasAtraso,
          responsavel: os.responsavel?.nome
        }
      });

    console.log(`📝 Log ${acao} criado para OS ${os.titulo}`);
  }

  private async sendNotifications(os: any, type: 'OVERDUE' | 'AT_RISK', horasAtraso: number): Promise<void> {
    const isHighPriority = os.prioridade === 'HIGH';
    const responsavel = os.responsavel;
    const emoji = type === 'OVERDUE' ? '🚨' : '⚠️';
    const urgency = type === 'OVERDUE' ? 'VENCIDO' : 'EM RISCO';

    // Mensagem base
    const baseMessage = `${emoji} SLA ${urgency}\n\nOS: ${os.titulo}\nStatus: ${os.status}\n${
      type === 'OVERDUE' ? `Atraso: ${horasAtraso}h` : `Restam: ${Math.abs(horasAtraso)}h`
    }\nPrioridade: ${os.prioridade}`;

    // Notificar responsável atual
    if (responsavel) {
      const userMessage = `${baseMessage}\n\nResponsável: ${responsavel.nome}\nAção necessária ${type === 'OVERDUE' ? 'urgente' : 'em breve'}!`;
      
      await this.notifications.sendSlackNotification(
        `<@${responsavel.email}> ${userMessage}`,
        '#os-conteudo'
      );

      await this.notifications.sendWhatsAppNotification(
        responsavel.email, // Placeholder - seria o telefone
        userMessage
      );

      console.log(`📱 Notificações enviadas para ${responsavel.nome}`);
    }

    // Se alta prioridade ou vencido, notificar gestores
    if (isHighPriority || type === 'OVERDUE') {
      const { data: gestores } = await this.supabase
        .from('users')
        .select('*')
        .eq('org_id', os.org_id)
        .in('role', ['ORG_ADMIN', 'SUPERADMIN']);

      if (gestores && gestores.length > 0) {
        for (const gestor of gestores) {
          const gestorMessage = `${baseMessage}\n\n${isHighPriority ? '⚡ ALTA PRIORIDADE' : '🚨 SLA VENCIDO'} - Intervenção necessária\nResponsável atual: ${responsavel?.nome || 'Não atribuído'}`;
          
          await this.notifications.sendSlackNotification(
            `<@${gestor.email}> ${gestorMessage}`,
            '#os-urgente'
          );

          await this.notifications.sendWhatsAppNotification(
            gestor.email, // Placeholder
            gestorMessage
          );
        }

        console.log(`👑 Gestores notificados sobre OS ${urgency}`);
      }
    }
  }

  // Método para recalcular SLA ao avançar etapa
  static calculateNewSLA(newStatus: string): Date {
    const now = new Date();
    const slaHours: Record<string, number> = {
      'ROTEIRO': 24,
      'AUDIO': 24,
      'CAPTACAO': 24,
      'EDICAO': 48,
      'REVISAO': 24,
      'APROVACAO': 24,
      'AGENDAMENTO': 24,
      'POSTADO': 0
    };

    const hours = slaHours[newStatus] || 24;
    now.setHours(now.getHours() + hours);
    return now;
  }

  // Método para gerar relatórios de produtividade
  async generateProductivityReport(): Promise<any> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // OS completadas por usuário na última semana
    const { data: completedOS } = await this.supabase
      .from('logs_evento')
      .select(`
        user_id,
        os_id,
        timestamp,
        user:users(nome, papel),
        os:ordens_de_servico(titulo, marca, status)
      `)
      .eq('acao', 'MUDAR_STATUS')
      .gte('timestamp', oneWeekAgo.toISOString());

    // Agrupar por usuário
    const userStats = (completedOS || []).reduce((acc: any, log: any) => {
      const userId = log.user_id;
      if (!userId || !log.user) return acc;

      if (!acc[userId]) {
        acc[userId] = {
          nome: log.user.nome,
          papel: log.user.papel,
          os_completadas: 0,
          marcas: new Set()
        };
      }

      acc[userId].os_completadas++;
      if (log.os?.marca) {
        acc[userId].marcas.add(log.os.marca);
      }

      return acc;
    }, {});

    // Converter Set para Array
    Object.values(userStats).forEach((stat: any) => {
      stat.marcas = Array.from(stat.marcas);
    });

    return {
      periodo: '7 dias',
      usuarios: Object.values(userStats),
      total_os_completadas: completedOS?.length || 0
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const url = new URL(req.url);
    const path = url.pathname;

    // Endpoint principal do monitor (executado via cron)
    if (path.endsWith('/sla-monitor') && req.method === 'POST') {
      const monitor = new SLAMonitor(supabaseClient);
      await monitor.checkOverdueTasks();

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verificação de SLA executada com sucesso',
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Endpoint para obter estatísticas de SLA
    if (path.endsWith('/sla-stats') && req.method === 'GET') {
      const now = new Date().toISOString();
      const riskThreshold = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4h

      const { data: stats, error } = await supabaseClient
        .from('ordens_de_servico')
        .select('id, titulo, status, sla_atual, prioridade, responsavel_atual, marca, org_id')
        .neq('status', 'POSTADO');

      if (error) throw error;

      const emRisco = stats?.filter(os => 
        os.sla_atual && os.sla_atual >= now && os.sla_atual <= riskThreshold
      ) || [];

      const atrasadas = stats?.filter(os => 
        os.sla_atual && os.sla_atual < now
      ) || [];

      const altaPrioridadeAtrasadas = atrasadas.filter(os => os.prioridade === 'HIGH');

      // Estatísticas por marca
      const porMarca = (stats || []).reduce((acc: any, os: any) => {
        if (!acc[os.marca]) {
          acc[os.marca] = { total: 0, atrasadas: 0, em_risco: 0 };
        }
        acc[os.marca].total++;
        if (atrasadas.some(a => a.id === os.id)) acc[os.marca].atrasadas++;
        if (emRisco.some(r => r.id === os.id)) acc[os.marca].em_risco++;
        return acc;
      }, {});

      return new Response(
        JSON.stringify({
          total_ativas: stats?.length || 0,
          em_risco: emRisco.length,
          atrasadas: atrasadas.length,
          alta_prioridade_atrasadas: altaPrioridadeAtrasadas.length,
          por_marca: porMarca,
          detalhes: {
            em_risco: emRisco,
            atrasadas: atrasadas
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Endpoint para relatório de produtividade
    if (path.endsWith('/productivity-report') && req.method === 'GET') {
      const monitor = new SLAMonitor(supabaseClient);
      const report = await monitor.generateProductivityReport();

      return new Response(
        JSON.stringify(report),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no SLA Monitor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});