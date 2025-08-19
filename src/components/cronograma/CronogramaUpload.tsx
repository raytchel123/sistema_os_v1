import { useState } from 'react';
import { Calendar, Upload, Download, FileText, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import { showToast } from '../ui/Toast';

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

interface CronogramaUploadProps {
  onItemsLoaded: (items: CronogramaItem[]) => void;
  loading?: boolean;
}

export function CronogramaUpload({ onItemsLoaded, loading }: CronogramaUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFile = async (file: File) => {
    console.log('📁 Arquivo recebido:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv') || 
                  fileName.endsWith('.txt') ||
                  file.type === 'text/csv' || 
                  file.type === 'application/vnd.ms-excel' ||
                  file.type === 'text/plain';
    
    if (!isCSV) {
      showToast.error('📄 Por favor, selecione um arquivo CSV válido');
      return;
    }

    const loadingToast = showToast.loading('✨ Interpretando seu cronograma...');
    setUploadProgress(0);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const text = await file.text();
      console.log('📝 Conteúdo do arquivo:', text.substring(0, 200) + '...');
      
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('📋 Arquivo deve ter pelo menos cabeçalho e uma linha de dados');
      }
      
      // Parse CSV with better handling
      const headers = lines[0].split(',').map(h => h.trim());
      const dataLines = lines.slice(1);
      
      const cronogramaData: CronogramaItem[] = [];
      
      for (const line of dataLines) {
        if (!line.trim()) continue;
        
        // Handle CSV with quoted values containing commas
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => 
          v.trim().replace(/^"|"$/g, '')
        ) || line.split(',').map(v => v.trim());
        
        if (values.length < 10) {
          console.warn('Linha com poucas colunas:', line);
          continue;
        }
        
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
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onItemsLoaded(cronogramaData);
        showToast.success(`🎉 ${cronogramaData.length} postagens interpretadas com perfeição!`);
        setUploadProgress(0);
      }, 500);
      
    } catch (error) {
      setUploadProgress(0);
      console.error('❌ Erro no processamento:', error);
      showToast.error(`❌ ${error instanceof Error ? error.message : 'Formato de arquivo não reconhecido'}`);
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
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

  const downloadTemplate = () => {
    const template = `Data de publicação,Hora de publicação,Marca,Plataforma,Tipo de conteúdo,Tema do post,Objetivo estratégico,Roteiro detalhado,Copy final pronta com hashtags,Status inicial,Referência visual,Sugestão de trilha sonora,Lista de Stories do dia
14/08/2025,09:00,Raytchel,Instagram Feed,Feed,Produtividade para empreendedores,Topo de Funil,"Gancho: ""Dica incrível"" | Desenvolvimento: Tutorial passo a passo | CTA: ""Salva esse post""","🚀 Dica incrível para empreendedores! Swipe para ver o passo a passo completo. #empreendedorismo #dicas #produtividade",Gravar,Empreendedor trabalhando,Música motivacional,Stories com bastidores`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-cronograma-raytchel.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast.success('✨ Template baixado! Personalize com seu cronograma.');
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
          <Calendar className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Cronograma Inteligente</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Transforme seu planejamento de conteúdo em OS automáticas. 
          Nossa IA interpreta cada linha e cria um fluxo de produção completo.
        </p>
      </div>

      {/* Template Download */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Template Otimizado</h3>
              <p className="text-sm text-gray-600">Baixe nosso modelo CSV com todas as colunas necessárias</p>
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 font-medium"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Template</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-500 overflow-hidden ${
          dragActive 
            ? 'border-purple-400 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 shadow-2xl transform scale-105' 
            : 'border-gray-300 hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-25 hover:to-blue-25 hover:shadow-lg'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 left-4 w-8 h-8 bg-purple-400 rounded-full animate-pulse"></div>
          <div className="absolute top-12 right-8 w-6 h-6 bg-blue-400 rounded-full animate-pulse delay-300"></div>
          <div className="absolute bottom-8 left-12 w-4 h-4 bg-indigo-400 rounded-full animate-pulse delay-700"></div>
          <div className="absolute bottom-4 right-4 w-10 h-10 bg-purple-300 rounded-full animate-pulse delay-1000"></div>
        </div>

        {/* Progress Bar */}
        {uploadProgress > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
        
        <div className="relative z-10">
          <div className={`w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 ${dragActive ? 'scale-110 rotate-6' : 'hover:scale-105'}`}>
            <Calendar className="w-12 h-12 text-white" />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900">
              {dragActive ? '✨ Solte aqui para processar!' : '📅 Arraste seu cronograma CSV'}
            </h3>
            <p className="text-gray-600 max-w-lg mx-auto leading-relaxed">
              Nossa IA interpretará automaticamente cada linha e criará OS estruturadas com datas agendadas
            </p>
            
            {/* Format Indicators */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">Data/Hora</span>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">Marca</span>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">Plataforma</span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">Roteiro</span>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium">Copy Final</span>
            </div>
            
            <div className="text-xs text-gray-500 mb-4">
              Formatos aceitos: .csv, .txt (separado por vírgulas)
            </div>
            
            <label className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium text-lg">
              <Upload className="w-5 h-5 mr-3" />
              Selecionar Cronograma CSV
              <input
                type="file"
                className="hidden"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-6 border border-emerald-200">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">IA Inteligente</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Interpreta automaticamente cada coluna e mapeia para os campos corretos da OS
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Agendamento Automático</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Converte datas e horários em agendamentos precisos no sistema
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-6 border border-purple-200">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Validação Completa</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Verifica formato, detecta erros e garante que todas as OS sejam criadas corretamente
          </p>
        </div>
      </div>

      {/* Format Guide */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-gray-600" />
          Formato do CSV
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-800 mb-3">Colunas Obrigatórias:</h5>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Data de publicação (DD/MM/AAAA)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Hora de publicação (HH:MM)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-gray-700">Marca (Raytchel, Zaffira18k, etc.)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Tema do post</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">Copy final com hashtags</span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-800 mb-3">Mapeamento Automático:</h5>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                <span className="text-gray-600">Topo de Funil</span>
                <span className="text-emerald-600 font-medium">→ ATRACAO</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                <span className="text-gray-600">Meio de Funil</span>
                <span className="text-amber-600 font-medium">→ NUTRICAO</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                <span className="text-gray-600">Fundo de Funil</span>
                <span className="text-rose-600 font-medium">→ CONVERSAO</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                <span className="text-gray-600">Gravar</span>
                <span className="text-orange-600 font-medium">→ ROTEIRO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Dicas para melhor resultado:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Use aspas duplas para textos com vírgulas: "Gancho: \"Frase com vírgula\""</li>
              <li>• Mantenha datas no formato DD/MM/AAAA e horários em HH:MM</li>
              <li>• Seja específico nos roteiros para melhor interpretação da IA</li>
              <li>• Inclua hashtags relevantes na copy final</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}