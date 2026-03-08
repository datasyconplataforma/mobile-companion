import MobileNav from "@/components/MobileNav";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import TemplatesSection from "@/components/TemplatesSection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MobileNav />
      <HeroSection />
      <FeaturesSection />
      <TemplatesSection />
      <FooterSection />
    </div>
  );
};

export default Index;
