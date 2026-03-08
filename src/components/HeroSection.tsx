import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="gradient-hero px-4 pt-8 pb-16 sm:pt-16 sm:pb-24">
      {/* Banner */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-border text-sm font-medium">
          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            Novo
          </span>
          <span className="text-foreground/80">Crie apps com IA</span>
          <ArrowRight size={14} className="text-muted-foreground" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center max-w-lg mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
          Build something{" "}
          <span className="bg-clip-text text-transparent gradient-accent">
            Lovable
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          Crie aplicativos e sites conversando com IA. Do conceito ao deploy em minutos.
        </p>
      </div>

      {/* Chat Input Mock */}
      <div className="mt-8 max-w-md mx-auto">
        <div className="bg-secondary/80 backdrop-blur-sm rounded-2xl p-4 shadow-card border border-border">
          <p className="text-muted-foreground text-sm mb-10">
            Peça ao Lovable para criar um blog...
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-muted-foreground text-lg">+</div>
            </div>
            <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <ArrowRight size={16} className="text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
