export type StatusOS = 'ROTEIRO' | 'AUDIO' | 'CAPTACAO' | 'EDICAO' | 'REVISAO' | 'APROVACAO' | 'AGENDAMENTO' | 'POSTADO';
export type PapelUser = 'COPY' | 'AUDIO' | 'VIDEO' | 'EDITOR' | 'REVISOR' | 'CRISPIM' | 'SOCIAL';
export type TipoAsset = 'ROTEIRO' | 'AUDIO' | 'VIDEO_BRUTO' | 'EDIT_V1' | 'THUMB' | 'LEGENDA' | 'ARTE';

interface TransitionRule {
  from: StatusOS;
  to: StatusOS;
  validate: (osId: string) => Promise<{ valid: boolean; error?: string }>;
  nextResponsible: PapelUser;
  slaHours: number;
}

interface OSData {
  id: string;
  status: StatusOS;
  aprovado_interno?: boolean;
  aprovado_crispim?: boolean;
}

export class StateMachine {
  private transitions: TransitionRule[] = [
    {
      from: 'ROTEIRO',
      to: 'AUDIO',
      validate: this.validateRoteiroToAudio.bind(this),
      nextResponsible: 'AUDIO',
      slaHours: 24
    },
    {
      from: 'AUDIO',
      to: 'CAPTACAO',
      validate: this.validateAudioToCaptacao.bind(this),
      nextResponsible: 'VIDEO',
      slaHours: 24
    },
    {
      from: 'CAPTACAO',
      to: 'EDICAO',
      validate: this.validateCaptacaoToEdicao.bind(this),
      nextResponsible: 'EDITOR',
      slaHours: 24
    },
    {
      from: 'EDICAO',
      to: 'REVISAO',
      validate: this.validateEdicaoToRevisao.bind(this),
      nextResponsible: 'REVISOR',
      slaHours: 48
    },
    {
      from: 'REVISAO',
      to: 'APROVACAO',
      validate: this.validateRevisaoToAprovacao.bind(this),
      nextResponsible: 'CRISPIM',
      slaHours: 24
    },
    {
      from: 'APROVACAO',
      to: 'AGENDAMENTO',
      validate: this.validateAprovacaoToAgendamento.bind(this),
      nextResponsible: 'SOCIAL',
      slaHours: 24
    },
    {
      from: 'AGENDAMENTO',
      to: 'POSTADO',
      validate: this.validateAgendamentoToPostado.bind(this),
      nextResponsible: 'SOCIAL',
      slaHours: 0
    }
  ];

