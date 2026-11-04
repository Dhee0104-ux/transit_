import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const DigitalTwinTopBar: React.FC = () => {
  const { theme, toggleTheme, is3D, toggle3D } = useTheme();
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className={`digital-twin-topbar ${theme}`} role="banner">
      {/* Realtime Bengaluru Transit Telemetry Cards */}
      <div className="telemetry-cards-container">
        {/* 1. Namma Metro Status */}
        <div className="telemetry-card" title="BMRCL Namma Metro Purple & Green Lines">
          <span className="telemetry-label">Namma Metro (BMRCL)</span>
          <div className="telemetry-value-row">
            <span className="telemetry-val">Purple & Green Lines</span>
            <span className="telemetry-badge badge-green">● On Time</span>
          </div>
        </div>

        {/* 2. BMTC Bus Network */}
        <div className="telemetry-card" title="BMTC City Buses with Realtime Route Tracking">
          <span className="telemetry-label">BMTC Bus Network</span>
          <div className="telemetry-value-row">
            <span className="telemetry-val">Live Fleet Active</span>
            <span className="telemetry-badge badge-blue">● Realtime</span>
          </div>
        </div>

        {/* 3. Traffic Speed */}
        <div className="telemetry-card" title="Bengaluru Arterial Transit Flow">
          <span className="telemetry-label">City Traffic Flow</span>
          <div className="telemetry-value-row">
            <span className="telemetry-val">Smooth Transit</span>
            <span className="telemetry-badge badge-green">↑ 22 km/h</span>
          </div>
        </div>

        {/* 4. Frequency / Average Wait */}
        <div className="telemetry-card" title="Average Departure Headway between Transit Vehicles">
          <span className="telemetry-label">Average Wait Time</span>
          <div className="telemetry-value-row">
            <span className="telemetry-val">3 – 5 mins</span>
            <span className="telemetry-badge badge-green">● High Frequency</span>
          </div>
        </div>
      </div>

      {/* Clock & Action Logos */}
      <div className="topbar-controls-group">
        <div className="twin-clock">
          <span className="clock-digits">{timeStr}</span>
          <span className="clock-date">{dateStr}</span>
        </div>

        <div className="topbar-buttons">
          {/* 3D / 2D Perspective Toggle Logo */}
          <button
            type="button"
            className={`topbar-toggle-btn icon-only-btn ${is3D ? 'btn-active' : ''}`}
            onClick={toggle3D}
            title={is3D ? '3D Perspective View (Click for 2D View)' : '2D Flat Map View (Click for 3D View)'}
            aria-label={is3D ? '3D View' : '2D View'}
          >
            {is3D ? (
              /* 3D Isometric Cube Logo */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            ) : (
              /* Flat 2D Map Layers Logo */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            )}
          </button>

          {/* Dark / Light Theme Toggle Logo */}
          <button
            type="button"
            className="topbar-toggle-btn theme-toggle-btn icon-only-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Dark Theme (Click for Light Theme)' : 'Light Theme (Click for Dark Theme)'}
            aria-label={theme === 'dark' ? 'Dark Theme' : 'Light Theme'}
          >
            {theme === 'dark' ? (
              /* Sun Logo */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon Logo */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
