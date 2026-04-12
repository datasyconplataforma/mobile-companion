import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Terminal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = isLogin ? await signIn(email, password) : await signUp(email, password);
    setSubmitting(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else if (!isLogin) {
      toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
    }
  };

  return (
    <div className="h-dvh flex items-center justify-center bg-background px-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center justify-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-brand-gradient shadow-glow flex items-center justify-center animate-bounce-subtle">
            <Terminal size={32} className="text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-foreground tracking-tighter">CodeBuddy</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Midnight Premium Edition</p>
          </div>
        </div>

        <div className="glass-card p-8 border-white/10 shadow-glow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-gradient opacity-50" />
          
          <h2 className="text-xl font-bold text-foreground mb-1">
            {isLogin ? "Bem-vindo de volta" : "Criar nova conta"}
          </h2>
          <p className="text-xs text-muted-foreground mb-8 font-medium">
            {isLogin ? "Acesse seu workspace de desenvolvimento" : "Comece sua jornada com IA agora mesmo"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-1">Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-white/5 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-1">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-white/5 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-brand-gradient text-primary-foreground font-bold text-sm shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? "Entrar na Plataforma" : "Criar Minha Conta")}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground/40">ou</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full mt-6 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-2"
          >
            {isLogin ? "Não tem uma conta? registre-se" : "Já possui acesso? faça login"}
          </button>
        </div>
        
        <p className="text-center mt-10 text-[10px] text-muted-foreground/40 font-mono italic">
          v2.0 · Powered by Datasycon AI Engine
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