  async advanceStatus(osId: string, userId?: string): Promise<{ success: boolean; error?: string; newStatus?: StatusOS }> {
    try {
      // Buscar OS atual
      const { data: os, error: osError } = await supabase
        .from('ordens_de_servico')
        .select('*')
        .eq('id', osId)
        .single();

      if (osError || !os) {
        return { success: false, error: 'OS não encontrada' };
      }

      // Encontrar transição válida
      const transition = this.transitions.find(t => t.from === os.status);
      if (!transition) {
        return { success: false, error: 'Não há transição disponível para este status' };
      }

      // Validar pré-requisitos
      const validation = await transition.validate(osId);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Buscar responsável da próxima etapa
      const { data: nextUser } = await supabase
        .from('users')
        .select('id')
        .eq('papel', transition.nextResponsible)
        .limit(1)
        .single();

      // Calcular novo SLA
      const newSla = new Date();
      newSla.setHours(newSla.getHours() + transition.slaHours);

      // Atualizar OS
      const { error: updateError } = await supabase
        .from('ordens_de_servico')
        .update({
          status: transition.to,
          responsavel_atual: nextUser?.id || null,
          sla_atual: transition.slaHours > 0 ? newSla.toISOString() : null,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', osId);

      if (updateError) {
        return { success: false, error: 'Erro ao atualizar OS' };
      }

      // Gravar log
      await this.logEvent(osId, userId, 'MUDAR_STATUS', `Status alterado de ${transition.from} para ${transition.to}`);

      return { success: true, newStatus: transition.to };
    } catch (error) {
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  async rejectOS(osId: string, motivo: string, userId?: string): Promise<{ success: boolean; error?: string; newStatus?: StatusOS }> {
    try {
      // Buscar OS atual
      const { data: os, error: osError } = await supabase
        .from('ordens_de_servico')
        .select('*')
        .eq('id', osId)
        .single();

      if (osError || !os) {
        return { success: false, error: 'OS não encontrada' };
      }

      // Determinar status anterior
      const previousStatus = this.getPreviousStatus(os.status);
      if (!previousStatus) {
        return { success: false, error: 'Não é possível reprovar desta etapa' };
      }

      // Buscar responsável da etapa anterior
      const previousResponsible = this.getResponsibleForStatus(previousStatus);
      const { data: prevUser } = await supabase
        .from('users')
        .select('id')
        .eq('papel', previousResponsible)
        .limit(1)
        .single();

      // Calcular novo SLA (24h para retrabalho)
      const newSla = new Date();
      newSla.setHours(newSla.getHours() + 24);

      // Atualizar OS
      const { error: updateError } = await supabase
        .from('ordens_de_servico')
        .update({
          status: previousStatus,
          responsavel_atual: prevUser?.id || null,
          sla_atual: newSla.toISOString(),
          aprovado_interno: previousStatus === 'REVISAO' ? false : os.aprovado_interno,
          aprovado_crispim: previousStatus === 'APROVACAO' ? false : os.aprovado_crispim,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', osId);

      if (updateError) {
        return { success: false, error: 'Erro ao atualizar OS' };
      }

      // Gravar log de reprovação
      await this.logEvent(osId, userId, 'REPROVAR', `Reprovado: ${motivo}. Retornado para ${previousStatus}`);

      return { success: true, newStatus: previousStatus };
    } catch (error) {
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  async markAsPosted(osId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: os } = await supabase
        .from('ordens_de_servico')
        .select('status')
        .eq('id', osId)
        .single();

      if (!os || os.status !== 'AGENDAMENTO') {
        return { success: false, error: 'OS deve estar em AGENDAMENTO para ser marcada como postada' };
      }

      const { error: updateError } = await supabase
        .from('ordens_de_servico')
        .update({
          status: 'POSTADO',
          responsavel_atual: null,
          sla_atual: null,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', osId);

      if (updateError) {
        return { success: false, error: 'Erro ao marcar como postado' };
      }

      await this.logEvent(osId, null, 'POSTAR', 'Conteúdo postado via webhook');
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  // Validações específicas para cada transição
  private async validateRoteiroToAudio(osId: string): Promise<{ valid: boolean; error?: string }> {
    const { data: checklist } = await supabase
      .from('checklist_itens')
      .select('*')
      .eq('os_id', osId)
      .eq('etapa', 'ROTEIRO')
      .eq('obrigatorio', true);

    if (!checklist || checklist.length === 0) {
      return { valid: false, error: 'Nenhum item obrigatório de checklist encontrado para ROTEIRO' };
    }

    const completed = checklist.filter(item => item.feito).length;
    const total = checklist.length;

    if (completed < total) {
      return { valid: false, error: `Checklist obrigatório incompleto: ${completed}/${total} itens concluídos` };
    }

    return { valid: true };
  }

  private async validateAudioToCaptacao(osId: string): Promise<{ valid: boolean; error?: string }> {
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('os_id', osId)
      .eq('tipo', 'AUDIO');

    if (!assets || assets.length === 0) {
      return { valid: false, error: 'Asset de AUDIO é obrigatório para avançar para CAPTACAO' };
    }

    return { valid: true };
  }

  private async validateCaptacaoToEdicao(osId: string): Promise<{ valid: boolean; error?: string }> {
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('os_id', osId)
      .eq('tipo', 'VIDEO_BRUTO');

    if (!assets || assets.length === 0) {
      return { valid: false, error: 'Asset de VIDEO_BRUTO é obrigatório para avançar para EDICAO' };
    }

    return { valid: true };
  }

  private async validateEdicaoToRevisao(osId: string): Promise<{ valid: boolean; error?: string }> {
    const requiredAssets = ['EDIT_V1', 'LEGENDA', 'THUMB'];
    
    for (const assetType of requiredAssets) {
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('os_id', osId)
        .eq('tipo', assetType);

      if (!assets || assets.length === 0) {
        return { valid: false, error: `Asset de ${assetType} é obrigatório para avançar para REVISAO` };
      }
    }

    return { valid: true };
  }

  private async validateRevisaoToAprovacao(osId: string): Promise<{ valid: boolean; error?: string }> {
    const { data: os } = await supabase
      .from('ordens_de_servico')
      .select('aprovado_interno')
      .eq('id', osId)
      .single();

    if (!os?.aprovado_interno) {
      return { valid: false, error: 'Aprovação interna é obrigatória para avançar para APROVACAO' };
    }

    return { valid: true };
  }

  private async validateAprovacaoToAgendamento(osId: string): Promise<{ valid: boolean; error?: string }> {
    const { data: os } = await supabase
      .from('ordens_de_servico')
      .select('aprovado_crispim')
      .eq('id', osId)
      .single();

    if (!os?.aprovado_crispim) {
      return { valid: false, error: 'Aprovação do Crispim é obrigatória para avançar para AGENDAMENTO' };
    }

    return { valid: true };
  }

  private async validateAgendamentoToPostado(osId: string): Promise<{ valid: boolean; error?: string }> {
    // Esta transição só deve acontecer via webhook
    return { valid: false, error: 'Transição para POSTADO só é permitida via webhook' };
  }

  private getPreviousStatus(currentStatus: StatusOS): StatusOS | null {
    const statusFlow: StatusOS[] = ['ROTEIRO', 'AUDIO', 'CAPTACAO', 'EDICAO', 'REVISAO', 'APROVACAO', 'AGENDAMENTO', 'POSTADO'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex > 0 ? statusFlow[currentIndex - 1] : null;
  }

  private getResponsibleForStatus(status: StatusOS): PapelUser {
    const responsibleMap: Record<StatusOS, PapelUser> = {
      'ROTEIRO': 'COPY',
      'AUDIO': 'AUDIO',
      'CAPTACAO': 'VIDEO',
      'EDICAO': 'EDITOR',
      'REVISAO': 'REVISOR',
      'APROVACAO': 'CRISPIM',
      'AGENDAMENTO': 'SOCIAL',
      'POSTADO': 'SOCIAL'
    };
    return responsibleMap[status];
  }

  private async logEvent(osId: string, userId: string | null | undefined, acao: string, detalhe: string): Promise<void> {
    await supabase
      .from('logs_evento')
      .insert({
        os_id: osId,
        user_id: userId || null,
        acao: acao as any,
        detalhe,
        timestamp: new Date().toISOString()
      });
  }
}