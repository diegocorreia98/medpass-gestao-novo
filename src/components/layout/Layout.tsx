import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UnidadeSidebar } from "./UnidadeSidebar";
import { PanelSelector } from "./PanelSelector";
import { usePanel } from "@/contexts/PanelContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { User, LogOut, Building2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
interface LayoutProps {
  children: React.ReactNode;
}
export function Layout({
  children
}: LayoutProps) {
  const {
    currentPanel
  } = usePanel();
  const {
    profile,
    signOut
  } = useAuth();
  const {
    profile: userProfile
  } = useProfile();
  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {currentPanel === 'matriz' ? <AppSidebar /> : <UnidadeSidebar />}

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 sm:h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6 py-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <SidebarTrigger className="h-10 w-10 sm:h-auto sm:w-auto" />
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  Sistema de Gestão
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3 lg:gap-4">
              {/* Panel Selector - Hidden on very small screens */}
              <div className="hidden sm:block">
                <PanelSelector />
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 sm:h-8 sm:w-8 touch-manipulation">
                    <Avatar className="h-8 w-8 sm:h-7 sm:w-7">
                      <AvatarImage src={userProfile?.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 sm:w-64" align="end" side="bottom" sideOffset={8}>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm sm:text-base font-medium">
                        {profile?.full_name || 'Usuário'}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                        {profile?.user_type === 'matriz' ? <>
                            <Building2 className="h-3 w-3" />
                            Matriz
                          </> : <>
                            <Store className="h-3 w-3" />
                            Unidade
                          </>}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Panel Selector for mobile */}
                  <div className="sm:hidden">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Painel Ativo
                    </DropdownMenuLabel>
                    <div className="px-2 py-1">
                      <PanelSelector />
                    </div>
                    <DropdownMenuSeparator />
                  </div>

                  <DropdownMenuItem asChild>
                    <Link to="/perfil" className="h-12 sm:h-auto touch-manipulation">
                      <User className="mr-2 h-4 w-4" />
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/configuracoes" className="h-12 sm:h-auto touch-manipulation">
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive h-12 sm:h-auto touch-manipulation"
                    onClick={signOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 bg-muted/30 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>;
}