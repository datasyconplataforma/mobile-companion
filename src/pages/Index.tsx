import { useNavigate } from "react-router-dom";
import { ArrowRight, Brain, MessageSquare, GitBranch, FileText, Zap, Shield, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Brain,
    title: "Debate entre IAs",
    description: "Duas IAs debatem seu projeto, gerando PRDs mais completos e consistentes.",
  },
  {
    icon: MessageSquare,
    title: "Chat contextual",
    description: "Converse com IA que conhece suas regras de negócio, skills e documentos.",
  },
  {
    icon: GitBranch,
    title: "Integração GitHub",
    description: "Analise repositórios existentes e extraia contexto automaticamente.",
  },
  {
    icon: FileText,
    title: "PRD automático",
    description: "Gere documentos de requisitos profissionais a partir de conversas simples.",
  },
  {
    icon: Zap,
    title: "Skills reutilizáveis",
    description: "Crie e aplique contextos especializados em múltiplos projetos.",
  },
  {
    icon: Shield,
    title: "Regras de negócio",
    description: "Defina regras que a IA sempre respeitará ao gerar seus documentos.",
  },
];

const steps = [
  {
    number: "01",
    title: "Crie seu projeto",
    description: "Descreva sua ideia, adicione documentos e configure regras de negócio.",
  },
  {
    number: "02",
    title: "Converse com a IA",
    description: "Refine requisitos em um chat inteligente que entende seu contexto completo.",
  },
  {
    number: "03",
    title: "Gere o PRD",
    description: "Duas IAs debatem e produzem um PRD detalhado, consistente e pronto para usar.",
  },
];

const testimonials = [
  {
    name: "Lucas M.",
    role: "Tech Lead",
    text: "Reduzimos o tempo de especificação de 2 semanas para 2 horas. O debate entre IAs pega inconsistências que humanos não percebem.",
    stars: 5,
  },
  {
    name: "Ana C.",
    role: "Product Manager",
    text: "Finalmente uma ferramenta que entende contexto. As skills reutilizáveis mudaram meu workflow completamente.",
    stars: 5,
  },
  {
    name: "Rafael S.",
    role: "CTO",
    text: "A integração com GitHub e a análise automática de repositórios economiza horas de onboarding em projetos legados.",
    stars: 5,
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient shadow-glow flex items-center justify-center">
              <Terminal size={20} className="text-primary-foreground" />
            </div>
            <span className="text-xl font-black tracking-tighter text-foreground">
              CodeBuddy
            </span>
          </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground"
            >
              Entrar
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="rounded-xl bg-brand-gradient text-primary-foreground shadow-glow hover:scale-105 active:scale-95 transition-all font-bold px-5"
            >
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-28 pb-20 sm:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8">
            <Zap size={14} />
            <span>IA que debate para você especificar melhor</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-foreground">
            Transforme ideias em{" "}
            <span className="text-primary">PRDs profissionais</span>{" "}
            com debate de IAs
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Duas inteligências artificiais debatem seu projeto, identificam inconsistências e geram documentos de requisitos completos — em minutos, não semanas.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="rounded-2xl text-base px-10 h-14 bg-brand-gradient text-primary-foreground shadow-glow hover:scale-105 active:scale-95 transition-all font-black group"
            >
              Iniciar Workspace Grátis
              <ArrowRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full text-base px-8 h-12"
            >
              Como funciona
            </Button>
          </div>

          {/* Mock terminal */}
          <div className="mt-16 max-w-3xl mx-auto group">
            <div className="glass-card border-white/10 rounded-2xl overflow-hidden shadow-glow animate-float">
              <div className="flex items-center gap-2 px-5 py-3.5 bg-secondary/40 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/40" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                </div>
                <span className="ml-4 text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em] font-bold">CodeBuddy Console — spec_debate.exe</span>
              </div>
              <div className="p-5 text-left font-mono text-sm space-y-3">
                <p>
                  <span className="text-primary">IA-1 ▸</span>{" "}
                  <span className="text-foreground/80">O módulo de pagamentos precisa suportar PIX e cartão...</span>
                </p>
                <p>
                  <span className="text-[hsl(var(--accent))]">IA-2 ▸</span>{" "}
                  <span className="text-foreground/80">Concordo, mas falta definir o fluxo de reembolso. Sugiro adicionar...</span>
                </p>
                <p>
                  <span className="text-primary">IA-1 ▸</span>{" "}
                  <span className="text-foreground/80">Boa observação. Vou incluir regra de estorno em até 7 dias...</span>
                </p>
                <div className="flex items-center gap-2 text-muted-foreground pt-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs">Gerando PRD consensual...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Tudo que você precisa para especificar projetos
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Ferramentas poderosas que transformam seu processo de criação de requisitos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-glow"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon size={22} className="text-primary" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Como funciona
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Três passos simples para PRDs profissionais.
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((s, i) => (
              <div
                key={i}
                className="flex gap-6 items-start p-6 rounded-xl bg-card border border-border"
              >
                <div className="shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold font-mono text-primary">{s.number}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">{s.title}</h3>
                  <p className="mt-1 text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Quem usa, recomenda
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-xl bg-card border border-border">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={16} className="fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-bold text-card-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="p-10 sm:p-14 rounded-2xl bg-card border border-primary/20 shadow-glow">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Pronto para especificar melhor?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Comece gratuitamente. Sem cartão de crédito.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="mt-8 rounded-full text-base px-10 h-12 shadow-glow"
            >
              Criar conta grátis
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 bg-secondary/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center">
              <Terminal size={18} className="text-primary-foreground" />
            </div>
            <span className="text-lg font-black tracking-tighter text-foreground">CodeBuddy</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            © 2026 CodeBuddy Platform. Desenvolvido por <span className="text-primary">Datasycon AI</span>.
          </p>
          <div className="flex gap-4">
            <button className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground">Termos</button>
            <button className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground">Privacidade</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
