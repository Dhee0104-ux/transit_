import { createContext, useContext, ReactNode } from 'react';
import { CITIES, CityConfig, CityKey } from '../util/cityConfig';

export interface CityContextType {
  city: CityKey;
  setCity: (city: CityKey) => void;
  cityConfig: CityConfig;
}

const defaultContextValue: CityContextType = {
  city: 'bengaluru',
  setCity: () => {},
  cityConfig: CITIES.bengaluru,
};

const CityContext = createContext<CityContextType>(defaultContextValue);

export function CityProvider({ children }: { children: ReactNode }) {
  const city: CityKey = 'bengaluru';
  const setCity = () => {};
  const cityConfig = CITIES.bengaluru;

  return (
    <CityContext.Provider value={{ city, setCity, cityConfig }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity(): CityContextType {
  const context = useContext(CityContext);
  return context || defaultContextValue;
}
