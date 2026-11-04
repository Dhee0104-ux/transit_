import React from 'react';
import { useCity } from '../../context/CityContext';
import transitLogo from '../../static/img/transit-logo.svg';

export const AppHeader: React.FC = () => {
  const { cityConfig } = useCity();

  return (
    <header className="app-header">
      <div className="brand-group">
        <img src={transitLogo} alt="Transit Logo" className="brand-logo" />
        <div className="brand-text">
          <h1 className="brand-title">UrbanTransit Bengaluru</h1>
          <span className="brand-subtitle">{cityConfig.subtitle}</span>
        </div>
      </div>
    </header>
  );
};
