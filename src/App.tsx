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
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { ConsertoIphonePage } from '@/pages/seo/ConsertoIphonePage';
import { TrocaBateriaIphonePage } from '@/pages/seo/TrocaBateriaIphonePage';
import { TrocaTelaIphonePage } from '@/pages/seo/TrocaTelaIphonePage';
import { TrocaVidroIphonePage } from '@/pages/seo/TrocaVidroIphonePage';
import { VidroTraseiroIphonePage } from '@/pages/seo/VidroTraseiroIphonePage';
import { useMemo } from 'react';
import { SEO_CONFIG } from '@/seo/config';
import { SEO_ROUTES } from '@/seo/routes';
import { SeoHead } from '@/seo/SeoHead';
import { homeSchemas } from '@/seo/schemas';

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <SeoHead meta={SEO_ROUTES.admin} />
      <AdminLayout>{children}</AdminLayout>
    </RequireAdmin>
  );
}

function HomeRoute() {
  const schemas = useMemo(() => homeSchemas(SEO_ROUTES.home, SEO_CONFIG.siteUrl), []);
  return (
    <PublicLayout wide>
      <SeoHead meta={SEO_ROUTES.home} schemas={schemas} />
      <HomePage />
    </PublicLayout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/agendar" element={
                <PublicLayout>
                  <SeoHead meta={SEO_ROUTES.agendar} />
                  <BookingPage />
                </PublicLayout>
              }
            />
            {/* Landings SEO (Fase 2A/2B): com e sem barra final rendem o mesmo
                conteúdo; o canonical aponta sempre para a versão com barra. */}
            {['/conserto-iphone', '/conserto-iphone/'].map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <PublicLayout wide>
                    <ConsertoIphonePage />
                  </PublicLayout>
                }
              />
            ))}
            {['/troca-tela-iphone', '/troca-tela-iphone/'].map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <PublicLayout wide>
                    <TrocaTelaIphonePage />
                  </PublicLayout>
                }
              />
            ))}
            {['/troca-bateria-iphone', '/troca-bateria-iphone/'].map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <PublicLayout wide>
                    <TrocaBateriaIphonePage />
                  </PublicLayout>
                }
              />
            ))}
            {['/troca-vidro-iphone', '/troca-vidro-iphone/'].map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <PublicLayout wide>
                    <TrocaVidroIphonePage />
                  </PublicLayout>
                }
              />
            ))}
            {['/vidro-traseiro-iphone', '/vidro-traseiro-iphone/'].map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <PublicLayout wide>
                    <VidroTraseiroIphonePage />
                  </PublicLayout>
                }
              />
            ))}
            <Route
              path="/admin/login"
              element={
                <>
                  <SeoHead meta={SEO_ROUTES.admin} />
                  <LoginPage />
                </>
              }
            />
            <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
            <Route path="/admin/agendamentos" element={<Protected><AdminAgendamentos /></Protected>} />
            <Route path="/admin/precos" element={<Protected><AdminPrecos /></Protected>} />
            <Route path="/admin/servicos" element={<Protected><AdminServicos /></Protected>} />
            <Route path="/admin/modelos" element={<Protected><AdminModelos /></Protected>} />
            <Route
              path="/admin/negado"
              element={
                <>
                  <SeoHead meta={SEO_ROUTES.admin} />
                  <AdminDenied />
                </>
              }
            />
            <Route path="/admin/*" element={<Navigate to="/admin/agendamentos" replace />} />
            <Route
              path="*"
              element={
                <PublicLayout>
                  <NotFoundPage />
                </PublicLayout>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
