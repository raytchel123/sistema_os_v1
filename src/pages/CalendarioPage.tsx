import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Filter, Clock, AlertTriangle, Upload } from 'lucide-react';
import { OSDrawer } from '../components/kanban/OSDrawer';
import { CronogramaUpload } from '../components/cronograma/CronogramaUpload';
import { useCronograma } from '../hooks/useCronograma';
import { showToast } from '../components/ui/Toast';

interface OSEvent {
  id: string;
  titulo: string;
  marca: string;
  status: string;
  prioridade: string;
  prazo: string;
  canais: string[];
}

export function CalendarioPage() {
  const [events, setEvents] = useState<OSEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [filters, setFilters] = useState({
    marca: '',
    plataforma: '',
    responsavel: ''
  });
  const [loading, setLoading] = useState(true);
  const [draggedEvent, setDraggedEvent] = useState<OSEvent | null>(null);
  const [selectedOS, setSelectedOS] = useState<OSEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showCronogramaUpload, setShowCronogramaUpload] = useState(false);
  const { processarCronograma } = useCronograma();

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchEvents();
  }, [currentDate, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const params = new URLSearchParams();
      if (filters.marca) params.append('marca', filters.marca);
      
      const response = await fetch(`${apiUrl}/api/ordens?${params}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.filter((os: any) => os.prazo && os.prazo.trim()));
      }
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getViewStartDate = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      return start;
    } else {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    }
  };

  const getViewEndDate = () => {
    if (viewMode === 'week') {
      const end = new Date(currentDate);
      end.setDate(currentDate.getDate() - currentDate.getDay() + 6);
      return end;
    } else {
      return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleDragStart = (event: OSEvent) => {
    setDraggedEvent(event);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedEvent) return;

    // Fix timezone offset issue - use local date string
    const localDateString = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Update the OS with new date - use PATCH method for partial update
      const response = await fetch(`${apiUrl}/api/ordens/${draggedEvent.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          titulo: draggedEvent.titulo,
          marca: draggedEvent.marca,
          objetivo: draggedEvent.objetivo || 'ATRACAO',
          tipo: draggedEvent.tipo || 'EDUCATIVO',
          status: draggedEvent.status,
          prioridade: draggedEvent.prioridade || 'MEDIUM',
          prazo: localDateString,
        })
      });

      if (response.ok) {
        fetchEvents(); // Refresh events
        showToast.success('Data atualizada com sucesso!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao atualizar data: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro ao mover evento:', err);
      showToast.error('Erro ao mover evento');
    }

    setDraggedEvent(null);
  };

  const openOSDrawer = async (osId: string) => {
    try {
      console.log('🔍 CalendarioPage - Opening drawer for OS:', osId);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${osId}`, { headers });
      
      if (response.ok) {
        const osData = await response.json();
        console.log('📦 CalendarioPage - Raw API response:', osData);
        
        setSelectedOS(osData);
        setIsDrawerOpen(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro ao carregar OS:', response.status, errorData);
      }
    } catch (err) {
      console.error('Erro ao carregar OS:', err);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOS(null);
  };

  const handleUpdate = () => {
    fetchEvents(); // Refresh events after update
  };

  const renderWeekView = () => {
    const startDate = getViewStartDate();
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return (
      <div className="grid grid-cols-7 gap-1 h-96">
        {days.map((day, index) => {
          const dayEvents = events.filter(event => 
            event.prazo === day.toISOString().split('T')[0]
          );

          return (
            <div
              key={index}
              className="border border-gray-200 p-2 min-h-full"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <div className="font-medium text-sm text-gray-700 mb-2">
                {day.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
              </div>
              <div className="space-y-1">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    draggable
                    onDragStart={() => handleDragStart(event)}
                    onClick={() => openOSDrawer(event.id)}
                    className="bg-blue-100 text-blue-800 p-1 rounded text-xs cursor-move hover:bg-blue-200 group"
                    title={`${event.titulo} - ${event.status} - ${event.prioridade}`}
                  >
                    <div className="font-medium truncate">{event.titulo}</div>
                    <div className="text-xs flex items-center justify-between">
                      <span>{event.marca}</span>
                      {event.prioridade === 'HIGH' && (
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startWeek = new Date(startDate);
    startWeek.setDate(startDate.getDate() - startDate.getDay());
    
    const weeks = [];
    let currentWeekStart = new Date(startWeek);
    
    while (currentWeekStart <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeekStart);
        day.setDate(currentWeekStart.getDate() + i);
        week.push(day);
      }
      weeks.push(week);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return (
      <div className="space-y-1">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-700 text-sm">
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const dayEvents = events.filter(event => 
                event.prazo === day.toISOString().split('T')[0]
              );

              return (
                <div
                  key={dayIndex}
                  className={`border border-gray-200 p-1 h-24 ${!isCurrentMonth ? 'bg-gray-50' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className={`text-sm ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={() => handleDragStart(event)}
                        className="bg-blue-100 text-blue-800 p-1 rounded text-xs cursor-move hover:bg-blue-200 truncate"
                      >
                        {event.titulo}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Planejamento</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  viewMode === 'week' 
                    ? 'bg-white shadow-lg text-blue-700 transform scale-105' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  viewMode === 'month' 
                    ? 'bg-white shadow-lg text-blue-700 transform scale-105' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mês
              </button>
            </div>
            
            <button
              onClick={() => setShowCronogramaUpload(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2 font-medium"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Cronograma</span>
            </button>
          </div>
        </div>

        {/* Navigation and Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900">
              {currentDate.toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric',
                ...(viewMode === 'week' && { day: 'numeric' })
              })}
            </h2>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filters.marca}
              onChange={(e) => setFilters(prev => ({ ...prev, marca: e.target.value }))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Todas as marcas</option>
              <option value="RAYTCHEL">Raytchel</option>
              <option value="ZAFFIRA">Zaffira</option>
              <option value="ZAFF">Zaff</option>
              <option value="CRISPIM">Crispim</option>
              <option value="FAZENDA">Fazenda</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {viewMode === 'week' ? renderWeekView() : renderMonthView()}
        </div>
      )}

      <OSDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        ordem={selectedOS}
        onUpdate={handleUpdate}
      />

      {/* Cronograma Upload Modal */}
      {showCronogramaUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Importar Cronograma de Postagens</h3>
              <button
                onClick={() => setShowCronogramaUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <CronogramaUpload
              onItemsLoaded={async (items) => {
                const result = await processarCronograma(items);
                if (result.created > 0) {
                  fetchEvents(); // Refresh calendar
                  setShowCronogramaUpload(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}