import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { AdminDenied, RequireAdmin } from '@/auth/RequireAdmin';
import { AdminLayout, PublicLayout } from '@/components/layout/Layout';
import { ToastProvider } from '@/components/ui/Toast';
import { AdminAgendamentos } from '@/pages/admin/AgendamentosPage';
import { AdminDashboard } from '@/pages/admin/AdminPages';
import { LoginPage } from '@/pages/admin/LoginPage';
import { AdminModelos } from '@/pages/admin/ModelosPage';
import { AdminPrecos } from '@/pages/admin/PrecosPage';
import { AdminServicos } from '@/pages/admin/ServicosPage';
import { BookingPage } from '@/pages/booking/BookingPage';
import { HomePage } from '@/pages/public/HomePage';

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <AdminLayout>{children}</AdminLayout>
    </RequireAdmin>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<PublicLayout wide><HomePage /></PublicLayout>} />
            <Route path="/agendar" element={<PublicLayout><BookingPage /></PublicLayout>} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
            <Route path="/admin/agendamentos" element={<Protected><AdminAgendamentos /></Protected>} />
            <Route path="/admin/precos" element={<Protected><AdminPrecos /></Protected>} />
            <Route path="/admin/servicos" element={<Protected><AdminServicos /></Protected>} />
            <Route path="/admin/modelos" element={<Protected><AdminModelos /></Protected>} />
            <Route path="/admin/negado" element={<AdminDenied />} />
            <Route path="/admin/*" element={<Navigate to="/admin/agendamentos" replace />} />
            <Route
              path="*"
              element={
                <PublicLayout>
                  <div className="rounded-3xl border border-linha bg-musgo p-8 text-center">
                    <h1 className="font-display text-xl font-extrabold text-gelo">Página não encontrada</h1>
                    <a href="/" className="mt-2 inline-block font-semibold text-lima">Voltar ao início</a>
                  </div>
                </PublicLayout>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
