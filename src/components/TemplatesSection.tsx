const templates = [
  {
    title: "Portfólio Pessoal",
    description: "Vitrine de trabalhos criativos",
    gradient: "from-blue-400 to-purple-500",
  },
  {
    title: "Lovable Slides",
    description: "Construtor de apresentações",
    gradient: "from-orange-400 to-pink-500",
  },
  {
    title: "Blog de Moda",
    description: "Design minimalista e elegante",
    gradient: "from-pink-400 to-rose-500",
  },
];

const TemplatesSection = () => {
  return (
    <section className="px-4 py-16 sm:py-24 bg-secondary/50">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Templates
          </h2>
          <button className="text-sm font-semibold text-accent hover:underline">
            Ver todos
          </button>
        </div>

        <div className="space-y-4">
          {templates.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden bg-card border border-border shadow-soft"
            >
              <div className={`h-36 sm:h-44 bg-gradient-to-br ${t.gradient} opacity-80`} />
              <div className="p-4">
                <h3 className="text-base font-bold text-card-foreground">{t.title}</h3>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TemplatesSection;
