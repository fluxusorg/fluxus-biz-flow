import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Building2, Users, FileText, LayoutDashboard, Package, ChevronLeft, ChevronRight, Truck, MapPin, UserCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { profile, company, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isMaster = profile?.role === "master";

  const navItems = isMaster
    ? [
        { label: "Painel", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Funcionários", icon: Users, path: "/employees" },
        { label: "Registros", icon: FileText, path: "/records" },
        { label: "Estoque", icon: Package, path: "/stock" },
        { label: "Veículos", icon: Truck, path: "/vehicles" },
        { label: "Fornecedores", icon: MapPin, path: "/suppliers" },
        { label: "Empresa", icon: Building2, path: "/company" },
        { label: "Meu Perfil", icon: UserCircle, path: "/profile" },
      ]
    : [
        { label: "Painel", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Registros", icon: FileText, path: "/records" },
        { label: "Meu Perfil", icon: UserCircle, path: "/profile" },
      ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col gradient-hero text-primary-foreground transition-all duration-300 ${collapsed ? "w-[72px]" : "w-64"}`}>
        <div className={`p-4 border-b border-white/10 flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <img src={logoIcon} alt="Fluxus" className="h-9 w-9 object-contain shrink-0" />
          {!collapsed && <span className="text-xl font-bold font-display tracking-tight">Fluxus</span>}
        </div>

        {!collapsed && company && (
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
            {company.logo_url ? (
              <img src={company.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <p className="text-sm opacity-80 truncate font-medium">{company.name}</p>
          </div>
        )}

        <nav className={`flex-1 ${collapsed ? "px-1" : "px-3"} py-3 space-y-1 overflow-y-auto`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-4"} py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && item.label}
            </Link>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-auto mb-2 p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`${collapsed ? "px-1" : "px-4"} pb-4 border-t border-white/10 pt-3`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-sm font-bold shrink-0">
                    {profile?.full_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                  <p className="text-xs opacity-60 capitalize">{profile?.role === "master" ? "Gerenciador" : "Funcionário"}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" className="w-full text-white/70 hover:text-white hover:bg-white/10" onClick={signOut} title="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Fluxus" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold font-display">Fluxus</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        {/* Mobile nav overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <img src={logoIcon} alt="Fluxus" className="h-8 w-8 object-contain" />
                <span className="text-lg font-bold font-display">Fluxus</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            {company && (
              <div className="px-4 py-3 border-b flex items-center gap-3">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <p className="text-sm font-medium truncate">{company.name}</p>
              </div>
            )}
            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium ${
                    location.pathname === item.path
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <div className="flex items-center gap-3">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-sm font-bold shrink-0">
                    {profile?.full_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile?.role === "master" ? "Gerenciador" : "Funcionário"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
