const FooterSection = () => {
  return (
    <footer className="px-4 py-12 bg-primary text-primary-foreground">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 rounded-md gradient-accent" />
          <span className="text-lg font-bold">Lovable</span>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-3">
            <h4 className="font-semibold opacity-60 uppercase text-xs tracking-wider">Produto</h4>
            <ul className="space-y-2">
              <li><a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Templates</a></li>
              <li><a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Pricing</a></li>
              <li><a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Enterprise</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold opacity-60 uppercase text-xs tracking-wider">Recursos</h4>
            <ul className="space-y-2">
              <li><a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Documentação</a></li>
              <li><a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Comunidade</a></li>
              <li><a href="#" className="opacity-80 hover:opacity-100 transition-opacity">Segurança</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-primary-foreground/10 text-xs opacity-50">
          © 2026 Lovable. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
