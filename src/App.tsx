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
