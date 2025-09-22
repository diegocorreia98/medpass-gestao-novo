import { useSidebar } from "@/components/ui/sidebar";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Home, Calculator, UserPlus, Users, Wallet, FileText, User, Settings, LogOut, Building2, Bell, BookOpen, Award } from "lucide-react";
const mainItems = [{
  title: "Dashboard",
  url: "/unidade",
  icon: Home
}, {
  title: "Gerar Orçamento",
  url: "/unidade/orcamento",
  icon: Calculator
}, {
  title: "Adesão",
  url: "/unidade/adesao",
  icon: UserPlus
}];
const capacitacaoItems = [{
  title: "Cursos",
  url: "/learn",
  icon: BookOpen
}, {
  title: "Certificados",
  url: "/learn/certificates",
  icon: Award
}];
const gestaoItems = [{
  title: "Gestão de Cliente",
  url: "/unidade/gestao-cliente",
  icon: Users
}, {
  title: "Gestão de Empresas",
  url: "/gestao-empresas",
  icon: Building2
}];
const financeiroItems = [{
  title: "Carteira",
  url: "/unidade/carteira",
  icon: Wallet
}, {
  title: "Relatórios",
  url: "/unidade/relatorios",
  icon: FileText
}];
const perfilItems = [{
  title: "Perfil",
  url: "/perfil",
  icon: User
}, {
  title: "Configurações",
  url: "/configuracoes",
  icon: Settings
}, {
  title: "Notificações",
  url: "/unidade/notificacoes",
  icon: Bell
}];
export function UnidadeSidebar() {
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const isActive = (path: string): boolean => {
    if (path === '/unidade') {
      return location.pathname === '/unidade';
    }
    if (path === '/learn') {
      // Para a rota /learn, só deve estar ativa se for exatamente /learn, não subrotas
      return location.pathname === '/learn';
    }
    if (path === '/learn/certificates') {
      return location.pathname === '/learn/certificates';
    }
    return location.pathname.startsWith(path);
  };
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted";
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso"
      });

      // Navegar para a página de login
      navigate('/auth', {
        replace: true
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout",
        variant: "destructive"
      });
      // Mesmo com erro, tenta navegar para o login
      navigate('/auth', {
        replace: true
      });
    }
  };
  return <Sidebar variant="sidebar" collapsible="icon" className={`border-r ${collapsed ? "w-16" : "w-64"}`}>
      <SidebarHeader className="border-b p-4 py-[20px] px-[11px]">
        <div className="flex items-center gap-2">
          <img src="/uploads/a0aab2d0-5286-4fc7-a719-8f4ae1aa104c.png" alt="Medpass Logo" className="h-6 w-auto" />
          {!collapsed && <div>
              <h2 className="font-semibold text-foreground">Painel MedPass</h2>
              
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls({
                  isActive: isActive(item.url)
                })}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            Capacitação
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-900 border-green-200 hover:bg-green-100"
            >
              NOVO ⭐️
            </Badge>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {capacitacaoItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls({
                  isActive: isActive(item.url)
                })}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {gestaoItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls({
                  isActive: isActive(item.url)
                })}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Financeiro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeiroItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls({
                  isActive: isActive(item.url)
                })}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {perfilItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls({
                  isActive: isActive(item.url)
                })}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
              <SidebarMenuItem>
                <SidebarMenuButton className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}