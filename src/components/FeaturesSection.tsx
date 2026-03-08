import { Lightbulb, Play, Rocket } from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "Comece com uma ideia",
    description: "Descreva o app ou site que deseja criar, ou envie screenshots e documentos.",
  },
  {
    icon: Play,
    title: "Veja ganhar vida",
    description: "Sua visão se transforma em um protótipo funcional em tempo real.",
  },
  {
    icon: Rocket,
    title: "Refine e publique",
    description: "Itere com feedback simples e faça deploy com um clique.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="px-4 py-16 sm:py-24 bg-background">
      <div className="max-w-lg mx-auto text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Conheça o Lovable
        </h2>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-soft"
          >
            <div className="shrink-0 w-11 h-11 rounded-xl gradient-accent flex items-center justify-center">
              <step.icon size={20} className="text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-base font-bold text-card-foreground">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
