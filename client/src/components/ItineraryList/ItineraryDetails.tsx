import { ItineraryLegDetails } from './ItineraryLegDetails.tsx';
import { TripPattern } from '../../static/query/tripQueryTypes';
import { calculateTripFare, formatFare } from '../../util/fareUtils.ts';

export function ItineraryDetails({ tripPattern }: { tripPattern: TripPattern }) {
  const totalFare = calculateTripFare(tripPattern.legs);

  return (
    <div>
      {tripPattern.systemNotices.length > 0 && (
        <p>System tags: {tripPattern.systemNotices.map((systemNotice) => systemNotice.tag).join(', ')}</p>
      )}
      {tripPattern.legs.map((leg, i) => (
        <ItineraryLegDetails key={leg.id ? leg.id : `noid_${i}`} leg={leg} isLast={i === tripPattern.legs.length - 1} />
      ))}

      <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
        <span className="fw-bold">Total Estimated Fare:</span>
        <span className="badge bg-success fs-6 px-3 py-2">
          {formatFare(totalFare)}
        </span>
      </div>
      <div className="text-muted small mt-1">
        Routing cost weight: {tripPattern.generalizedCost}
      </div>
    </div>
  );
}
