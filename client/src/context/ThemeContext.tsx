import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MapTheme = 'dark' | 'light';

export interface ThemeContextType {
  theme: MapTheme;
  setTheme: (theme: MapTheme) => void;
  toggleTheme: () => void;
  is3D: boolean;
  setIs3D: (is3D: boolean) => void;
  toggle3D: () => void;
}

const defaultThemeValue: ThemeContextType = {
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  is3D: true,
  setIs3D: () => {},
  toggle3D: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MapTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('urban_map_theme') as MapTheme;
      return saved === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });

  const [is3D, setIs3DState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('urban_map_3d');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const setTheme = (t: MapTheme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('urban_map_theme', t);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setIs3D = (enabled: boolean) => {
    setIs3DState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('urban_map_3d', String(enabled));
    }
  };

  const toggle3D = () => {
    setIs3D(!is3D);
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, is3D, setIs3D, toggle3D }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  return context || defaultThemeValue;
}
