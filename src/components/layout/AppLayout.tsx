import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, Wrench, Settings, BarChart3, LogOut, 
  Terminal, ChevronLeft, ChevronRight, User, Menu, X
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import LLMSettings from "@/components/project/LLMSettings";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Projetos", icon: LayoutDashboard, path: "/dashboard" },
    { id: "skills", label: "Skills Central", icon: Wrench, path: "/skills" },
    { id: "insights", label: "Insights", icon: BarChart3, path: "#", disabled: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Global settings is a special item that triggers a modal
  // but for now we can treat it as a navigation-like item or keep it as a button

  return (
    <div className="flex h-dvh bg-background overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "hidden md:flex flex-col glass-sidebar transition-all duration-500 ease-in-out z-30",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between">
          <div className={cn("flex items-center gap-3 transition-opacity duration-300", collapsed ? "opacity-0 invisible w-0" : "opacity-100")}>
            <div className="w-8 h-8 rounded-xl bg-brand-gradient shadow-glow flex items-center justify-center shrink-0">
              <Terminal size={18} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              CodeBuddy
            </span>
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-2 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => !item.disabled && navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative",
                isActive(item.path) 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30",
                item.disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <item.icon size={20} className={cn("shrink-0 transition-transform duration-300 group-hover:scale-110", isActive(item.path) && "text-primary")} />
              <span className={cn("font-medium text-sm transition-all duration-300 whitespace-nowrap overflow-hidden", collapsed ? "w-0 opacity-0" : "w-full opacity-100")}>
                {item.label}
              </span>
              {isActive(item.path) && (
                <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        {/* User / Bottom Actions */}
        <div className="p-4 mt-auto border-t border-white/5 space-y-2">
          <div className={cn("flex items-center gap-3 p-2 transition-all duration-300 overflow-hidden", collapsed ? "justify-center" : "")}>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="User" />
              ) : (
                <User size={16} className="text-muted-foreground" />
              )}
            </div>
            <div className={cn("transition-all duration-300 overflow-hidden", collapsed ? "w-0 opacity-0" : "w-full")}>
              <p className="text-xs font-semibold text-foreground truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <LLMSettings />
            <button 
              onClick={signOut}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-destructive/10",
                collapsed ? "justify-center" : ""
              )}
            >
              <LogOut size={18} />
              {!collapsed && <span className="text-xs font-medium">Sair</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile Header (Only visible on small screens) */}
        <header className="md:hidden flex items-center justify-between p-4 glass-header shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center">
              <Terminal size={18} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">CodeBuddy</span>
          </div>
          <button 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-foreground"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
          {children}
        </div>
        
        {/* Mobile Menu Overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col p-8 space-y-6">
            <button onClick={() => setMobileOpen(false)} className="self-end p-2 text-muted-foreground"><X size={32} /></button>
            <nav className="flex flex-col gap-6">
              {menuItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className="flex items-center gap-4 text-2xl font-bold"
                >
                  <item.icon size={28} /> {item.label}
                </button>
              ))}
              <button 
                onClick={signOut}
                className="flex items-center gap-4 text-2xl font-bold text-destructive"
              >
                <LogOut size={28} /> Sair
              </button>
            </nav>
          </div>
        )}
      </main>
    </div>
  );
};

export default AppLayout;
