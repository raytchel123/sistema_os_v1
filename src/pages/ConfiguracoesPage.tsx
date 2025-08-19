import { Settings } from 'lucide-react';

export function ConfiguracoesPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        </div>
        <p className="text-gray-600">
          Personalize as preferências do sistema e gerencie sua conta
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Configurações em Construção
          </h3>
          <p className="text-gray-600 mb-6">
            Aqui você poderá configurar:<br />
            Preferências de notificação, gerenciar usuários, configurar integrações e personalizar fluxos
          </p>
          <div className="inline-flex px-6 py-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-sm">
            Em desenvolvimento
          </div>
        </div>
      </div>
    </div>
  );
}