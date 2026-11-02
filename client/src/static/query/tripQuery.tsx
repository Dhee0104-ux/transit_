import { graphql } from '../../gql';
import { TripDocument } from '../../gql/graphql.ts';
import { print } from 'graphql';

// Generated trip query based on schema.graphql

const parsedGql = graphql(`
query trip(
  $accessEgressPenalty: [PenaltyForStreetMode!]
  $alightSlackDefault: Int
  $alightSlackList: [TransportModeSlack]
  $arriveBy: Boolean
  $banned: InputBanned
  $bikePreferences: BikePreferencesInput
  $boardSlackDefault: Int
  $boardSlackList: [TransportModeSlack]
  $bookingTime: DateTime
  $dateTime: DateTime
  $filters: [TripFilterInput!]
  $from: Location!
  $ignoreRealtimeUpdates: Boolean
  $includePlannedCancellations: Boolean
  $includeRealtimeCancellations: Boolean
  $itineraryFilters: ItineraryFilters
  $locale: Locale
  $maxAccessEgressDurationForMode: [StreetModeDurationInput!]
  $maxDirectDurationForMode: [StreetModeDurationInput!]
  $maximumAdditionalTransfers: Int
  $maximumTransfers: Int
  $modes: Modes
  $numTripPatterns: Int
  $pageCursor: String
  $relaxTransitGroupPriority: RelaxCostInput
  $scooterPreferences: ScooterPreferencesInput
  $searchWindow: Int
  $timetableView: Boolean
  $to: Location!
  $transferPenalty: Int
  $transferSlack: Int
  $useBikeRentalAvailabilityInformation: Boolean
  $via: [TripViaLocationInput!]
  $waitReluctance: Float
  $walkReluctance: Float
  $walkSpeed: Float
  $wheelchairAccessible: Boolean
  $whiteListed: InputWhiteListed
) {
  trip(
    accessEgressPenalty: $accessEgressPenalty
    alightSlackDefault: $alightSlackDefault
    alightSlackList: $alightSlackList
    arriveBy: $arriveBy
    banned: $banned
    bikePreferences: $bikePreferences
    boardSlackDefault: $boardSlackDefault
    boardSlackList: $boardSlackList
    bookingTime: $bookingTime
    dateTime: $dateTime
    filters: $filters
    from: $from
    ignoreRealtimeUpdates: $ignoreRealtimeUpdates
    includePlannedCancellations: $includePlannedCancellations
    includeRealtimeCancellations: $includeRealtimeCancellations
    itineraryFilters: $itineraryFilters
    locale: $locale
    maxAccessEgressDurationForMode: $maxAccessEgressDurationForMode
    maxDirectDurationForMode: $maxDirectDurationForMode
    maximumAdditionalTransfers: $maximumAdditionalTransfers
    maximumTransfers: $maximumTransfers
    modes: $modes
    numTripPatterns: $numTripPatterns
    pageCursor: $pageCursor
    relaxTransitGroupPriority: $relaxTransitGroupPriority
    scooterPreferences: $scooterPreferences
    searchWindow: $searchWindow
    timetableView: $timetableView
    to: $to
    transferPenalty: $transferPenalty
    transferSlack: $transferSlack
    useBikeRentalAvailabilityInformation: $useBikeRentalAvailabilityInformation
    via: $via
    waitReluctance: $waitReluctance
    walkReluctance: $walkReluctance
    walkSpeed: $walkSpeed
    wheelchairAccessible: $wheelchairAccessible
    whiteListed: $whiteListed
  ) 
    {
    previousPageCursor
    nextPageCursor
    tripPatterns {
        aimedStartTime
        aimedEndTime
        expectedEndTime
        expectedStartTime
        duration
        distance
        generalizedCost
        legs {
            id
            mode
            aimedStartTime
            aimedEndTime
            expectedEndTime
            expectedStartTime
            realtime
            distance
            duration
            generalizedCost
            fromPlace {
                name
                latitude
                longitude
                quay {
                    id
                }
                rentalVehicle {
                    id
                    network
                    vehicleType {
                        formFactor
                        propulsionType
                    }
                }
                bikeRentalStation {
                    id
                    name
                    networks
                }
            }
            toPlace {
                name
                latitude
                longitude
                quay {
                    id
                }
                rentalVehicle {
                    id
                    network
                    vehicleType {
                        formFactor
                        propulsionType
                    }
                }
                bikeRentalStation {
                    id
                    name
                    networks
                }
            }
            fromEstimatedCall {
                destinationDisplay {
                    frontText
                }
            }
            line {
                publicCode
                name
                id
                presentation {
                    colour
                }
            }
            authority {
                name
                id
            }
            pointsOnLink {
                points
            }
            interchangeTo {
                staySeated
            }
            interchangeFrom {
                staySeated
            }
        }
        systemNotices {
            tag
        }
    }
  }
}`);

export const query = (parsedGql && (parsedGql as any).kind ? parsedGql : TripDocument) as typeof TripDocument;
export const queryAsString = print(TripDocument);