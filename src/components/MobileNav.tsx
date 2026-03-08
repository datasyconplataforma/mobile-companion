import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Solutions", href: "#" },
  { label: "Resources", href: "#" },
  { label: "Enterprise", href: "#" },
  { label: "Pricing", href: "#" },
  { label: "Community", href: "#" },
];

const MobileNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-accent" />
          <span className="text-lg font-bold tracking-tight">Lovable</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </button>
          <button className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-full">
            Get started
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="sm:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="sm:hidden border-t border-border px-4 pb-4 pt-2 space-y-1 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2.5 text-base font-medium text-foreground hover:text-accent transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button className="w-full mt-2 py-2.5 text-base font-medium text-muted-foreground">
            Log in
          </button>
        </div>
      )}
    </nav>
  );
};

export default MobileNav;
