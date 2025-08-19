import { Calendar, Clock, Tag, FileText, CheckCircle, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';

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

interface CronogramaPreviewProps {
  items: CronogramaItem[];
  onSave: () => void;
  onCancel: () => void;
  loading?: boolean;
  errors?: Array<{ item: string; error: string }>;
}

export function CronogramaPreview({ items, onSave, onCancel, loading, errors }: CronogramaPreviewProps) {
  const getMarcaColor = (marca: string) => {
    const colors = {
      'Raytchel': 'from-purple-500 to-purple-600 text-white',
      'Zaffira18k': 'from-blue-500 to-blue-600 text-white',
      'Zaff': 'from-pink-500 to-pink-600 text-white',
      'Crispim': 'from-orange-500 to-orange-600 text-white',
      'Fazenda': 'from-green-500 to-green-600 text-white'
    };
    return colors[marca as keyof typeof colors] || 'from-gray-500 to-gray-600 text-white';
  };

  const getObjetivoColor = (objetivo: string) => {
    const colors = {
      'Topo de Funil': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Meio de Funil': 'bg-amber-100 text-amber-800 border-amber-200',
      'Fundo de Funil': 'bg-rose-100 text-rose-800 border-rose-200'
    };
    return colors[objetivo as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    return status === 'Gravar' ? (
      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
        <FileText className="w-3 h-3 text-orange-600" />
      </div>
    ) : (
      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-3 h-3 text-green-600" />
      </div>
    );
  };

  const formatDateTime = (data: string, hora: string) => {
    try {
      const [day, month, year] = data.split('/');
      const dateTime = new Date(`${year}-${month}-${day}T${hora}:00`);
      return {
        date: dateTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        time: dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: data, time: hora };
    }
  };

  // Group items by date for timeline visualization
  const itemsByDate = items.reduce((acc, item) => {
    const date = item.data_publicacao;
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, CronogramaItem[]>);

  const sortedDates = Object.keys(itemsByDate).sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });

  const stats = {
    total: items.length,
    marcas: new Set(items.map(i => i.marca)).size,
    dias: sortedDates.length,
    paraGravar: items.filter(i => i.status_inicial === 'Gravar').length,
    topoFunil: items.filter(i => i.objetivo_estrategico === 'Topo de Funil').length,
    meioFunil: items.filter(i => i.objetivo_estrategico === 'Meio de Funil').length,
    fundoFunil: items.filter(i => i.objetivo_estrategico === 'Fundo de Funil').length
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Cronograma Carregado</h2>
              <p className="text-purple-100 text-lg">{items.length} postagens organizadas e prontas</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-300 backdrop-blur-sm border border-white/30 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateAllOS}
              disabled={processing}
              className="px-8 py-3 bg-white text-purple-600 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  <span>Criando OS...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Criar Todas as OS</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors && errors.length > 0 && (
        <div className="mx-8 mt-6 p-6 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Alguns itens precisam de atenção ({errors.length} de {items.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 bg-white/50 rounded-lg p-2">
                    <strong>{error.item}:</strong> {error.error}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="p-8 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total</p>
                <p className="text-2xl font-bold text-purple-900">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Marcas</p>
                <p className="text-2xl font-bold text-blue-900">{stats.marcas}</p>
              </div>
              <Tag className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Dias</p>
                <p className="text-2xl font-bold text-green-900">{stats.dias}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Para Gravar</p>
                <p className="text-2xl font-bold text-orange-900">{stats.paraGravar}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Funnel Distribution */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-gray-600" />
            Distribuição do Funil
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${(stats.topoFunil / stats.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm font-medium text-emerald-700">Topo: {stats.topoFunil}</p>
            </div>
            <div className="text-center">
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${(stats.meioFunil / stats.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm font-medium text-amber-700">Meio: {stats.meioFunil}</p>
            </div>
            <div className="text-center">
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-rose-400 to-rose-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${(stats.fundoFunil / stats.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm font-medium text-rose-700">Fundo: {stats.fundoFunil}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-8 pb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Clock className="w-6 h-6 mr-3 text-gray-600" />
          Timeline de Postagens
        </h3>
        
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {sortedDates.map((date, dateIndex) => {
            const dayItems = itemsByDate[date].sort((a, b) => a.hora_publicacao.localeCompare(b.hora_publicacao));
            const { date: formattedDate } = formatDateTime(date, '00:00');
            
            return (
              <div key={date} className="relative">
                {/* Date Header */}
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg">
                    {formattedDate}
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent ml-4"></div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {dayItems.length} postagens
                  </span>
                </div>
                
                {/* Timeline Items */}
                <div className="space-y-4 ml-4">
                  {dayItems.map((item, index) => {
                    const { time } = formatDateTime(item.data_publicacao, item.hora_publicacao);
                    
                    return (
                      <div key={index} className="relative group">
                        {/* Timeline Line */}
                        <div className="absolute left-6 top-12 bottom-0 w-px bg-gradient-to-b from-gray-300 to-transparent"></div>
                        
                        <div className="flex items-start space-x-4">
                          {/* Time Badge */}
                          <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-3 py-2 rounded-xl font-medium text-sm shadow-lg">
                            {time}
                          </div>
                          
                          {/* Content Card */}
                          <div className="flex-1 bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 group-hover:transform group-hover:scale-[1.02]">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  {getStatusIcon(item.status_inicial)}
                                  <span className={`text-xs px-3 py-1 rounded-full font-medium bg-gradient-to-r ${getMarcaColor(item.marca)} shadow-sm`}>
                                    {item.marca}
                                  </span>
                                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                    {item.plataforma}
                                  </span>
                                </div>
                                <h4 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                                  {item.tema_post}
                                </h4>
                                <span className={`inline-flex items-center text-xs px-3 py-1 rounded-full font-medium border ${getObjetivoColor(item.objetivo_estrategico)}`}>
                                  {item.objetivo_estrategico}
                                </span>
                              </div>
                            </div>
                            
                            {/* Copy Preview */}
                            {item.copy_final && (
                              <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                <p className="text-xs font-medium text-blue-700 mb-2 flex items-center">
                                  <FileText className="w-3 h-3 mr-1" />
                                  Copy Final
                                </p>
                                <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                                  {item.copy_final}
                                </p>
                              </div>
                            )}
                            
                            {/* Media References */}
                            {(item.referencia_visual || item.trilha_sonora) && (
                              <div className="mt-4 flex items-center space-x-4 text-xs">
                                {item.referencia_visual && (
                                  <div className="flex items-center space-x-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                                    <span>📸</span>
                                    <span className="font-medium">{item.referencia_visual}</span>
                                  </div>
                                )}
                                {item.trilha_sonora && (
                                  <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                    <span>🎵</span>
                                    <span className="font-medium">{item.trilha_sonora}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Message */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-t border-green-200 p-6">
        <div className="flex items-center space-x-3 text-green-800">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold">Cronograma validado com sucesso!</p>
            <p className="text-sm text-green-700">
              {stats.total} OS serão criadas automaticamente com datas agendadas. 
              {stats.paraGravar > 0 && ` ${stats.paraGravar} entrarão no fluxo de produção.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}