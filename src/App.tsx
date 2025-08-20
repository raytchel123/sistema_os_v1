import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { HomeRedirect } from './components/HomeRedirect';
import { KanbanPage } from './pages/KanbanPage';
import { ListaPage } from './pages/ListaPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { MinhasAprovacoesPage } from './pages/MinhasAprovacoesPage';
import { CriarOSPage } from './pages/CriarOSPage';
import { SettingsPage } from './pages/SettingsPage';
import { InboxPage } from './pages/InboxPage';
import { CalendarioPage } from './pages/CalendarioPage';
import { BibliotecaPage } from './pages/BibliotecaPage';
import { IdeiasPage } from './pages/IdeiasPage';
import { PlanejamentoPage } from './pages/PlanejamentoPage';
import { TendenciasPage } from './pages/TendenciasPage';
import { AuditoriaConteudoPage } from './pages/AuditoriaConteudoPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { ImportarOSPage } from './pages/ImportarOSPage';
import { ToastContainer } from './components/ui/Toast';

function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <Router>
        <ProtectedRoute>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeRedirect />} />
              <Route path="kanban" element={<KanbanPage />} />
              <Route path="lista" element={<ListaPage />} />
              <Route path="relatorios" element={<RelatoriosPage />} />
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
              <Route path="aprovacoes" element={<MinhasAprovacoesPage />} />
              <Route path="criar-os" element={<CriarOSPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="calendario" element={<CalendarioPage />} />
              <Route path="biblioteca" element={<BibliotecaPage />} />
              <Route path="ideias" element={<IdeiasPage />} />
              <Route path="planejamento" element={<PlanejamentoPage />} />
              <Route path="tendencias" element={<TendenciasPage />} />
              <Route path="auditoria" element={<AuditoriaConteudoPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="importar" element={<ImportarOSPage />} />
              <Route path="ideias-pendentes" element={<IdeasPendentesPage />} />
            </Route>
          </Routes>
        </ProtectedRoute>
      </Router>
    </AuthProvider>
  );
}

export default App;