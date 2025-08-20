import { useState, useRef } from 'react';
import { Upload, FileText, Wand2, Download, AlertTriangle, CheckCircle, X, Sparkles, Brain, Zap, Edit, Save, ArrowLeft } from 'lucide-react';
import { showToast } from '../components/ui/Toast';

interface ParsedOS {
  titulo: string;
  descricao: string;
  marca: string;
  objetivo: string;
  tipo: string;
  prioridade: string;
  canais: string[];
  gancho?: string;
  cta?: string;
  script_text?: string;
  legenda?: string;
  prazo?: string;
  raw_media_links: string[];
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ item: string; error: string }>;
}

export function ImportarOSPage() {
  const [dragActive, setDragActive] = useState(false);
  const [text, setText] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('RAYTCHEL');
  const [parsedItems, setParsedItems] = useState<ParsedOS[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedOS | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/brands`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data.filter((brand: any) => brand.is_active));
      }
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
    } finally {
      setBrandsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const loadingToast = showToast.loading('Processando arquivo...');
    
    try {
      let fileText = '';
      
      if (file.type === 'application/pdf') {
        // For PDF files, we'd need a PDF parser
        showToast.error('Arquivos PDF não são suportados ainda. Use .txt ou .md');
        return;
      } else {
        fileText = await file.text();
      }
      
      setText(fileText);
      showToast.success('Arquivo carregado com sucesso!');
    } catch (error) {
      showToast.error('Erro ao ler arquivo');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const parseText = async () => {
    if (!text.trim()) {
      showToast.error('Digite ou cole algum texto para processar');
      return;
    }

    setLoading(true);
    const loadingToast = showToast.loading('Analisando texto com IA...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/import/parse`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          brandDefault: selectedBrand
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro na análise (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }

      const result = await response.json();
      setParsedItems(result.items || []);
      setShowPreview(true);
      
      // Carregar marcas para edição
      await fetchBrands();
      
      showToast.success(`${result.items?.length || 0} OS identificadas no texto!`);
    } catch (error) {
      console.error('Erro ao analisar texto:', error);
      showToast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...parsedItems[index] });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editForm) {
      const updatedItems = [...parsedItems];
      updatedItems[editingIndex] = editForm;
      setParsedItems(updatedItems);
      setEditingIndex(null);
      setEditForm(null);
      showToast.success('OS atualizada com sucesso!');
    }
  };

  const handleCanaisChange = (canal: string, checked: boolean) => {
    if (!editForm) return;
    
    if (checked) {
      setEditForm(prev => ({
        ...prev!,
        canais: [...prev!.canais, canal]
      }));
    } else {
      setEditForm(prev => ({
        ...prev!,
        canais: prev!.canais.filter(c => c !== canal)
      }));
    }
  };

  const commitToDatabase = async () => {
    if (parsedItems.length === 0) return;

    setLoading(true);
    const loadingToast = showToast.loading(`Criando ${parsedItems.length} OS...`);

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/import/commit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: parsedItems })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro ao criar OS (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }

      const result = await response.json();
      setImportResult(result);
      
      if (result.errors.length > 0) {
        showToast.warning(`${result.created} OS criadas com sucesso! ${result.errors.length} falharam.`);
      } else {
        showToast.success(`🚀 Perfeito! ${result.created} ideias enviadas para aprovação!`);
      }
    } catch (error) {
      console.error('Erro ao criar OS:', error);
      showToast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setText('');
    setParsedItems([]);
    setShowPreview(false);
    setImportResult(null);
    setEditingIndex(null);
    setEditForm(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = `IDEIA 1:
Título: Como fazer maquiagem natural para o dia a dia
Descrição: Tutorial passo a passo para uma maquiagem leve e natural
Gancho: Você não vai acreditar como é fácil!
CTA: Salva esse post e marca uma amiga!
Roteiro: Mostrar produtos básicos e aplicação simples
Legenda: Como fazer maquiagem natural para o dia a dia ✨ Tutorial completo no vídeo! Qual produto você mais usa? #maquiagem #beleza #tutorial #natural
Prazo: 2025-01-25

IDEIA 2:
Título: Benefícios do skincare noturno
Descrição: Por que sua pele precisa de cuidados especiais à noite
Gancho: O segredo para acordar com pele perfeita
CTA: Comenta qual produto você usa à noite!
Legenda: Os benefícios do skincare noturno que você precisa conhecer 🌙 Sua pele agradece! Qual seu produto favorito para a noite? #skincare #cuidados #noite #pele
Prazo: 2025-01-27

IDEIA 3:
Título: Promoção especial de harmonização facial
Descrição: Desconto exclusivo para novos clientes
Gancho: Últimas vagas com 50% de desconto!
Legenda: 🚨 PROMOÇÃO ESPECIAL! 50% OFF em harmonização facial. Últimas vagas disponíveis! Link na bio para agendar 💉 #promocao #harmonizacao #desconto #estetica
Prazo: 2025-01-22
CTA: Link na bio para agendar!`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-importacao-os.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast.success('Template baixado com sucesso!');
  };

  const getObjetivoColor = (objetivo: string) => {
    switch (objetivo) {
      case 'ATRACAO': return 'bg-blue-100 text-blue-700';
      case 'NUTRICAO': return 'bg-green-100 text-green-700';
      case 'CONVERSAO': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'EDUCATIVO': return 'bg-emerald-100 text-emerald-700';
      case 'HISTORIA': return 'bg-amber-100 text-amber-700';
      case 'CONVERSAO': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'HIGH': return 'bg-red-100 text-red-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const objetivoOptions = [
    { value: 'ATRACAO', label: 'Atração' },
    { value: 'NUTRICAO', label: 'Nutrição' },
    { value: 'CONVERSAO', label: 'Conversão' }
  ];

  const tipoOptions = [
    { value: 'EDUCATIVO', label: 'Educativo' },
    { value: 'HISTORIA', label: 'História' },
    { value: 'CONVERSAO', label: 'Conversão' }
  ];

  const prioridadeOptions = [
    { value: 'LOW', label: 'Baixa' },
    { value: 'MEDIUM', label: 'Média' },
    { value: 'HIGH', label: 'Alta' }
  ];

  const canaisOptions = [
    'Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Twitter', 'Stories', 'Reels', 'Threads', 'Pinterest'
  ];

  if (importResult) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Importação Concluída!</h2>
            <p className="text-gray-600">Resultado da importação das OS</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{importResult.created}</div>
              <div className="text-green-700 font-medium">OS Criadas</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{importResult.skipped}</div>
              <div className="text-yellow-700 font-medium">Duplicadas</div>
            </div>
            <div className="bg-red-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{importResult.errors.length}</div>
              <div className="text-red-700 font-medium">Erros</div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Erros Encontrados:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="font-medium text-red-800">{error.item}</div>
                    <div className="text-sm text-red-600">{error.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <button
              onClick={resetForm}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Importar Mais OS
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">OS Identificadas pela IA</h2>
                  <p className="text-blue-100">{parsedItems.length} ordens de serviço encontradas</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {parsedItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 flex-1">
                      {item.titulo}
                    </h3>
                    <div className="flex items-center space-x-2 ml-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <button
                        onClick={() => startEdit(index)}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        title="Editar OS"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {item.descricao}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Marca:</span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                        {item.marca}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Objetivo:</span>
                      <span className={`text-xs px-2 py-1 rounded ${getObjetivoColor(item.objetivo)}`}>
                        {item.objetivo}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Tipo:</span>
                      <span className={`text-xs px-2 py-1 rounded ${getTipoColor(item.tipo)}`}>
                        {item.tipo}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Prioridade:</span>
                      <span className={`text-xs px-2 py-1 rounded ${getPrioridadeColor(item.prioridade)}`}>
                        {item.prioridade}
                      </span>
                    </div>

                    {item.canais.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">Canais:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.canais.map((canal, canalIndex) => (
                            <span key={canalIndex} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {canal}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.gancho && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">Gancho:</span>
                        <p className="text-xs text-gray-700 italic">"{item.gancho}"</p>
                      </div>
                    )}

                    {item.cta && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">CTA:</span>
                        <p className="text-xs text-gray-700 font-medium">"{item.cta}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowPreview(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={commitToDatabase}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>{loading ? 'Enviando...' : `Enviar ${parsedItems.length} Ideias para Aprovação`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal de Edição */}
        {editingIndex !== null && editForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Editar OS #{editingIndex + 1}
                </h3>
                <button
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Título */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={editForm.titulo}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, titulo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Título da OS"
                  />
                </div>

                {/* Descrição */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <textarea
                    value={editForm.descricao}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, descricao: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Descrição detalhada"
                  />
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca *
                  </label>
                  {brandsLoading ? (
                    <div className="flex items-center justify-center py-3 border border-gray-300 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600 text-sm">Carregando...</span>
                    </div>
                  ) : (
                    <select
                      value={editForm.marca}
                      onChange={(e) => setEditForm(prev => ({ ...prev!, marca: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    >
                      {brands.map(brand => (
                        <option key={brand.code} value={brand.code}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Objetivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objetivo *
                  </label>
                  <select
                    value={editForm.objetivo}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, objetivo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {objetivoOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={editForm.tipo}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, tipo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {tipoOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prioridade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    value={editForm.prioridade}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, prioridade: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {prioridadeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gancho */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gancho
                  </label>
                  <textarea
                    value={editForm.gancho || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, gancho: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Gancho principal do conteúdo"
                  />
                </div>

                {/* CTA */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Call to Action (CTA)
                  </label>
                  <input
                    type="text"
                    value={editForm.cta || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, cta: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Ex: Acesse o link na bio para saber mais"
                  />
                </div>

                {/* Canais */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Canais de Distribuição
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {canaisOptions.map(canal => (
                      <label key={canal} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.canais.includes(canal)}
                          onChange={(e) => handleCanaisChange(canal, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{canal}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Script */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roteiro / Script
                  </label>
                  <textarea
                    value={editForm.script_text || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, script_text: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none font-mono text-sm"
                    rows={8}
                    placeholder="Roteiro detalhado do conteúdo"
                  />
                </div>

                {/* Legenda */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Legenda
                  </label>
                  <textarea
                    value={editForm.legenda || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, legenda: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                    rows={6}
                    placeholder="Legenda para redes sociais com hashtags"
                  />
                </div>

                {/* Prazo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={editForm.prazo || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev!, prazo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={cancelEdit}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
                <button
                  onClick={saveEdit}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Upload className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Importar OS com IA</h1>
        </div>
        <p className="text-gray-600">
          Use inteligência artificial para extrair ordens de serviço de arquivos de texto
        </p>
      </div>

      <div className="space-y-8">
        {/* Brand Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Marca Padrão</h3>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          >
            <option value="RAYTCHEL">Raytchel</option>
            <option value="ZAFFIRA">Zaffira</option>
            <option value="ZAFF">Zaff</option>
            <option value="CRISPIM">Crispim</option>
            <option value="FAZENDA">Fazenda</option>
          </select>
          <p className="text-sm text-gray-500 mt-2">
            Marca que será aplicada às OS identificadas (pode ser alterada individualmente depois)
          </p>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload de Arquivo</h3>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </h4>
            <p className="text-gray-600 mb-4">
              Suporta: .txt, .md, .docx (PDF em breve)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.docx"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Selecionar Arquivo
              </button>
              <button
                onClick={downloadTemplate}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Template</span>
              </button>
            </div>
          </div>
        </div>

        {/* Text Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ou Cole o Texto Diretamente</h3>
          
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none font-mono text-sm"
            placeholder="Cole aqui o texto com as ideias de OS...

Exemplo:
IDEIA 1:
Título: Como fazer maquiagem natural
Descrição: Tutorial para maquiagem do dia a dia
Gancho: Você não vai acreditar como é fácil!

IDEIA 2:
Título: Benefícios do skincare noturno
Descrição: Cuidados especiais para a noite
..."
          />
          
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-500">
              {text.length} caracteres
            </span>
            <button
              onClick={parseText}
              disabled={!text.trim() || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span>{loading ? 'Analisando...' : 'Analisar com IA'}</span>
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">IA Inteligente</h3>
            <p className="text-gray-600 text-sm">
              Identifica automaticamente títulos, descrições, ganchos e CTAs no texto
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Classificação Automática</h3>
            <p className="text-gray-600 text-sm">
              Classifica objetivo, tipo e prioridade baseado no conteúdo
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-6 border border-purple-200">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Edição Flexível</h3>
            <p className="text-gray-600 text-sm">
              Edite qualquer informação após a análise antes de criar as OS
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-2">Dicas para melhor resultado:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Separe cada ideia com "IDEIA X:" ou "---"</li>
                <li>• Inclua título, descrição e gancho quando possível</li>
                <li>• Mencione links de mídia para extração automática</li>
                <li>• Use palavras-chave como "urgente" para prioridade alta</li>
                <li>• Após a análise, clique no ícone de edição para ajustar qualquer informação</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}