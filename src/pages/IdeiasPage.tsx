import React, { useState } from 'react';
import { useEffect } from 'react';
import { Lightbulb, Wand2, Calendar, FileText, Users, Clock, Target, Hash, Sparkles, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

interface GeneratedPauta {
  titulo: string;
  descricao: string;
  marca: string;
  objetivo: string;
  tipo: string;
  status: string;
  prioridade: string;
  gancho: string;
  cta: string;
  canais: string[];
  responsaveis: Record<string, string>;
  prazo: string;
  script_text: string;
  legenda: string;
}

interface GeneratedCronograma {
  items: GeneratedPauta[];
  summary: {
    total: number;
    por_objetivo: {
      ATRACAO: number;
      NUTRICAO: number;
      CONVERSAO: number;
    };
  };
}

// Cores padrão para as marcas
const marcaCores: Record<string, string> = {
  'RAYTCHEL': 'from-pink-500 to-rose-500',
  'ZAFFIRA': 'from-purple-500 to-indigo-500',
  'ZAFF': 'from-blue-500 to-cyan-500',
  'CRISPIM': 'from-green-500 to-emerald-500',
  'FAZENDA': 'from-amber-500 to-orange-500'
};

export function IdeiasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [marcas, setMarcas] = useState<any[]>([]);
  const [marcasLoading, setMarcasLoading] = useState(true);
  const [selectedMarca, setSelectedMarca] = useState<string>('');
  const [ideaText, setIdeaText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPauta, setGeneratedPauta] = useState<GeneratedPauta | null>(null);
  const [generatedCronograma, setGeneratedCronograma] = useState<GeneratedCronograma | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [processingStep, setProcessingStep] = useState('');
  const [isCronograma, setIsCronograma] = useState(false);
  const [quantidadeOS, setQuantidadeOS] = useState(5);
  const [expandedPauta, setExpandedPauta] = useState<number | null>(null);
  const [showAllPautas, setShowAllPautas] = useState(false);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    if (user) {
      fetchMarcas();
    }
  }, [user]);

  const fetchMarcas = async () => {
    if (!user?.org_id) return;

    try {
      setMarcasLoading(true);
      const { supabase } = await import('../lib/supabase');

      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('org_id', user.org_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Erro ao carregar marcas:', error);
        showToast.error('Erro ao carregar marcas');
        return;
      }

      const marcasFormatadas = (data || []).map((brand: any) => ({
        id: brand.code,
        nome: brand.name,
        cor: marcaCores[brand.code] || 'from-gray-500 to-gray-600',
        descricao: brand.description || 'Sem descrição'
      }));
      setMarcas(marcasFormatadas);
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
      showToast.error('Erro ao carregar marcas');
    } finally {
      setMarcasLoading(false);
    }
  };

  const renderPautaPreview = () => {
    if (!showPreview || !generatedPauta) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <h3 className="text-xl font-bold">Pauta Gerada pela IA</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Título</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">{generatedPauta.titulo}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Descrição</label>
                <p className="text-gray-700 mt-1">{generatedPauta.descricao}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Gancho</label>
                <p className="text-gray-700 mt-1 italic">"{generatedPauta.gancho}"</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">CTA</label>
                <p className="text-gray-700 mt-1 font-medium">"{generatedPauta.cta}"</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Marca</label>
                  <span className="inline-block mt-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                    {generatedPauta.marca}
                  </span>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Objetivo</label>
                  <span className="inline-block mt-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {generatedPauta.objetivo}
                  </span>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tipo</label>
                  <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {generatedPauta.tipo}
                  </span>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Prioridade</label>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                    generatedPauta.prioridade === 'HIGH' ? 'bg-red-100 text-red-800' :
                    generatedPauta.prioridade === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {generatedPauta.prioridade}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Canais</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {generatedPauta.canais.map((canal, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                      {canal}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Prazo</label>
                <p className="text-gray-700 mt-1 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {generatedPauta.prazo}
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Roteiro</label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{generatedPauta.script_text}</pre>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Legenda</label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{generatedPauta.legenda}</p>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreateOS}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Criar OS
            </button>
            <button
              onClick={handleVoltar}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCronogramaPreview = () => {
    if (!showPreview || !generatedCronograma) return null;

    const summary = generatedCronograma.summary || { 
      total: generatedCronograma.items?.length || 0, 
      por_objetivo: { ATRACAO: 0, NUTRICAO: 0, CONVERSAO: 0 } 
    };

    const displayItems = showAllPautas ? generatedCronograma.items : generatedCronograma.items.slice(0, 3);

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <h3 className="text-xl font-bold">Cronograma Gerado pela IA</h3>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Total de Pautas</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{summary.por_objetivo.ATRACAO}</p>
              <p className="text-sm text-green-700">Atração</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{summary.por_objetivo.NUTRICAO}</p>
              <p className="text-sm text-blue-700">Nutrição</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Hash className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{summary.por_objetivo.CONVERSAO}</p>
              <p className="text-sm text-purple-700">Conversão</p>
            </div>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-white py-2 border-b">
              <h4 className="font-semibold text-gray-900">
                {showAllPautas ? 'Todas as Pautas' : 'Primeiras 3 Pautas'} ({summary.total} total)
              </h4>
              {summary.total > 3 && (
                <button
                  onClick={() => setShowAllPautas(!showAllPautas)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                >
                  {showAllPautas ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Ver todas ({summary.total})
                    </>
                  )}
                </button>
              )}
            </div>
            
            {displayItems.map((pauta, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedPauta(expandedPauta === index ? null : index)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-gray-900 flex-1">{pauta.titulo}</h5>
                    <div className="flex gap-2 ml-4">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                        {pauta.objetivo}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        {pauta.tipo}
                      </span>
                      {expandedPauta === index ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{pauta.descricao}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pauta.prazo}
                    </span>
                    <span>Gancho: "{pauta.gancho}"</span>
                  </div>
                </div>
                
                {expandedPauta === index && (
                  <div className="border-t bg-gray-50 p-4 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CTA</label>
                      <p className="text-sm text-gray-700 mt-1">"{pauta.cta}"</p>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Canais</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pauta.canais.map((canal, canalIndex) => (
                          <span key={canalIndex} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            {canal}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Roteiro</label>
                      <div className="mt-1 p-3 bg-white rounded border text-xs">
                        <pre className="whitespace-pre-wrap font-mono text-gray-700">{pauta.script_text}</pre>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Legenda</label>
                      <div className="mt-1 p-3 bg-white rounded border text-xs">
                        <p className="text-gray-700">{pauta.legenda}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex gap-3 pt-6 border-t">
            <button
              onClick={handleCreateCronograma}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Criar {summary.total} OS
            </button>
            <button
              onClick={handleVoltar}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleVoltar = () => {
    if (showPreview) {
      setShowPreview(false);
      setGeneratedPauta(null);
      setGeneratedCronograma(null);
      setExpandedPauta(null);
      setShowAllPautas(false);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
      setIdeaText('');
    } else {
      // Reset completo
      setSelectedMarca('');
      setIdeaText('');
      setShowPreview(false);
      setGeneratedPauta(null);
      setGeneratedCronograma(null);
      setCurrentStep(1);
      setExpandedPauta(null);
      setShowAllPautas(false);
    }
  };

  const handleTransformToPauta = async () => {
    if (!selectedMarca || !ideaText.trim()) return;

    setIsProcessing(true);
    setCurrentStep(2);
    
    try {
      setProcessingStep('Conectando com a IA...');
      
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/ai-idea-processor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input: ideaText,
          marca: selectedMarca,
          content_type: isCronograma ? 'cronograma' : 'pauta',
          quantidade: isCronograma ? quantidadeOS : 1
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro na IA (${response.status}): ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (isCronograma) {
        setGeneratedCronograma(result as GeneratedCronograma);
      } else {
        setGeneratedPauta(result as GeneratedPauta);
      }
      
      setShowPreview(true);
      setCurrentStep(3);
    } catch (error) {
      console.error('Erro ao transformar ideia:', error);
      showToast.error(`Erro ao transformar ideia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleCreateOS = async () => {
    if (!generatedPauta) return;

    const loadingToast = showToast.loading('Criando OS...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens`, {
        method: 'POST',
        headers,
        body: JSON.stringify(generatedPauta),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro ao criar OS (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }

      showToast.success('OS criada com sucesso!');
      navigate('/kanban');
    } catch (error) {
      console.error('Erro ao criar OS:', error);
      showToast.error(error instanceof Error ? error.message : 'Erro ao criar OS');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const handleCreateCronograma = async () => {
    if (!generatedCronograma) return;

    const loadingToast = showToast.loading(`Criando ${generatedCronograma.items.length} OS...`);

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      let created = 0;
      let errors = 0;

      for (const pauta of generatedCronograma.items) {
        try {
          const response = await fetch(`${apiUrl}/api/ordens`, {
            method: 'POST',
            headers,
            body: JSON.stringify(pauta),
          });

          if (response.ok) {
            created++;
          } else {
            errors++;
            console.error(`Erro ao criar OS "${pauta.titulo}":`, response.status);
          }
        } catch (error) {
          errors++;
          console.error(`Erro ao criar OS "${pauta.titulo}":`, error);
        }
      }

      if (errors === 0) {
        showToast.success(`${created} OS criadas com sucesso!`);
      } else {
        showToast.warning(`${created} OS criadas com sucesso, ${errors} falharam`);
      }
      
      navigate('/kanban');
    } catch (error) {
      console.error('Erro ao criar cronograma:', error);
      showToast.error(error instanceof Error ? error.message : 'Erro ao criar cronograma');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          {isCronograma ? renderCronogramaPreview() : renderPautaPreview()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
              <Lightbulb className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Transformar Ideia em Pauta</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Use IA para transformar suas ideias em pautas completas e prontas para produção
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300 ${
                  currentStep >= step 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 rounded transition-all duration-300 ${
                    currentStep > step ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Marca Selection */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Escolha a Marca</h2>
              <p className="text-gray-600">Selecione a marca para contextualizar a geração de conteúdo</p>
            </div>
            
            {marcasLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Carregando marcas...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {marcas.map((marca) => (
                  <button
                    key={marca.id}
                    onClick={() => setSelectedMarca(marca.id)}
                    className={`p-6 rounded-xl border-2 transition-all duration-300 text-left group ${
                      selectedMarca === marca.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${marca.cor} mb-4 flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{marca.nome[0]}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{marca.nome}</h3>
                    <p className="text-sm text-gray-600">{marca.descricao}</p>
                    {selectedMarca === marca.id && (
                      <div className="mt-3 flex items-center text-indigo-600">
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center mr-2">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium">Selecionada</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Tipo de Geração */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tipo de Geração</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setIsCronograma(false)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                    !isCronograma
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <FileText className="w-8 h-8 text-indigo-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">Pauta Única</h4>
                  <p className="text-sm text-gray-600">Gera uma pauta completa e detalhada</p>
                </button>
                
                <button
                  onClick={() => setIsCronograma(true)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                    isCronograma
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <Calendar className="w-8 h-8 text-indigo-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">Cronograma Completo</h4>
                  <p className="text-sm text-gray-600">Gera múltiplas pautas variadas sobre o tema</p>
                </button>
              </div>
            </div>

            {/* Quantidade para Cronograma */}
            {isCronograma && (
              <div className="mb-8 p-6 bg-gray-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantidade de Pautas</h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 min-w-0">3</span>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={quantidadeOS}
                    onChange={(e) => setQuantidadeOS(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm font-medium text-gray-700 min-w-0">20</span>
                </div>
                <div className="text-center mt-3">
                  <span className="text-2xl font-bold text-indigo-600">{quantidadeOS}</span>
                  <span className="text-gray-600 ml-2">pautas serão geradas</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedMarca}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Próximo
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Idea Input */}
        {currentStep === 2 && !isProcessing && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isCronograma ? 'Descreva o Tema do Cronograma' : 'Descreva sua Ideia'}
              </h2>
              <p className="text-gray-600">
                {isCronograma 
                  ? `A IA vai gerar ${quantidadeOS} pautas variadas sobre este tema para ${marcas.find(m => m.id === selectedMarca)?.nome}`
                  : `A IA vai transformar sua ideia em uma pauta completa para ${marcas.find(m => m.id === selectedMarca)?.nome}`
                }
              </p>
            </div>
            
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {isCronograma ? 'Tema do Cronograma' : 'Sua Ideia'}
              </label>
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                placeholder={isCronograma 
                  ? "Ex: Cuidados com a pele no verão, dicas de maquiagem para festas, rotina de skincare..."
                  : "Ex: Como fazer uma maquiagem natural para o dia a dia, dicas de skincare para pele oleosa..."
                }
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">
                  {isCronograma ? 'Descreva o tema geral' : 'Seja específico sobre sua ideia'}
                </p>
                <span className="text-sm text-gray-400">{ideaText.length}/500</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleVoltar}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={handleTransformToPauta}
                disabled={!ideaText.trim()}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                {isCronograma ? `Gerar ${quantidadeOS} Pautas` : 'Transformar em Pauta'}
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-6">
                <Wand2 className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isCronograma ? 'Gerando Cronograma...' : 'Transformando Ideia...'}
              </h2>
              <p className="text-gray-600 mb-8">
                {processingStep || (isCronograma ? 'Criando múltiplas pautas variadas...' : 'A IA está analisando sua ideia...')}
              </p>
              
              <div className="space-y-4">
                {[
                  isCronograma ? 'Analisando tema...' : 'Analisando ideia...',
                  isCronograma ? 'Gerando variações...' : 'Criando roteiro...',
                  isCronograma ? 'Otimizando pautas...' : 'Otimizando conteúdo...',
                  'Finalizando...'
                ].map((step, index) => (
                  <div key={index} className="flex items-center justify-center gap-3">
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                      index === 0 ? 'bg-indigo-500 animate-pulse' :
                      index === 1 ? 'bg-indigo-400 animate-pulse delay-200' :
                      index === 2 ? 'bg-indigo-300 animate-pulse delay-500' :
                      'bg-gray-300'
                    }`} />
                    <span className="text-sm text-gray-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}