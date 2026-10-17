import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId = 'purple' | 'red' | 'yellow' | 'blue' | 'green';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  primaryColor: string;
  primaryHover: string;
  accentBg: string;
  borderGlow: string;
  gradientText: string;
  buttonClass: string;
  ringClass: string;
  badgeBg: string;
  badgeText: string;
  previewColors: [string, string, string];
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  purple: {
    id: 'purple',
    name: 'Purple Velvet',
    tagline: 'Default streamer classic with royal violet vibrancy',
    primaryColor: '#8b5cf6',
    primaryHover: '#7c3aed',
    accentBg: 'rgba(139, 92, 246, 0.14)',
    borderGlow: 'rgba(139, 92, 246, 0.4)',
    gradientText: 'from-violet-400 via-purple-300 to-indigo-300',
    buttonClass: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30 shadow-lg',
    ringClass: 'ring-violet-500',
    badgeBg: 'bg-violet-500/15 border-violet-500/30',
    badgeText: 'text-violet-300',
    previewColors: ['#8b5cf6', '#a78bfa', '#1e1b4b'],
  },
  red: {
    id: 'red',
    name: 'Crimson Surge',
    tagline: 'High-octane red designed for esports and action streams',
    primaryColor: '#ef4444',
    primaryHover: '#dc2626',
    accentBg: 'rgba(239, 68, 68, 0.14)',
    borderGlow: 'rgba(239, 68, 68, 0.4)',
    gradientText: 'from-red-400 via-rose-300 to-orange-300',
    buttonClass: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 shadow-lg',
    ringClass: 'ring-red-500',
    badgeBg: 'bg-red-500/15 border-red-500/30',
    badgeText: 'text-red-300',
    previewColors: ['#ef4444', '#f87171', '#450a0a'],
  },
  yellow: {
    id: 'yellow',
    name: 'Amber Glow',
    tagline: 'Warm golden hues with bold contrast and high visibility',
    primaryColor: '#f59e0b',
    primaryHover: '#d97706',
    accentBg: 'rgba(245, 158, 11, 0.14)',
    borderGlow: 'rgba(245, 158, 11, 0.4)',
    gradientText: 'from-amber-300 via-yellow-200 to-amber-400',
    buttonClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/30 shadow-lg',
    ringClass: 'ring-amber-500',
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeText: 'text-amber-300',
    previewColors: ['#f59e0b', '#fbbf24', '#451a03'],
  },
  blue: {
    id: 'blue',
    name: 'Electric Cyan',
    tagline: 'Crisp sapphire & cyan tones for modern tech streamers',
    primaryColor: '#3b82f6',
    primaryHover: '#2563eb',
    accentBg: 'rgba(59, 130, 246, 0.14)',
    borderGlow: 'rgba(59, 130, 246, 0.4)',
    gradientText: 'from-blue-400 via-cyan-300 to-sky-300',
    buttonClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 shadow-lg',
    ringClass: 'ring-blue-500',
    badgeBg: 'bg-blue-500/15 border-blue-500/30',
    badgeText: 'text-blue-300',
    previewColors: ['#3b82f6', '#60a5fa', '#0f172a'],
  },
  green: {
    id: 'green',
    name: 'Neon Emerald',
    tagline: 'Vibrant neon green inspired by gaming arenas',
    primaryColor: '#10b981',
    primaryHover: '#059669',
    accentBg: 'rgba(16, 185, 129, 0.14)',
    borderGlow: 'rgba(16, 185, 129, 0.4)',
    gradientText: 'from-emerald-400 via-teal-300 to-green-300',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 shadow-lg',
    ringClass: 'ring-emerald-500',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    badgeText: 'text-emerald-300',
    previewColors: ['#10b981', '#34d399', '#064e3b'],
  },
};

const STORAGE_KEY = 'streamerpay_theme';

interface ThemeContextType {
  savedTheme: ThemeId;
  previewTheme: ThemeId | null;
  activeTheme: ThemeId;
  themeConfig: ThemeConfig;
  isPreviewing: boolean;
  setPreview: (theme: ThemeId) => void;
  applyTheme: (theme?: ThemeId) => void;
  resetPreview: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getInitialTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && Object.prototype.hasOwnProperty.call(THEMES, stored)) {
      return stored as ThemeId;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage', e);
  }
  return 'purple';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedTheme, setSavedTheme] = useState<ThemeId>(getInitialTheme);
  const [previewTheme, setPreviewTheme] = useState<ThemeId | null>(null);

  const activeTheme = previewTheme || savedTheme;
  const themeConfig = THEMES[activeTheme] || THEMES.purple;
  const isPreviewing = previewTheme !== null && previewTheme !== savedTheme;

  useEffect(() => {
    // Apply theme class to document body / root
    const root = document.documentElement;
    const body = document.body;

    const themeClasses = ['theme-purple', 'theme-red', 'theme-yellow', 'theme-blue', 'theme-green'];
    root.classList.remove(...themeClasses);
    body.classList.remove(...themeClasses);

    root.classList.add(`theme-${activeTheme}`);
    body.classList.add(`theme-${activeTheme}`);

    // Set CSS variable for primary colors
    root.style.setProperty('--theme-primary', themeConfig.primaryColor);
    root.style.setProperty('--theme-primary-hover', themeConfig.primaryHover);
    root.style.setProperty('--theme-accent-bg', themeConfig.accentBg);
    root.style.setProperty('--theme-border-glow', themeConfig.borderGlow);
  }, [activeTheme, themeConfig]);

  const setPreview = (theme: ThemeId) => {
    if (THEMES[theme]) {
      setPreviewTheme(theme);
    }
  };

  const applyTheme = (themeToApply?: ThemeId) => {
    const target = themeToApply || previewTheme || savedTheme;
    if (THEMES[target]) {
      setSavedTheme(target);
      setPreviewTheme(null);
      try {
        localStorage.setItem(STORAGE_KEY, target);
      } catch (e) {
        console.warn('Failed to save theme to localStorage', e);
      }
    }
  };

  const resetPreview = () => {
    setPreviewTheme(null);
  };

  return (
    <ThemeContext.Provider
      value={{
        savedTheme,
        previewTheme,
        activeTheme,
        themeConfig,
        isPreviewing,
        setPreview,
        applyTheme,
        resetPreview,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
