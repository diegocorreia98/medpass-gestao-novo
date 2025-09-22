import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Layout } from "./components/layout/Layout";
import { PanelProvider } from "./contexts/PanelContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Orcamento from "./pages/Orcamento";
import Orcamentos from "./pages/Orcamentos";
import Adesao from "./pages/Adesao";
import Cancelamento from "./pages/Cancelamento";
import Planos from "./pages/Planos";
import Admin from "./pages/Admin";
import UnidadeDashboard from "./pages/unidade/UnidadeDashboard";
import UnidadeOrcamento from "./pages/unidade/UnidadeOrcamento";
import UnidadeAdesao from "./pages/unidade/UnidadeAdesao";
import UnidadeCancelamento from "./pages/unidade/UnidadeCancelamento";
import GestaoCliente from "./pages/unidade/GestaoCliente";
import Carteira from "./pages/unidade/Carteira";
import Relatorios from "./pages/unidade/Relatorios";
import NotificacoesHistorico from "./pages/unidade/NotificacoesHistorico";


import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SubscriptionCheckout from "./pages/SubscriptionCheckout";
import Franqueados from "./pages/Franqueados";
import FranqueadoDetalhes from "./pages/FranqueadoDetalhes";
import ApiLogs from "./pages/ApiLogs";
import Transacoes from "./pages/Transacoes";
import { GestaoEmpresas } from "./pages/GestaoEmpresas";
import GestaoUnidades from "./pages/GestaoUnidades";
import { Login } from "./pages/auth/Login";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";
import { AcceptInvite } from "./pages/auth/AcceptInvite";
import Franquias from "./pages/Franquias";
import Checkout from "./pages/Checkout";
import TransparentCheckout from "./pages/TransparentCheckout";
import NotificationTest from "./pages/NotificationTest";
import CoursesPage from "./pages/courses/CoursesPage";
import CreateCoursePage from "./pages/courses/CreateCoursePage";
import EditCoursePage from "./pages/courses/EditCoursePage";
import CourseDetailPage from "./pages/courses/CourseDetailPage";
import LearnPage from "./pages/learn/LearnPage";
import CourseViewerPage from "./pages/learn/CourseViewerPage";
import CertificatesPage from "./pages/learn/CertificatesPage";
import CertificateTemplates from "./pages/admin/CertificateTemplates";
import EditCertificateTemplate from "./pages/admin/EditCertificateTemplate";
import TestCertificates from "./pages/TestCertificates";
import TestCourses from "./pages/TestCourses";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="lovable-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PanelProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/transparent" element={<TransparentCheckout />} />
              <Route path="/subscription-checkout/:token" element={<SubscriptionCheckout />} />
              
              {/* Auth Routes - Public */}
              <Route path="/auth" element={<Login />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/convite/:token" element={<AcceptInvite />} />
              
              {/* Protected Routes - Matriz */}
              <Route path="/dashboard" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/orcamento" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Orcamento /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/orcamentos" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Orcamentos /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/adesao" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Adesao /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/cancelamento" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Cancelamento /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/planos" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Planos /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Admin /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/certificate-templates" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><CertificateTemplates /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/certificate-templates/:templateId/edit" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><EditCertificateTemplate /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/gestao-unidades" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><GestaoUnidades /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/franquias" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Franquias /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/franqueados" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Franqueados /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/franqueados/:cuf" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><FranqueadoDetalhes /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/api-logs" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><ApiLogs /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/transacoes" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><Transacoes /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/gestao-empresas" element={
                <ProtectedRoute>
                  <Layout><GestaoEmpresas /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/notification-test" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><NotificationTest /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/test-certificates" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><TestCertificates /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/test-courses" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><TestCourses /></Layout>
                </ProtectedRoute>
              } />

              {/* Courses Routes - Matriz */}
              <Route path="/courses" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><CoursesPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/courses/new" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><CreateCoursePage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/courses/:courseId" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><CourseDetailPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/courses/:courseId/edit" element={
                <ProtectedRoute requiredUserType="matriz">
                  <Layout><EditCoursePage /></Layout>
                </ProtectedRoute>
              } />

              {/* Protected Routes - Unidade */}
              <Route path="/unidade" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><UnidadeDashboard /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/unidade/orcamento" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><UnidadeOrcamento /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/unidade/adesao" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><UnidadeAdesao /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/unidade/cancelamento" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><UnidadeCancelamento /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/unidade/gestao-cliente" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><GestaoCliente /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/unidade/carteira" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><Carteira /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/unidade/relatorios" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><Relatorios /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/unidade/notificacoes" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><NotificacoesHistorico /></Layout>
                </ProtectedRoute>
              } />

              {/* Learning Routes - Unidade */}
              <Route path="/learn" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><LearnPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/learn/courses/:courseId" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><CourseViewerPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/learn/certificates" element={
                <ProtectedRoute requiredUserType="unidade">
                  <Layout><CertificatesPage /></Layout>
                </ProtectedRoute>
              } />

              {/* Shared Protected Routes */}
              <Route path="/perfil" element={
                <ProtectedRoute>
                  <Layout><Profile /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute>
                  <Layout><Settings /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            </PanelProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
