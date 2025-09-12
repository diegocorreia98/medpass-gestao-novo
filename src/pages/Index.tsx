
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PlanosSection } from '@/components/landing/PlanosSection';
import { CoberturaSection } from '@/components/landing/CoberturaSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Força o tema light na landing page e remove do localStorage
    const root = window.document.documentElement;
    
    // Remove o tema dark e força o light
    root.classList.remove("dark", "system");
    root.classList.add("light");
    
    // Temporariamente remove do localStorage para evitar conflitos
    const originalTheme = localStorage.getItem("lovable-ui-theme");
    localStorage.setItem("lovable-ui-theme", "light");
    
    // Cleanup: restaura o tema original quando sair da página
    return () => {
      if (originalTheme) {
        localStorage.setItem("lovable-ui-theme", originalTheme);
      } else {
        localStorage.removeItem("lovable-ui-theme");
      }
    };
  }, []);

  useEffect(() => {
    // Aguarda o loading completo antes de redirecionar
    if (!loading && user && profile) {
      const redirectPath = profile.user_type === 'matriz' ? '/dashboard' : '/unidade';
      // Pequeno delay para garantir que o estado está sincronizado
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 100);
    }
  }, [user, profile, loading, navigate]);

  // Se o usuário estiver logado, não mostra a landing page
  if (user && profile) {
    return null; // Retorna null enquanto redireciona
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <PlanosSection />
      <CoberturaSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
