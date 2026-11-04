import { useState } from 'react';
import { CityProvider } from '../context/CityContext.tsx';
import { ThemeProvider } from '../context/ThemeContext.tsx';
import { TransitSearchCard } from '../components/Search/TransitSearchCard.tsx';
import { ModernItineraryList } from '../components/Itinerary/ModernItineraryList.tsx';
import { DigitalTwinTopBar } from '../components/Header/DigitalTwinTopBar.tsx';
import { MapView } from '../components/MapView/MapView.tsx';
import { useTripQuery } from '../hooks/useTripQuery.ts';
import { useTripQueryVariables } from '../hooks/useTripQueryVariables.ts';
import { useServerInfo } from '../hooks/useServerInfo.ts';
import { TimeZoneContext } from '../hooks/TimeZoneContext.ts';
import { ItineraryCompareDialog } from '../components/ItineraryList/ItineraryCompareDialog.tsx';

function MainLayout() {
  const serverInfo = useServerInfo();
  const { tripQueryVariables, setTripQueryVariables } = useTripQueryVariables();
  const [comparisonSelectedIndexes] = useState<number[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState<boolean>(false);
  const [tripQueryResult, loading, callback] = useTripQuery(tripQueryVariables);
  const [selectedTripPatternIndexes, setSelectedTripPatternIndexes] = useState<number[]>([0]);
  const timeZone = serverInfo?.internalTransitModelTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Reset the selection to the first trip pattern whenever a new result arrives.
  const [prevTripQueryResult, setPrevTripQueryResult] = useState(tripQueryResult);
  if (tripQueryResult !== prevTripQueryResult) {
    setPrevTripQueryResult(tripQueryResult);
    if (tripQueryResult?.trip.tripPatterns.length) {
      setSelectedTripPatternIndexes([0]);
    }
  }

  return (
    <div className="urban-transit-app">
      <TimeZoneContext.Provider value={timeZone}>
        <div className="app-shell">
          <aside className="sidebar-pane">
            <TransitSearchCard
              tripQueryVariables={tripQueryVariables}
              setTripQueryVariables={setTripQueryVariables}
              onRoute={callback}
              loading={loading}
            />
            <div className="itinerary-scroll-area">
              <ModernItineraryList
                tripQueryResult={tripQueryResult}
                selectedTripPatternIndexes={selectedTripPatternIndexes}
                setSelectedTripPatternIndexes={setSelectedTripPatternIndexes}
                loading={loading}
              />
            </div>
          </aside>
          <main className="map-pane">
            <DigitalTwinTopBar />
            <MapView
              tripQueryResult={tripQueryResult}
              tripQueryVariables={tripQueryVariables}
              setTripQueryVariables={setTripQueryVariables}
              selectedTripPatternIndexes={selectedTripPatternIndexes}
              loading={loading}
            />
          </main>
        </div>
        <ItineraryCompareDialog
          show={showCompareDialog}
          onHide={() => setShowCompareDialog(false)}
          tripQueryResult={tripQueryResult}
          selectedIndexes={comparisonSelectedIndexes}
        />
      </TimeZoneContext.Provider>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <CityProvider>
        <MainLayout />
      </CityProvider>
    </ThemeProvider>
  );
}
