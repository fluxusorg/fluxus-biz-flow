import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Building2, Users, FileText, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { profile, company, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMaster = profile?.role === "master";

  const navItems = isMaster
    ? [
        { label: "Painel", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Funcionários", icon: Users, path: "/employees" },
        { label: "Registros", icon: FileText, path: "/records" },
        { label: "Empresa", icon: Building2, path: "/company" },
      ]
    : [
        { label: "Painel", icon: LayoutDashboard, path: "/dashboard" },
        { label: "Registros", icon: FileText, path: "/records" },
      ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 gradient-hero text-primary-foreground">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold font-display tracking-tight">Fluxus</h1>
          <p className="text-xs opacity-70 mt-1">{company?.name || "Carregando..."}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-sm font-bold">
              {profile?.full_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs opacity-60 capitalize">{profile?.role === "master" ? "Gerenciador" : "Funcionário"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-bold font-display text-primary">Fluxus</h1>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        {/* Mobile nav overlay */}
        {sidebarOpen && (
          <div className="md:hidden absolute inset-0 z-50 bg-background/95 backdrop-blur-sm">
            <div className="p-4 pt-20 space-y-2">
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
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
