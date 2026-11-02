import { Table } from 'react-bootstrap';
import { TripPattern } from '../../static/query/tripQueryTypes.js';
import { ItinerarySummary, getComparisonClass, columnComparisons } from './compareUtils.ts';
import { parseDistanceToMeters } from '../../util/distanceUtils.ts';
import { calculateTripFare, formatFare } from '../../util/fareUtils.ts';

interface ItinerarySummaryTableProps {
  itinerary1: TripPattern;
  itinerary2: TripPattern;
  summary1: ItinerarySummary;
  summary2: ItinerarySummary;
  selectedIndexes: number[];
}

export function ItinerarySummaryTable({
  itinerary1,
  itinerary2,
  summary1,
  summary2,
  selectedIndexes,
}: ItinerarySummaryTableProps) {
  const fare1 = calculateTripFare(itinerary1.legs);
  const fare2 = calculateTripFare(itinerary2.legs);

  return (
    <Table bordered hover className="compare-summary-table">
      <thead>
        <tr>
          <th>Itinerary</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Duration</th>
          <th>Fare</th>
          <th>Transfers</th>
          <th>Walking Distance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span className="compare-itinerary-number">#{selectedIndexes[0] + 1}</span>
          </td>
          <td>{summary1.startTime}</td>
          <td>{summary1.endTime}</td>
          <td className={getComparisonClass(itinerary1.duration, itinerary2.duration, columnComparisons.duration)}>
            {summary1.duration}
          </td>
          <td
            className={getComparisonClass(fare1, fare2, columnComparisons.cost)}
          >
            {formatFare(fare1)}
          </td>
          <td className={getComparisonClass(summary1.totalLegs, summary2.totalLegs, columnComparisons.legs)}>
            {summary1.totalLegs}
          </td>
          <td
            className={getComparisonClass(
              parseDistanceToMeters(summary1.walkingDistance),
              parseDistanceToMeters(summary2.walkingDistance),
              columnComparisons.walkingDistance,
            )}
          >
            {summary1.walkingDistance}
          </td>
        </tr>
        <tr>
          <td>
            <span className="compare-itinerary-number">#{selectedIndexes[1] + 1}</span>
          </td>
          <td>{summary2.startTime}</td>
          <td>{summary2.endTime}</td>
          <td className={getComparisonClass(itinerary2.duration, itinerary1.duration, columnComparisons.duration)}>
            {summary2.duration}
          </td>
          <td
            className={getComparisonClass(fare2, fare1, columnComparisons.cost)}
          >
            {formatFare(fare2)}
          </td>
          <td className={getComparisonClass(summary2.totalLegs, summary1.totalLegs, columnComparisons.legs)}>
            {summary2.totalLegs}
          </td>
          <td
            className={getComparisonClass(
              parseDistanceToMeters(summary2.walkingDistance),
              parseDistanceToMeters(summary1.walkingDistance),
              columnComparisons.walkingDistance,
            )}
          >
            {summary2.walkingDistance}
          </td>
        </tr>
      </tbody>
    </Table>
  );
}
