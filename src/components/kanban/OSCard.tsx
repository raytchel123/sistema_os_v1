interface OSCardProps {
  ordem: any;
  onClick: () => void;
}

export function OSCard({ ordem, onClick }: OSCardProps) {
  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getMarcaColor = (marca: string) => {
    switch (marca) {
      case 'RAYTCHEL': return 'bg-purple-100 text-purple-700';
      case 'ZAFFIRA': return 'bg-blue-100 text-blue-700';
      case 'ZAFF': return 'bg-pink-100 text-pink-700';
      case 'CRISPIM': return 'bg-orange-100 text-orange-700';
      case 'FAZENDA': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 flex-1 mr-2">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-mono">
            #{ordem.numero_os || '---'}
          </span>
          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
            {ordem.titulo}
          </h4>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(ordem.prioridade)}`}>
          {ordem.prioridade}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded ${getMarcaColor(ordem.marca)}`}>
            {ordem.marca}
          </span>
          <span className="text-xs text-gray-500">
            {ordem.objetivo}
          </span>
        </div>
        
        {ordem.responsavel && (
          <div className="flex items-center text-xs text-gray-600">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs font-medium">
                {ordem.responsavel.nome[0].toUpperCase()}
              </span>
            </div>
            <span className="truncate">{ordem.responsavel.nome}</span>
          </div>
        )}
        
          <div className="flex items-center text-xs text-gray-500">
            {formatDate(ordem.dataPublicacaoPrevista) && (
              <span>📅 {   new Date(ordem.data_publicacao_prevista).toLocaleDateString('pt-BR') : </span>
            )}
          </div>
       
      </div>
    </div>
  );
}