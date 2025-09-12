import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export type PanelType = 'matriz' | 'unidade';

interface PanelContextType {
  currentPanel: PanelType;
  setCurrentPanel: (panel: PanelType) => void;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

interface PanelProviderProps {
  children: ReactNode;
}

export function PanelProvider({ children }: PanelProviderProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const [currentPanel, setCurrentPanelState] = useState<PanelType>(() => {
    // If user is authenticated, use their user_type, otherwise use route-based detection
    if (profile?.user_type) {
      return profile.user_type;
    }
    const saved = localStorage.getItem('currentPanel');
    return (saved as PanelType) || 'matriz';
  });

  const setCurrentPanel = (panel: PanelType) => {
    setCurrentPanelState(panel);
    localStorage.setItem('currentPanel', panel);
  };

  // Sincronizar painel com a rota atual e perfil do usuário
  useEffect(() => {
    if (profile?.user_type) {
      // If user is authenticated, use their user_type
      setCurrentPanelState(profile.user_type);
    } else if (location.pathname.startsWith('/unidade')) {
      setCurrentPanelState('unidade');
    } else if (!location.pathname.startsWith('/auth')) {
      setCurrentPanelState('matriz');
    }
  }, [location.pathname, profile?.user_type]);

  useEffect(() => {
    localStorage.setItem('currentPanel', currentPanel);
  }, [currentPanel]);

  return (
    <PanelContext.Provider value={{ currentPanel, setCurrentPanel }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error('usePanel must be used within a PanelProvider');
  }
  return context;
}