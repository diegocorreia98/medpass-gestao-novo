import { useState } from "react";
import { LayoutDashboard, FileText, UserPlus, UserMinus, Settings, Database, CreditCard, LogOut, Building2, Users, Activity, Receipt, GitBranch } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
const mainItems = [{
  title: "Dashboard",
  url: "/dashboard",
  icon: LayoutDashboard
}, {
  title: "Gerar Orçamento",
  url: "/orcamento",
  icon: FileText
}, {
  title: "Adesão",
  url: "/adesao",
  icon: UserPlus
}, {
  title: "Cancelamento",
  url: "/cancelamento",
  icon: UserMinus
}, {
  title: "Gestão de Empresas",
  url: "/gestao-empresas",
  icon: Building2
}];
const adminItems = [{
  title: "Painel Admin",
  url: "/admin",
  icon: Settings
}, {
  title: "Logs da API",
  url: "/api-logs",
  icon: Activity
}, {
  title: "Transações",
  url: "/transacoes",
  icon: Receipt
}, {
  title: "Configurar Planos",
  url: "/planos",
  icon: Database
}, {
  title: "Franquias",
  url: "/franquias",
  icon: GitBranch
}, {
  title: "Gestão de Unidades",
  url: "/gestao-unidades",
  icon: Users
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const {
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/dashboard";
    return currentPath.startsWith(path);
  };
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground";
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
  return <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r border-border">
        {/* Header */}
        <div className="p-4 border-b border-border py-[12px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/lovable-uploads/faf8903f-46bf-4454-8de4-8d6f6002cab5.png" alt="MedPass Logo" className="w-8 h-8 object-contain" />
            </div>
            {!isCollapsed && <div>
                <h2 className="font-bold text-foreground">Painel Matriz</h2>
                <p className="text-xs text-muted-foreground">Gestão Central</p>
              </div>}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className={({
                  isActive
                }) => getNavCls({
                  isActive
                })}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={({
                  isActive
                }) => getNavCls({
                  isActive
                })}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="mt-auto p-4 border-t border-border space-y-2">
          <SidebarMenuButton asChild>
            <NavLink to="/configuracoes" className={({ isActive }) => getNavCls({ isActive })}>
              <Settings className="h-4 w-4" />
              {!isCollapsed && <span>Configurações</span>}
            </NavLink>
          </SidebarMenuButton>
          
          <SidebarMenuButton asChild>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>;
}