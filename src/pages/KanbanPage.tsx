import { Link } from 'react-router-dom';
import { useCallback } from 'react';
import { Kanban, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useOrdens } from '../hooks/useOrdens';
import { STATUS_OPTIONS } from '../db/schema';
import { OSCard } from '../components/kanban/OSCard';
import { OSDrawer } from '../components/kanban/OSDrawer';
import { useState } from 'react';

export function KanbanPage() {
  const { ordens, stats, loading, error, safeNum, refetch } = useOrdens();
  const [selectedOrdem, setSelectedOrdem] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = (ordem: any) => {
    setSelectedOrdem(ordem);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOrdem(null);
  };

  const handleUpdate = useCallback(() => {
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Erro: {error}</p>
        </div>
      </div>
    );
  }

  // Agrupar ordens por status
  const ordensGrouped = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = ordens.filter(ordem => ordem.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  return (
<div className="w-full px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
          <Kanban className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Kanban</h1>
          </div>
          <Link
            to="/criar-os"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova OS</span>
          </Link>
        </div>
        <p className="text-gray-600">
          Visualize o fluxo de produção dos seus vídeos em formato de quadro
        </p>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Total OS</p>
                  <p className="text-2xl font-bold text-gray-900">{safeNum(stats.total_os)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Em Aprovação</p>
                  <p className="text-2xl font-bold text-gray-900">{safeNum(stats.aprovacao)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Em Revisão</p>
                  <p className="text-2xl font-bold text-gray-900">{safeNum(stats.revisao)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Publicados</p>
                  <p className="text-2xl font-bold text-gray-900">{safeNum(stats.publicado)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6">
        {STATUS_OPTIONS.map((status) => (
          <div key={status} className="flex-shrink-0 w-80">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 capitalize">
                  {status.toLowerCase().replace('_', ' ')}
                </h3>
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {ordensGrouped[status]?.length || 0}
                </span>
              </div>
              
              <div className="space-y-3">
                {ordensGrouped[status]?.map((ordem) => (
                  <OSCard 
                    key={ordem.id} 
                    ordem={ordem} 
                    onClick={() => openDrawer(ordem)}
                  />
                ))}
                
                {ordensGrouped[status]?.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Kanban className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma OS nesta etapa</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <OSDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        ordem={selectedOrdem}
        onUpdate={handleUpdate}
      />
    </div>
  );
}