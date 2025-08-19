import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateMachine } from './StateMachine';

// Mock do Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        limit: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn()
    })),
    insert: vi.fn()
  }))
};

// Mock global do supabase
vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('StateMachine', () => {
  let stateMachine: StateMachine;

  beforeEach(() => {
    vi.clearAllMocks();
    stateMachine = new StateMachine();
  });

  describe('advanceStatus', () => {
    it('deve avançar de ROTEIRO para AUDIO quando checklist obrigatório está 100% completo', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'ROTEIRO' },
        error: null
      });

      // Mock checklist completo
      const mockChecklistChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockChecklistChain);
      mockChecklistChain.single.mockResolvedValueOnce({
        data: [
          { id: '1', feito: true, obrigatorio: true },
          { id: '2', feito: true, obrigatorio: true }
        ],
        error: null
      });

      // Mock usuário responsável
      const mockUserChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUserChain);
      mockUserChain.single.mockResolvedValueOnce({
        data: { id: 'user-audio' },
        error: null
      });

      // Mock update
      const mockUpdateChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUpdateChain);
      mockUpdateChain.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await stateMachine.advanceStatus('os-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('AUDIO');
    });

    it('deve bloquear avanço de ROTEIRO para AUDIO quando checklist obrigatório está incompleto', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'ROTEIRO' },
        error: null
      });

      // Mock checklist incompleto
      const mockChecklistChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockChecklistChain);
      mockChecklistChain.single.mockResolvedValueOnce({
        data: [
          { id: '1', feito: true, obrigatorio: true },
          { id: '2', feito: false, obrigatorio: true }
        ],
        error: null
      });

      const result = await stateMachine.advanceStatus('os-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Checklist obrigatório incompleto');
    });

    it('deve avançar de AUDIO para CAPTACAO quando existe asset AUDIO', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'AUDIO' },
        error: null
      });

      // Mock asset AUDIO existe
      const mockAssetChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockAssetChain);
      mockAssetChain.single.mockResolvedValueOnce({
        data: [{ id: 'asset-1', tipo: 'AUDIO' }],
        error: null
      });

      // Mock usuário responsável
      const mockUserChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUserChain);
      mockUserChain.single.mockResolvedValueOnce({
        data: { id: 'user-video' },
        error: null
      });

      // Mock update
      const mockUpdateChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUpdateChain);
      mockUpdateChain.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await stateMachine.advanceStatus('os-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('CAPTACAO');
    });

    it('deve bloquear avanço de AUDIO para CAPTACAO quando não existe asset AUDIO', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'AUDIO' },
        error: null
      });

      // Mock asset AUDIO não existe
      const mockAssetChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockAssetChain);
      mockAssetChain.single.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await stateMachine.advanceStatus('os-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Asset de AUDIO é obrigatório para avançar para CAPTACAO');
    });

    it('deve avançar de EDICAO para REVISAO quando todos os assets obrigatórios existem', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'EDICAO' },
        error: null
      });

      // Mock assets obrigatórios existem
      const mockAssetChain1 = createMockChain();
      const mockAssetChain2 = createMockChain();
      const mockAssetChain3 = createMockChain();
      mockSupabase.from
        .mockReturnValueOnce(mockAssetChain1)
        .mockReturnValueOnce(mockAssetChain2)
        .mockReturnValueOnce(mockAssetChain3);
      mockAssetChain1.single.mockResolvedValueOnce({ data: [{ id: 'edit-1', tipo: 'EDIT_V1' }], error: null });
      mockAssetChain2.single.mockResolvedValueOnce({ data: [{ id: 'legenda-1', tipo: 'LEGENDA' }], error: null });
      mockAssetChain3.single.mockResolvedValueOnce({ data: [{ id: 'thumb-1', tipo: 'THUMB' }], error: null });

      // Mock usuário responsável
      const mockUserChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUserChain);
      mockUserChain.single.mockResolvedValueOnce({
        data: { id: 'user-revisor' },
        error: null
      });

      // Mock update
      const mockUpdateChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUpdateChain);
      mockUpdateChain.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await stateMachine.advanceStatus('os-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('REVISAO');
    });

    it('deve definir SLA correto para cada etapa', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'EDICAO' },
        error: null
      });

      // Mock assets obrigatórios existem
      const mockAssetChain1 = createMockChain();
      const mockAssetChain2 = createMockChain();
      const mockAssetChain3 = createMockChain();
      mockSupabase.from
        .mockReturnValueOnce(mockAssetChain1)
        .mockReturnValueOnce(mockAssetChain2)
        .mockReturnValueOnce(mockAssetChain3);
      mockAssetChain1.single.mockResolvedValueOnce({ data: [{ id: 'edit-1' }], error: null });
      mockAssetChain2.single.mockResolvedValueOnce({ data: [{ id: 'legenda-1' }], error: null });
      mockAssetChain3.single.mockResolvedValueOnce({ data: [{ id: 'thumb-1' }], error: null });

      // Mock usuário responsável
      const mockUserChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUserChain);
      mockUserChain.single.mockResolvedValueOnce({
        data: { id: 'user-revisor' },
        error: null
      });

      // Mock update
      const mockUpdateChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUpdateChain);
      mockUpdateChain.eq.mockResolvedValueOnce({ error: null });

      await stateMachine.advanceStatus('os-1', 'user-1');

      // Verificar se o SLA foi definido (48h para EDICAO -> REVISAO)
      expect(mockUpdateChain.eq).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'REVISAO',
          sla_atual: expect.any(String)
        })
      );
    });
  });

  describe('rejectOS', () => {
    it('deve reprovar OS e retornar para etapa anterior', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { 
          id: 'os-1', 
          status: 'AUDIO',
          aprovado_interno: false,
          aprovado_crispim: false
        },
        error: null
      });

      // Mock usuário responsável da etapa anterior
      const mockUserChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUserChain);
      mockUserChain.single.mockResolvedValueOnce({
        data: { id: 'user-copy' },
        error: null
      });

      // Mock update
      const mockUpdateChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUpdateChain);
      mockUpdateChain.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await stateMachine.rejectOS('os-1', 'Audio com qualidade ruim', 'user-revisor');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('ROTEIRO');
    });

    it('deve gravar log de reprovação', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { 
          id: 'os-1', 
          status: 'REVISAO',
          aprovado_interno: false,
          aprovado_crispim: false
        },
        error: null
      });

      // Mock usuário responsável
      const mockUserChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUserChain);
      mockUserChain.single.mockResolvedValueOnce({
        data: { id: 'user-editor' },
        error: null
      });

      // Mock update
      const mockUpdateChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUpdateChain);
      mockUpdateChain.eq.mockResolvedValueOnce({
        error: null
      });

      // Mock insert para log
      const mockInsertChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockInsertChain);
      mockInsertChain.insert.mockResolvedValueOnce({ error: null });

      await stateMachine.rejectOS('os-1', 'Precisa ajustar cortes', 'user-revisor');

      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          os_id: 'os-1',
          user_id: 'user-revisor',
          acao: 'REPROVAR',
          detalhe: expect.stringContaining('Precisa ajustar cortes')
        })
      );
    });

    it('deve bloquear reprovação de ROTEIRO (primeira etapa)', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'ROTEIRO' },
        error: null
      });

      const result = await stateMachine.rejectOS('os-1', 'Motivo qualquer', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Não é possível reprovar desta etapa');
    });
  });

  describe('markAsPosted', () => {
    it('deve marcar OS como POSTADO quando está em AGENDAMENTO', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS em AGENDAMENTO
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'AGENDAMENTO' },
        error: null
      });

      // Mock update
      const mockUpdateChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockUpdateChain);
      mockUpdateChain.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await stateMachine.markAsPosted('os-1');

      expect(result.success).toBe(true);
    });

    it('deve bloquear marcação como POSTADO se não estiver em AGENDAMENTO', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS em status diferente
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'EDICAO' },
        error: null
      });

      const result = await stateMachine.markAsPosted('os-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OS deve estar em AGENDAMENTO para ser marcada como postada');
    });
  });

  describe('Validações específicas', () => {
    it('deve bloquear REVISAO->APROVACAO sem aprovação interna', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'REVISAO' },
        error: null
      });

      // Mock OS sem aprovação interna
      const mockApprovalChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockApprovalChain);
      mockApprovalChain.single.mockResolvedValueOnce({
        data: { aprovado_interno: false },
        error: null
      });

      const result = await stateMachine.advanceStatus('os-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Aprovação interna é obrigatória para avançar para APROVACAO');
    });

    it('deve bloquear APROVACAO->AGENDAMENTO sem aprovação do Crispim', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'APROVACAO' },
        error: null
      });

      // Mock OS sem aprovação do Crispim
      const mockApprovalChain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(mockApprovalChain);
      mockApprovalChain.single.mockResolvedValueOnce({
        data: { aprovado_crispim: false },
        error: null
      });

      const result = await stateMachine.advanceStatus('os-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Aprovação do Crispim é obrigatória para avançar para AGENDAMENTO');
    });

    it('deve bloquear AGENDAMENTO->POSTADO (só via webhook)', async () => {
      const mockChain = createMockChain();
      mockSupabase.from.mockReturnValue(mockChain);
      
      // Mock OS atual
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'os-1', status: 'AGENDAMENTO' },
        error: null
      });

      const result = await stateMachine.advanceStatus('os-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transição para POSTADO só é permitida via webhook');
    });
  });
}
)