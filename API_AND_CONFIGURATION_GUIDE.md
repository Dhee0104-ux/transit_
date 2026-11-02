# OpenTripPlanner (OTP2) Comprehensive API & Configuration Specification

**Deployment Focus**: Bengaluru Multimodal Transit Network (BMTC Bus + BMRCL Namma Metro +
OpenStreetMap)  
**Version Grounding**: OpenTripPlanner 2.11-SNAPSHOT / Transmodel v3 GraphQL API

---

## Table of Contents

1. [Executive Overview & System Architecture](#1-executive-overview--system-architecture)
2. [Complete API Catalog & Endpoint Matrix](#2-complete-api-catalog--endpoint-matrix)
3. [Core Engine Functionalities & Capabilities](#3-core-engine-functionalities--capabilities)
4. [Transmodel GraphQL API: Format, Structure & Queries](#4-transmodel-graphql-api-format-structure--queries)
   - [4.1 API Endpoint & Transport Specifications](#41-api-endpoint--transport-specifications)
   - [4.2 Root Query Reference (`QueryType`)](#42-root-query-reference-querytype)
   - [4.3 Primary Routing Query (`trip`) In-Depth](#43-primary-routing-query-trip-in-depth)
   - [4.4 Intermediate / Via Routing Query (`viaTrip`)](#44-intermediate--via-routing-query-viatrip)
   - [4.5 Spatial & Transit Inspection Queries (`nearest`, `quays`, `lines`)](#45-spatial--transit-inspection-queries-nearest-quays-lines)
   - [4.6 Real-time Trip Refetching (`refetchTripPattern`)](#46-real-time-trip-refetching-refetchtrippattern)
   - [4.7 Production GraphQL Request & Response Examples](#47-production-graphql-request--response-examples)
5. [Alternative & Supporting APIs](#5-alternative--supporting-apis)
   - [5.1 Mapbox Vector Tiles API (`/otp/debug/vectortiles`)](#51-mapbox-vector-tiles-api-otpdebugvectortiles)
   - [5.2 Actuator & Health / Metrics API (`/otp/actuator`)](#52-actuator--health--metrics-api-otpactuator)
   - [5.3 Server Info & Diagnostics (`/otp/serverinfo`, `/otp/ping`)](#53-server-info--diagnostics-otpserverinfo-otpping)
   - [5.4 Interactive Explorers (`/graphiql`)](#54-interactive-explorers-graphiql)
6. [Configurability Architecture (The 4-Tier Model)](#6-configurability-architecture-the-4-tier-model)
7. [Comprehensive Configuration Reference](#7-comprehensive-configuration-reference)
   - [7.1 `otp-config.json` (System Features & Sandbox Flags)](#71-otp-configjson-system-features--sandbox-flags)
   - [7.2 `build-config.json` (Graph Construction & Ingestion Engine)](#72-build-configjson-graph-construction--ingestion-engine)
   - [7.3 `router-config.json` (Runtime Routing, RAPTOR & Updaters)](#73-router-configjson-runtime-routing-raptor--updaters)
   - [7.4 `RouteRequest` (Routing Defaults & Dynamic Request Overrides)](#74-routerequest-routing-defaults--dynamic-request-overrides)
8. [Bengaluru Deployment Production Configuration Profiles](#8-bengaluru-deployment-production-configuration-profiles)
   - [8.1 Production `build-config.json`](#81-production-build-configjson)
   - [8.2 Production `router-config.json`](#82-production-router-configjson)
   - [8.3 Production `otp-config.json`](#83-production-otp-configjson)

---

## 1. Executive Overview & System Architecture

OpenTripPlanner 2 (OTP2) is an enterprise-grade, multimodal journey planning and network analysis
engine written in Java (JDK 21+ / JDK 25 compatible). It unifies scheduled public transit schedules,
dynamic real-time tracking feeds, and physical street networks into an in-memory topological graph.

```
+-----------------------------------------------------------------------------------+
|                                Client Applications                                |
|   (Vite/React Debug Web UI, Mobile Apps, Third-Party MaaS Backends, Dispatchers)  |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTP / JSON / Protocol Buffers
                                         v
+-----------------------------------------------------------------------------------+
|                           OpenTripPlanner HTTP Layer                              |
|   Grizzly NIO HTTP Server (Port 8080 default, thread-pooled, CORS-configurable)   |
+-----------------------------------------------------------------------------------+
   |                    |                      |                     |
   v                    v                      v                     v
+-------------+  +---------------+  +---------------------+  +--------------------+
| Transmodel  |  | Mapbox Vector |  | Actuator / Health / |  | GraphiQL Developer |
| GraphQL v3  |  | Tiles API     |  | Metrics API         |  | Interactive IDE    |
+-------------+  +---------------+  +---------------------+  +--------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                         Core Journey Planning Engine                              |
|                                                                                   |
|  +-------------------------------------+  +------------------------------------+  |
|  |     RAPTOR Algorithm (Transit)      |  |     A* / Dijkstra (Street Network) |  |
|  | - Round-Based Public Transit Router |  | - Walk, Bicycle, Car, Micromobility|  |
|  | - Range-RAPTOR & Multi-criteria     |  | - Turn restrictions & elevations   |  |
|  | - Dynamic Search Windows            |  | - Direct transfers & stop-linking  |  |
|  +-------------------------------------+  +------------------------------------+  |
|                                        ^                                          |
|                                        |                                          |
|  +-----------------------------------------------------------------------------+  |
|  |            Real-Time State Manager & Timetable Snapshotter                  |  |
|  | - GTFS-Realtime (TripUpdates, VehiclePositions, ServiceAlerts)              |  |
|  | - GBFS (Bicycle / Scooter / Free-floating rental availability)             |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                         ^
                                         |
+-----------------------------------------------------------------------------------+
|                         Graph Ingestion & Build Pipeline                          |
|  - OpenStreetMap (.osm / .pbf): Bengaluru road, footway, cycleway, stairs         |
|  - GTFS Feed 1: BMTC City Bus (10,000+ stops, 7,000+ trips)                       |
|  - GTFS Feed 2: BMRCL Namma Metro (Purple, Green Lines, viaduct alignments)       |
|  - Elevation DEM: GeoTIFF terrain grids (slopes, incline traversal costs)         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Complete API Catalog & Endpoint Matrix

OTP2 consolidates all transit information into clean, high-throughput endpoints:

| Endpoint Path                                    | Protocol / Format     | Default State | Description / Purpose                                                             |
| :----------------------------------------------- | :-------------------- | :-----------: | :-------------------------------------------------------------------------------- |
| `/otp/transmodel/v3`                             | HTTP POST (GraphQL)   |  **Active**   | Primary modern routing & transit inventory API using Transmodel / NeTEx ontology. |
| `/otp/routers/{routerId}/index/graphql`          | HTTP POST (GraphQL)   |  **Active**   | GTFS-vocabulary GraphQL API (commonly used with Digitransit frontends).           |
| `/otp/debug/vectortiles/{layer}/{z}/{x}/{y}.pbf` | HTTP GET (Mapbox MVT) |  **Active**   | Vector map tiles rendering stops, patterns, street edges, and geometries.         |
| `/otp/routers/{routerId}/vectorTiles/...`        | HTTP GET (Mapbox MVT) |    Sandbox    | Stable Vector Tiles API (enabled via `SandboxAPIMapboxVectorTilesApi`).           |
| `/otp/actuator/health`                           | HTTP GET (JSON)       | Configurable  | Application health status (`UP`/`DOWN`), memory, and graph loading readiness.     |
| `/otp/actuator/prometheus`                       | HTTP GET (Plaintext)  | Configurable  | Prometheus scraping endpoint for memory, GC, latency, and request counts.         |
| `/otp/serverinfo`                                | HTTP GET (JSON)       |  **Active**   | Engine version, build timestamp, timezone, and loaded bounding box.               |
| `/otp/ping`                                      | HTTP GET (Plaintext)  |  **Active**   | Lightweight heartbeat monitor returning `pong`.                                   |
| `/otp/updaters`                                  | HTTP GET (JSON)       |  **Active**   | Real-time updater statuses, polling latencies, and last ingested updates.         |
| `/otp/geocode`                                   | HTTP GET (JSON)       |    Sandbox    | Built-in stop and quay name autocomplete/geocoder.                                |
| `/graphiql?flavor=transmodel`                    | HTTP GET (HTML/JS)    |  **Active**   | Interactive in-browser IDE for exploring schema and executing Transmodel queries. |
| `/graphiql?flavor=gtfs`                          | HTTP GET (HTML/JS)    |  **Active**   | Interactive in-browser IDE for GTFS GraphQL schema.                               |
| `/`                                              | HTTP GET (HTML/SPA)   |  **Active**   | Integrated React/MapLibre Web Debug Client.                                       |

> [!NOTE] The legacy REST planner API (`/otp/routers/default/plan`) has been officially deprecated
> and removed in OTP 2.x in favor of the flexible, type-safe GraphQL interfaces.

---

## 3. Core Engine Functionalities & Capabilities

### 3.1 Multimodal Itinerary Computation

- **Transit Routing Modes**: `bus`, `metro`, `rail`, `tram`, `ferry`, `cableway`, `funicular`,
  `air`.
- **Street / Direct Modes**: `foot`, `bicycle`, `car`, `car_park` (Park and Ride), `car_pickup`
  (Kiss and Ride), `car_rental`, `bicycle_rental`, `scooter_rental`.
- **Access / Egress / Direct Separation**: Allows walking to a bus stop, riding a bus, transferring
  to metro, and riding a rented scooter from the destination metro station to the final address.

### 3.2 Advanced RAPTOR Optimization Engine

- **Round-Based Multi-Criteria**: Employs RAPTOR (Rapid Transit Routing) iterating round-by-round to
  discover the Pareto-optimal frontier between:
  - Total Journey Duration
  - Earliest Arrival Time
  - Latest Departure Time
  - Number of Transfers (boardings)
  - Generalized Cost (fare, discomfort, wait time, elevation effort)
- **Range-RAPTOR & Dynamic Search Windows**: Computes optimal itineraries across departure windows
  (e.g. 1 to 2 hours) rather than single timestamps.

### 3.3 Real-Time Ingestion (GTFS-RT & GBFS)

- **GTFS-RT TripUpdates**: Dynamically shifts arrival/departure schedules, applies delays, handles
  platform changes, and processes cancellations.
- **GTFS-RT ServiceAlerts**: Ingests disruption text, attaching alert notices directly to lines,
  quays, or journeys.
- **GTFS-RT VehiclePositions**: Tracks live coordinates of transit vehicles for vehicle map
  rendering.
- **GBFS (General Bikeshare Feed Specification)**: Real-time dock capacity and free-floating vehicle
  counts (e.g., Yulu, Bounce bikes).

### 3.4 Generalized Cost & Rupee Pricing Model

Every itinerary calculates a `generalizedCost` representing financial, time, and physical
resistance:
$$\text{Cost} = w_{\text{walk}} \cdot t_{\text{walk}} + w_{\text{wait}} \cdot t_{\text{wait}} + w_{\text{transit}} \cdot t_{\text{transit}} + P_{\text{transfer}} + \text{Fare}_{\text{INR}}$$
In the Bengaluru build, currency displays are mapped to Indian Rupees (`₹`).

### 3.5 Realistic Street & Station Topologies

- **In-Station Transfers**: Steps, elevators, corridors, and platform geometries derived from OSM
  ways.
- **Wheelchair Accessibility**: Pathfinding strictly restricted to ramps, elevators, and curb-cut
  sidewalks when `wheelchairAccessible: true`.
- **Slope & Elevation Reluctance**: Bicycling and walking resistance dynamically scaled based on
  elevation profiles.

---

## 4. Transmodel GraphQL API: Format, Structure & Queries

### 4.1 API Endpoint & Transport Specifications

- **Endpoint**: `http://<host>:<port>/otp/transmodel/v3`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `OTP-Timeout-Seconds: 15` _(optional client processing deadline)_
- **Payload Format**:

```json
{
  "query": "query MyTripQuery($from: Location!, $to: Location!) { trip(from: $from, to: $to) { tripPatterns { duration } } }",
  "variables": {
    "from": { "coordinates": { "latitude": 12.9784, "longitude": 77.5726 } },
    "to": { "coordinates": { "latitude": 12.9756, "longitude": 77.6066 } }
  }
}
```

---

### 4.2 Root Query Reference (`QueryType`)

| Query Field               | Return Type                 | Arguments Summary                                                            | Purpose                                                                       |
| :------------------------ | :-------------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| `trip(...)`               | `Trip!`                     | `from`, `to`, `dateTime`, `modes`, `searchWindow`, `banned`, etc.            | Core origin-to-destination routing search.                                    |
| `viaTrip(...)`            | `ViaTrip!`                  | `from`, `to`, `via: [TripViaLocationInput!]!`, `dateTime`, etc.              | Multimodal journey with intermediate stop visits or pass-throughs.            |
| `refetchTripPattern(...)` | `RefetchTripPatternResult!` | `legs: [ID!]!`, `from`, `to`, `alightSlackDefault`, etc.                     | Refreshes an existing itinerary with live updates and re-computed times.      |
| `nearest(...)`            | `placeAtDistanceConnection` | `latitude`, `longitude`, `maximumDistance`, `filterByPlaceTypes`             | Radial search for nearby quays, stop places, bike rentals, and car parks.     |
| `stopPlace(id)`           | `StopPlace`                 | `id: String!`                                                                | Fetches detailed hierarchy and child quays of a station.                      |
| `stopPlaces(...)`         | `[StopPlace]!`              | `ids: [String]`                                                              | Bulk retrieval of stop places.                                                |
| `stopPlacesByBbox(...)`   | `[StopPlace]!`              | `minimumLatitude`, `maximumLatitude`, `minimumLongitude`, `maximumLongitude` | Bounding box spatial query for stations.                                      |
| `quay(id)`                | `Quay`                      | `id: String!`                                                                | Retrieves a specific platform/quay, next scheduled departures, and lines.     |
| `quays(...)`              | `[Quay]!`                   | `ids: [String]`, `name: String`                                              | Filtered list of quays by IDs or name substrings.                             |
| `quaysByRadius(...)`      | `quayAtDistanceConnection`  | `latitude`, `longitude`, `radius`                                            | Street-network walking distance quay search.                                  |
| `line(id)`                | `Line`                      | `id: ID!`                                                                    | Details of a transit route/line, public code, operator, and quays.            |
| `lines(...)`              | `[Line]!`                   | `authorities`, `transportModes`, `publicCode`, `name`                        | Filterable catalog of all lines.                                              |
| `serviceJourney(id)`      | `ServiceJourney`            | `id: String!`                                                                | Retrieves a specific scheduled trip run with all stop times and geometry.     |
| `datedServiceJourney(id)` | `DatedServiceJourney`       | `id: String`                                                                 | A specific run on an exact operating date with real-time deviations.          |
| `authority(id)`           | `Authority`                 | `id: String!`                                                                | Transit agency information (e.g. BMTC, BMRCL).                                |
| `authorities`             | `[Authority]!`              | _(none)_                                                                     | Returns all transit operators registered in the graph.                        |
| `bikeRentalStation(id)`   | `BikeRentalStation`         | `id: String!`                                                                | Real-time availability for a specific bike dock.                              |
| `bikeRentalStations(...)` | `[BikeRentalStation]!`      | `ids: [String]`                                                              | Multi-station rental status.                                                  |
| `bikeParks`               | `[BikePark]!`               | _(none)_                                                                     | All bicycle parking locations.                                                |
| `serverInfo`              | `ServerInfo!`               | _(none)_                                                                     | Server build details, OTP version, and transit time zones.                    |
| `routingParameters`       | `RoutingParameters`         | _(none)_                                                                     | Default server-configured walking speed, search windows, and transfer slacks. |

---

### 4.3 Primary Routing Query (`trip`) In-Depth

#### Key Input Arguments to `trip(...)`

```graphql
trip(
  from: Location!
  to: Location!
  dateTime: DateTime
  arriveBy: Boolean = false
  timetableView: Boolean = true
  modes: Modes
  searchWindow: Int
  numTripPatterns: Int = 50
  pageCursor: String
  walkSpeed: Float = 1.35
  walkReluctance: Float = 2.0
  waitReluctance: Float = 1.0
  transferPenalty: Int = 0
  transferSlack: Int = 120
  boardSlackDefault: Int = 0
  alightSlackDefault: Int = 0
  maximumTransfers: Int = 12
  maximumAdditionalTransfers: Int = 5
  wheelchairAccessible: Boolean = false
  banned: InputBanned
  whiteListed: InputWhiteListed
  filters: [TripFilterInput!]
  bikePreferences: BikePreferencesInput
  scooterPreferences: ScooterPreferencesInput
  itineraryFilters: ItineraryFilters
): Trip!
```

#### Argument Details

1. **`from` & `to` (`Location!`)**:
   - Accepts GPS coordinates: `{ coordinates: { latitude: 12.9784, longitude: 77.5726 } }`
   - Or place identifiers: `{ place: "BMRCL:Stop:101" }`
2. **`dateTime` (`DateTime`)**:
   - ISO-8601 string, e.g. `"2026-09-21T09:30:00+05:30"`. Defaults to current system time.
3. **`arriveBy` (`Boolean`)**:
   - `false` (default): Trip departs after `dateTime`.
   - `true`: Trip must arrive before `dateTime`.
4. **`modes` (`Modes`)**:
   - Configures access, egress, direct, and transit modes.
   - Example:
     ```json
     {
       "accessMode": "foot",
       "egressMode": "foot",
       "directMode": "foot",
       "transportModes": [{ "transportMode": "bus" }, { "transportMode": "metro" }]
     }
     ```
5. **`searchWindow` (`Int`)**:
   - Search window duration in minutes (max 1440). RAPTOR analyzes all departures in this interval
     to find optimal options.
6. **`transferPenalty` (`Int`)**:
   - Extra generalized cost seconds added per transfer to discourage multi-seat journeys unless
     significantly faster.
7. **`transferSlack` (`Int`)**:
   - Minimum buffer (in seconds, default 120s) required when changing between two vehicles.
8. **`wheelchairAccessible` (`Boolean`)**:
   - Restricts street paths to wheelchair-compliant walkways and slopes.
9. **`banned` & `whiteListed` (`InputBanned` / `InputWhiteListed`)**:
   - Exclude or strictly mandate specific lines, authorities, or quays:
     `banned: { lines: ["BMTC:335E_Down"] }`

---

### 4.4 Intermediate / Via Routing Query (`viaTrip`)

The `viaTrip` endpoint enables complex itineraries where a passenger must stop at or pass through
intermediate waypoints:

```graphql
viaTrip(
  from: Location!
  to: Location!
  dateTime: DateTime
  via: [TripViaLocationInput!]!
  numTripPatterns: Int = 50
  modes: Modes
): ViaTrip!
```

#### Via Location Types:

- **`visit`**: Physical disembarkation at a stop or coordinate with a minimum wait duration (e.g.,
  stopping for 30 minutes at Majestic before continuing).
- **`passThrough`**: Journey must stay on a vehicle that passes through or stops at a designated
  quay/station without requiring alighting.

---

### 4.5 Spatial & Transit Inspection Queries (`nearest`, `quays`, `lines`)

#### Radial Place Discovery (`nearest`)

```graphql
query FindNearbyTransit {
  nearest(
    latitude: 12.9756
    longitude: 77.6066
    maximumDistance: 1000.0
    maximumResults: 10
    filterByPlaceTypes: [quay, stopPlace, bicycleRent]
  ) {
    edges {
      node {
        distance
        place {
          __typename
          id
          latitude
          longitude
          ... on Quay {
            name
            publicCode
          }
          ... on StopPlace {
            name
            transportMode
          }
        }
      }
    }
  }
}
```

---

### 4.6 Real-time Trip Refetching (`refetchTripPattern`)

Enables mobile and web apps to maintain an active journey state while the user is travelling:

- Accepts an array of leg identifiers from an earlier query.
- Recalculates delays, expected arrival/departure timestamps, and cancellation statuses based on the
  latest GTFS-RT updaters.

---

### 4.7 Production GraphQL Request & Response Examples

#### Production Request (BMTC Bus + Metro Multimodal Query)

**POST** `http://localhost:8080/otp/transmodel/v3`  
**Headers**: `Content-Type: application/json`

```json
{
  "query": "query PlanBengaluruTrip($from: Location!, $to: Location!, $time: DateTime!) { trip(from: $from, to: $to, dateTime: $time, modes: { accessMode: foot, egressMode: foot, directMode: foot, transportModes: [{ transportMode: bus }, { transportMode: metro }] }) { tripPatterns { duration distance startTime endTime generalizedCost legs { mode duration distance aimedStartTime expectedStartTime aimedEndTime expectedEndTime fromPlace { name quay { id publicCode } } toPlace { name quay { id publicCode } } line { publicCode name transportMode authority { name } } legGeometry { points } } } } }",
  "variables": {
    "from": { "coordinates": { "latitude": 12.9352, "longitude": 77.6245 } },
    "to": { "coordinates": { "latitude": 12.9709, "longitude": 77.5372 } },
    "time": "2026-09-21T08:30:00+05:30"
  }
}
```

#### Standard JSON Response Payload

```json
{
  "data": {
    "trip": {
      "tripPatterns": [
        {
          "duration": 4020,
          "distance": 15430.5,
          "startTime": "2026-09-21T08:30:00+05:30",
          "endTime": "2026-09-21T09:37:00+05:30",
          "generalizedCost": 68,
          "legs": [
            {
              "mode": "foot",
              "duration": 600,
              "distance": 800.0,
              "aimedStartTime": "2026-09-21T08:30:00+05:30",
              "expectedStartTime": "2026-09-21T08:30:00+05:30",
              "aimedEndTime": "2026-09-21T08:40:00+05:30",
              "expectedEndTime": "2026-09-21T08:40:00+05:30",
              "fromPlace": { "name": "Origin", "quay": null },
              "toPlace": {
                "name": "Sony World 80ft Road Koramangala",
                "quay": { "id": "BMTC:Stop:9812", "publicCode": "SW80" }
              },
              "line": null,
              "legGeometry": { "points": "w~snAywlxM..." }
            },
            {
              "mode": "bus",
              "duration": 1020,
              "distance": 4485.0,
              "aimedStartTime": "2026-09-21T08:42:00+05:30",
              "expectedStartTime": "2026-09-21T08:43:30+05:30",
              "aimedEndTime": "2026-09-21T08:59:00+05:30",
              "expectedEndTime": "2026-09-21T09:00:30+05:30",
              "fromPlace": {
                "name": "Sony World 80ft Road Koramangala",
                "quay": { "id": "BMTC:Stop:9812", "publicCode": "SW80" }
              },
              "toPlace": {
                "name": "Trinity Circle",
                "quay": { "id": "BMTC:Stop:1042", "publicCode": "TC" }
              },
              "line": {
                "publicCode": "G-2",
                "name": "Sarjapura to Mayohall",
                "transportMode": "bus",
                "authority": { "name": "Bangalore Metropolitan Transport Corporation" }
              },
              "legGeometry": { "points": "e`tnAalmxM..." }
            },
            {
              "mode": "foot",
              "duration": 480,
              "distance": 523.0,
              "aimedStartTime": "2026-09-21T09:00:30+05:30",
              "expectedStartTime": "2026-09-21T09:00:30+05:30",
              "aimedEndTime": "2026-09-21T09:08:30+05:30",
              "expectedEndTime": "2026-09-21T09:08:30+05:30",
              "fromPlace": { "name": "Trinity Circle", "quay": null },
              "toPlace": {
                "name": "Trinity Metro Station",
                "quay": { "id": "BMRCL:Quay:TRINITY_P1", "publicCode": "P1" }
              },
              "line": null,
              "legGeometry": { "points": "yvtnA{hmxM..." }
            },
            {
              "mode": "metro",
              "duration": 1020,
              "distance": 9585.0,
              "aimedStartTime": "2026-09-21T09:10:00+05:30",
              "expectedStartTime": "2026-09-21T09:10:00+05:30",
              "aimedEndTime": "2026-09-21T09:27:00+05:30",
              "expectedEndTime": "2026-09-21T09:27:00+05:30",
              "fromPlace": {
                "name": "Trinity Metro Station",
                "quay": { "id": "BMRCL:Quay:TRINITY_P1", "publicCode": "P1" }
              },
              "toPlace": {
                "name": "Vijayanagar Metro Station",
                "quay": { "id": "BMRCL:Quay:VIJAY_P1", "publicCode": "P1" }
              },
              "line": {
                "publicCode": "Purple Line",
                "name": "Whitefield to Challaghatta",
                "transportMode": "metro",
                "authority": { "name": "Bangalore Metro Rail Corporation Limited" }
              },
              "legGeometry": { "points": "abunAcgmxM..." }
            },
            {
              "mode": "foot",
              "duration": 600,
              "distance": 635.0,
              "aimedStartTime": "2026-09-21T09:27:00+05:30",
              "expectedStartTime": "2026-09-21T09:27:00+05:30",
              "aimedEndTime": "2026-09-21T09:37:00+05:30",
              "expectedEndTime": "2026-09-21T09:37:00+05:30",
              "fromPlace": { "name": "Vijayanagar Metro Station", "quay": null },
              "toPlace": { "name": "Destination", "quay": null },
              "line": null,
              "legGeometry": { "points": "edunA_zkxM..." }
            }
          ]
        }
      ]
    }
  }
}
```

---

## 5. Alternative & Supporting APIs

### 5.1 Mapbox Vector Tiles API (`/otp/debug/vectortiles`)

Delivers vector tiles encoded in Protocol Buffers (`.pbf`) for slippy map rendering in MapLibre /
Mapbox GL:

- **Stops Layer**: `/otp/debug/vectortiles/stops/{z}/{x}/{y}.pbf`
- **Stations Layer**: `/otp/debug/vectortiles/stations/{z}/{x}/{y}.pbf`
- **Transit Pattern Geometries**: `/otp/debug/vectortiles/patterns/{z}/{x}/{y}.pbf`
- **Street Edges & Walkability**: `/otp/debug/vectortiles/streets/{z}/{x}/{y}.pbf`
- **TileJSON Metadata**: `/otp/debug/vectortiles/style.json`

### 5.2 Actuator & Health / Metrics API (`/otp/actuator`)

Enabled by setting `"ActuatorAPI": true` in `otp-config.json`:

- **`GET /otp/actuator/health`**: Returns JSON status:
  ```json
  {
    "status": "UP",
    "components": {
      "graph": { "status": "UP", "details": { "routerId": "bengaluru", "vertexCount": 363825 } },
      "diskSpace": { "status": "UP" },
      "ping": { "status": "UP" }
    }
  }
  ```
- **`GET /otp/actuator/prometheus`**: Formatted metrics including `jvm_memory_used_bytes`,
  `otp_routing_seconds_count`, and `http_server_requests_seconds`.

### 5.3 Server Info & Diagnostics (`/otp/serverinfo`, `/otp/ping`)

- **`GET /otp/serverinfo`**:
  ```json
  {
    "version": "2.11.0-SNAPSHOT",
    "cpuName": "11th Gen Intel(R) Core(TM)",
    "nCores": 8,
    "internalTransitModelTimeZone": "Asia/Kolkata",
    "envelope": [12.734, 77.382, 13.189, 77.821]
  }
  ```
- **`GET /otp/ping`**: Returns string `pong`.
- **`GET /otp/updaters`**: Real-time poll loop statistics for GTFS-RT/GBFS feeds.

### 5.4 Interactive Explorers (`/graphiql`)

Integrated GraphiQL browser playground:

- **Transmodel Flavor**: `http://localhost:8080/graphiql?flavor=transmodel`
- **GTFS Flavor**: `http://localhost:8080/graphiql?flavor=gtfs` Provides full interactive
  documentation, argument hints, autocomplete, and real-time schema validation.

---

## 6. Configurability Architecture (The 4-Tier Model)

OTP2 adopts a 4-tier configuration lifecycle designed for production reliability:

```
+-------------------------------------------------------------------------+
| Level 1: otp-config.json                                                |
| Global system feature flags, API toggles, and sandbox module gates.     |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| Level 2: build-config.json (Baked into graph.obj)                       |
| Ingestion parameters, OSM tag mappings, transfer distances, elevation. |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| Level 3: router-config.json (Dynamic Runtime)                           |
| RAPTOR thread pools, routing defaults, real-time updaters, timeouts.   |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| Level 4: Client Request (GraphQL Variable Overrides)                    |
| Per-query parameters: walkSpeed, arriveBy, maxTransfers, time, modes.  |
+-------------------------------------------------------------------------+
```

### Environment Variable Substitution Syntax

Any string in any JSON configuration file can reference system environment variables using
`${VARIABLE_NAME}`:

```json
{
  "storage": {
    "gsCredentials": "${GCP_KEY_PATH}",
    "bucket": "${TRANSIT_BUCKET_NAME}"
  }
}
```

---

## 7. Comprehensive Configuration Reference

### 7.1 `otp-config.json` (System Features & Sandbox Flags)

Defined in the root base directory to enable or disable subsystems:

```json
{
  "otpFeatures": {
    "TransmodelGraphQlApi": true,
    "GtfsGraphQlApi": true,
    "DebugUi": true,
    "ActuatorAPI": true,
    "OptimizeTransfers": true,
    "SandboxAPIMapboxVectorTilesApi": true
  }
}
```

#### Complete Feature Flag Master Table

| Feature Flag Key                     | Default |   Category    | Operational Impact / Purpose                                                            |
| :----------------------------------- | :-----: | :-----------: | :-------------------------------------------------------------------------------------- |
| `TransmodelGraphQlApi`               | `true`  |   Standard    | Enables the `/otp/transmodel/v3` endpoint.                                              |
| `GtfsGraphQlApi`                     | `true`  |   Standard    | Enables the GTFS GraphQL endpoint.                                                      |
| `DebugUi`                            | `true`  |   Standard    | Serves the web-based visual debugger at `/`.                                            |
| `OptimizeTransfers`                  | `true`  | Optimization  | Evaluates multiple transfer stops to choose the safest, lowest-wait transfer.           |
| `ConsiderPatternsForDirectTransfers` | `true`  |  Performance  | Prunes redundant transfer links to identical transit trip patterns.                     |
| `TransferConstraints`                | `true`  |   Standard    | Strictly enforces `transfers.txt` rules from GTFS (e.g., timed guaranteed connections). |
| `ParallelRouting`                    | `false` | Experimental  | Parallelizes street access/egress phases across available CPU cores.                    |
| `FloatingBike`                       | `true`  | Micromobility | Supports free-floating GBFS bike/scooter routing.                                       |
| `APIServerInfo`                      | `true`  |  Operational  | Exposes the `/otp/serverinfo` endpoint.                                                 |
| `APIUpdaterStatus`                   | `true`  |  Operational  | Exposes the `/otp/updaters` endpoint.                                                   |
| `ActuatorAPI`                        | `false` |    Sandbox    | Exposes Spring Boot Actuator `/otp/actuator/health` & Prometheus metrics.               |
| `HttpResponseTimeMetrics`            | `false` |    Sandbox    | Measures and logs percentile latency per API client.                                    |
| `SandboxAPIMapboxVectorTilesApi`     | `false` |    Sandbox    | Enables stable production vector tile endpoints.                                        |
| `SandboxAPIGeocoder`                 | `false` |    Sandbox    | Enables the built-in stop name geocoding endpoint `/otp/geocode`.                       |
| `FaresV2`                            | `false` |    Sandbox    | Enables GTFS Fares V2 processing engine.                                                |
| `FlexRouting`                        | `false` |    Sandbox    | Enables Demand Responsive Transit (DRT) / dial-a-ride routing.                          |
| `CarPooling`                         | `false` |    Sandbox    | Enables multi-passenger carpooling matching algorithms.                                 |
| `Emission`                           | `false` |    Sandbox    | Computes carbon footprint ($CO_2$ grams) per itinerary.                                 |
| `GoogleCloudStorage`                 | `false` |    Storage    | Allows direct reading of OSM and GTFS inputs from `gs://` URIs.                         |

---

### 7.2 `build-config.json` (Graph Construction & Ingestion Engine)

Controls how OpenStreetMap and transit feeds are compiled. Parameters are baked into `graph.obj`.

| Parameter                                 |        Type         |    Default     | Description & Tuning Guidance                                                                                                                                |
| :---------------------------------------- | :-----------------: | :------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transitServiceStart`                     | `duration` / `date` |    `"-P1Y"`    | Minimum start date for imported calendar services. Filter out stale historic services to save RAM.                                                           |
| `transitServiceEnd`                       | `duration` / `date` |    `"P3Y"`     | Maximum future date for imported calendar trips.                                                                                                             |
| `maxStopToShapeSnapDistance`              |      `double`       |    `150.0`     | Maximum distance (meters) between a GTFS stop and its shape alignment before snapping fails. For Indian bus stops with GPS variance, set to `300.0`–`500.0`. |
| `maxTransferDuration`                     |     `duration`      |   `"PT30M"`    | Maximum walking duration for pre-calculated stop-to-stop transfer links.                                                                                     |
| `subwayAccessTime`                        |      `double`       |     `2.0`      | Extra minutes automatically added to reach underground or elevated metro platforms from the street.                                                          |
| `transitModelTimeZone`                    |     `time-zone`     | _feed-default_ | Force a unified graph timezone (e.g. `"Asia/Kolkata"`).                                                                                                      |
| `islandPruning`                           |      `object`       |    `{...}`     | Automatic cleanup of disconnected street fragments in OSM.                                                                                                   |
| `islandPruning.islandWithStopsMaxSize`    |      `integer`      |      `2`       | Prunes islands containing stops if smaller than this threshold.                                                                                              |
| `islandPruning.islandWithoutStopsMaxSize` |      `integer`      |      `10`      | Prunes floating road segments with no transit stops.                                                                                                         |
| `platformEntriesLinking`                  |      `boolean`      |    `false`     | Links stairs, escalators, and elevator nodes in OSM directly to transit platforms.                                                                           |
| `staticParkAndRide`                       |      `boolean`      |     `true`     | Detects parking lots tagged in OSM as park-and-ride facilities.                                                                                              |
| `osmTagMapping`                           |       `enum`        |  `"default"`   | Road classification rules (`default`, `norway`, `finland`).                                                                                                  |
| `dataImportReport`                        |      `boolean`      |    `false`     | Generates a comprehensive HTML diagnostic report of all GTFS/OSM syntax issues.                                                                              |

---

### 7.3 `router-config.json` (Runtime Routing, RAPTOR & Updaters)

Configures the runtime engine behavior without requiring graph rebuilding:

```json
{
  "routingDefaults": {
    "walkSpeed": 1.35,
    "transferSlack": 120,
    "maxJourneyDuration": "PT6H"
  },
  "transit": {
    "dynamicSearchWindow": {
      "minWindow": "PT40M",
      "maxWindow": "PT3H"
    },
    "searchThreadPoolSize": 8
  },
  "updaters": []
}
```

#### Complete Runtime Parameter Breakdown

| Parameter                               |    Type    |  Default  | Description                                                                          |
| :-------------------------------------- | :--------: | :-------: | :----------------------------------------------------------------------------------- |
| `routingDefaults`                       |  `object`  |  `{...}`  | Overrides default `RouteRequest` properties (see Section 7.4).                       |
| `server.apiProcessingTimeout`           | `duration` | `"PT-1S"` | Hard timeout cutoff for slow routing requests (e.g. `"PT10S"` for 10 seconds).       |
| `transit.searchThreadPoolSize`          | `integer`  |    `0`    | Number of parallel worker threads for batch routing queries (`0` = single-threaded). |
| `transit.maxNumberOfTransfers`          | `integer`  |   `12`    | Memory pre-allocation limit for RAPTOR rounds.                                       |
| `transit.maxSearchWindow`               | `duration` | `"PT24H"` | Upper cap on the `searchWindow` query argument.                                      |
| `transit.dynamicSearchWindow.minWindow` | `duration` | `"PT40M"` | Minimum time window evaluated for low-frequency networks.                            |
| `transit.dynamicSearchWindow.maxWindow` | `duration` | `"PT3H"`  | Maximum dynamic search window for high-frequency networks.                           |
| `timetableUpdates.purgeExpiredData`     | `boolean`  |  `true`   | Automatically drops expired real-time vehicle positions from memory.                 |
| `timetableUpdates.maxSnapshotFrequency` | `duration` | `"PT1S"`  | Minimum duration between publishing new graph snapshots for concurrent readers.      |
| `transmodelApi.maxNumberOfResultFields` | `integer`  | `1000000` | Security limit against nested GraphQL query expansion attacks.                       |

#### Real-Time Updaters Configuration (`updaters` array)

Supports real-time pollers for GTFS-RT:

```json
{
  "type": "stop-time-updater",
  "frequency": "PT30S",
  "url": "https://api.example.com/gtfs-rt/trip-updates",
  "feedId": "BMTC"
},
{
  "type": "real-time-alerts",
  "frequency": "PT60S",
  "url": "https://api.example.com/gtfs-rt/alerts",
  "feedId": "BMRCL"
},
{
  "type": "vehicle-positions",
  "frequency": "PT15S",
  "url": "https://api.example.com/gtfs-rt/vehicle-positions",
  "feedId": "BMTC"
}
```

---

### 7.4 `RouteRequest` (Routing Defaults & Dynamic Request Overrides)

These parameters control traversal costs, penalties, speeds, and behavioral preferences across the
street network:

| Parameter Key              |    Type    |     Default      | Operational Impact                                                                                                                            |
| :------------------------- | :--------: | :--------------: | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `walkSpeed`                |  `double`  |      `1.35`      | Walking speed in meters/second (~4.86 km/h).                                                                                                  |
| `walkReluctance`           |  `double`  |      `2.0`       | Cost multiplier for walking time compared to in-vehicle transit time. Increasing this forces OTP to find transit legs rather than long walks. |
| `waitReluctance`           |  `double`  |      `1.0`       | Discomfort multiplier for waiting at a stop.                                                                                                  |
| `transferPenalty`          | `integer`  |       `0`        | Artificial cost seconds added to every transfer. Set to `300` (5 mins) to heavily favor direct bus/metro lines.                               |
| `transferSlack`            | `duration` |     `"PT2M"`     | Buffer safety margin between exiting one vehicle and boarding another.                                                                        |
| `boardSlack`               | `duration` |     `"PT0S"`     | Minimum wait time added before the first transit departure.                                                                                   |
| `alightSlack`              | `duration` |     `"PT0S"`     | Margin required after exiting a vehicle.                                                                                                      |
| `maxJourneyDuration`       | `duration` |    `"PT24H"`     | Maximum allowable total travel time before pruning a path.                                                                                    |
| `maxDirectStreetDuration`  | `duration` |     `"PT4H"`     | Maximum duration allowed for direct non-transit searches (walk/bike/car).                                                                     |
| `accessEgress.maxDuration` | `duration` |    `"PT45M"`     | Maximum walking duration allowed to reach the first transit stop or from the final transit stop to destination.                               |
| `bicycle.speed`            |  `double`  |      `5.0`       | Cycling speed in meters/second (18 km/h).                                                                                                     |
| `bicycle.reluctance`       |  `double`  |      `2.0`       | Perceived effort factor for cycling.                                                                                                          |
| `bicycle.optimization`     |   `enum`   | `"safe-streets"` | Optimization criteria: `safe-streets`, `flat`, `speed`, `triangle`.                                                                           |
| `car.accelerationSpeed`    |  `double`  |      `2.9`       | Automobile acceleration in $m/s^2$.                                                                                                           |
| `car.decelerationSpeed`    |  `double`  |      `2.9`       | Automobile deceleration in $m/s^2$.                                                                                                           |
| `wheelchairAccessible`     | `boolean`  |     `false`      | Filters for step-free routes, elevators, and maximum curb heights.                                                                            |
| `streetRoutingTimeout`     | `duration` |     `"PT5S"`     | Timeout for complex street network pathfinding.                                                                                               |

---

## 8. Bengaluru Deployment Production Configuration Profiles

The following configuration files represent the verified, optimal settings for operating
OpenTripPlanner in Bengaluru with BMTC and BMRCL.

### 8.1 Production `build-config.json`

**Path**: `bengaluru/build-config.json`

```json
{
  "transitModelTimeZone": "Asia/Kolkata",
  "transitServiceStart": "2026-09-01",
  "transitServiceEnd": "2027-09-30",
  "maxStopToShapeSnapDistance": 500.0,
  "maxTransferDuration": "PT30M",
  "subwayAccessTime": 2.5,
  "platformEntriesLinking": true,
  "islandPruning": {
    "islandWithStopsMaxSize": 5,
    "islandWithoutStopsMaxSize": 20
  }
}
```

### 8.2 Production `router-config.json`

**Path**: `bengaluru/router-config.json`

```json
{
  "server": {
    "apiProcessingTimeout": "PT15S"
  },
  "routingDefaults": {
    "walkSpeed": 1.3,
    "walkReluctance": 2.2,
    "waitReluctance": 1.1,
    "transferSlack": "PT2M30S",
    "transferPenalty": 180,
    "maxJourneyDuration": "PT4H",
    "accessEgress": {
      "maxDuration": "PT35M",
      "maxStopCount": 300
    }
  },
  "transit": {
    "searchThreadPoolSize": 8,
    "maxNumberOfTransfers": 8,
    "dynamicSearchWindow": {
      "minWindow": "PT45M",
      "maxWindow": "PT2H30M"
    }
  },
  "timetableUpdates": {
    "purgeExpiredData": true,
    "maxSnapshotFrequency": "PT1S"
  }
}
```

### 8.3 Production `otp-config.json`

**Path**: `bengaluru/otp-config.json`

```json
{
  "otpFeatures": {
    "TransmodelGraphQlApi": true,
    "GtfsGraphQlApi": true,
    "DebugUi": true,
    "ActuatorAPI": true,
    "APIServerInfo": true,
    "APIUpdaterStatus": true,
    "OptimizeTransfers": true,
    "ConsiderPatternsForDirectTransfers": true,
    "TransferConstraints": true,
    "SandboxAPIMapboxVectorTilesApi": true,
    "FloatingBike": true
  }
}
```

---

## 9. Operational Verification Checklist

Before deploying this configuration to a staging or production container:

1. **Memory Sizing**:
   - Provide minimum `-Xmx4G` (4GB RAM) for the Bengaluru graph (BMTC 10,031 stops + Namma Metro +
     OSM).
   - For high-concurrency production deployments (100+ req/sec), configure `-Xmx8G` with the G1
     garbage collector:
     ```bash
     java -Xms8G -Xmx8G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -jar otp-shaded.jar --serve bengaluru
     ```
2. **Timezone Uniformity**:
   - Ensure the server host and `build-config.json` transit timezone are set to `"Asia/Kolkata"` to
     avoid midnight rollover discrepancies.
3. **Shape Snapping Tolerance**:
   - Maintain `maxStopToShapeSnapDistance: 500.0` for Indian urban transit where bus stop
     coordinates frequently deviate from OSM road centerlines.
4. **Rupee Presentation**:
   - Verify that client applications consume `generalizedCost` and format it with the Rupee symbol
     (`₹`) as standard for Indian deployments.

---

## 10. Complete cURL Request Cookbook for Every API

Below is a complete, copy-paste-ready catalog of cURL commands tested against OpenTripPlanner on
port 8080 using authentic Bengaluru transit coordinates.

### 10.1 Transmodel GraphQL API (`/otp/transmodel/v3`)

#### 10.1.1 Multimodal Routing (`trip` query: Walk + BMTC Bus + Namma Metro)

```bash
curl -X POST "http://localhost:8080/otp/transmodel/v3" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "query RouteBengaluru($from: Location!, $to: Location!, $dateTime: DateTime!) { trip(from: $from, to: $to, dateTime: $dateTime, modes: { accessMode: foot, egressMode: foot, directMode: foot, transportModes: [{ transportMode: bus }, { transportMode: metro }] }) { tripPatterns { duration distance generalizedCost legs { mode duration distance aimedStartTime aimedEndTime fromPlace { name quay { id publicCode } } toPlace { name quay { id publicCode } } line { publicCode name transportMode authority { name } } legGeometry { points } } } } }",
    "variables": {
      "from": { "coordinates": { "latitude": 12.9352, "longitude": 77.6245 } },
      "to": { "coordinates": { "latitude": 12.9709, "longitude": 77.5372 } },
      "dateTime": "2026-09-21T09:00:00+05:30"
    }
  }'
```

#### 10.1.2 Intermediate Waypoint Routing (`viaTrip` query)

```bash
curl -X POST "http://localhost:8080/otp/transmodel/v3" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "query ViaRoute($from: Location!, $to: Location!, $via: [TripViaLocationInput!]!) { viaTrip(from: $from, to: $to, via: $via) { tripPatterns { duration distance legs { mode line { publicCode } fromPlace { name } toPlace { name } } } } }",
    "variables": {
      "from": { "coordinates": { "latitude": 12.9352, "longitude": 77.6245 } },
      "to": { "coordinates": { "latitude": 12.9809, "longitude": 77.5973 } },
      "via": [
        {
          "visit": {
            "coordinate": { "latitude": 12.9756, "longitude": 77.5731 },
            "minimumWaitTime": "PT15M",
            "label": "Majestic Station Visit"
          }
        }
      ]
    }
  }'
```

#### 10.1.3 Spatial Radius Search for Nearby Quays & Stops (`nearest` query)

```bash
curl -X POST "http://localhost:8080/otp/transmodel/v3" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "query FindNearby($lat: Float!, $lon: Float!) { nearest(latitude: $lat, longitude: $lon, maximumDistance: 800.0, maximumResults: 5, filterByPlaceTypes: [quay, stopPlace]) { edges { node { distance place { id ... on Quay { name publicCode } ... on StopPlace { name transportMode } } } } } }",
    "variables": {
      "lat": 12.9756,
      "lon": 77.6066
    }
  }'
```

#### 10.1.4 Inspect Quay Details & Next Departures (`quay` query)

```bash
curl -X POST "http://localhost:8080/otp/transmodel/v3" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "query GetQuay($id: String!) { quay(id: $id) { id name publicCode latitude longitude lines { id publicCode name transportMode } estimatedCalls(numberOfDepartures: 5) { aimedDepartureTime expectedDepartureTime destinationDisplay { frontText } serviceJourney { line { publicCode } } } } }",
    "variables": {
      "id": "BMRCL:Quay:TRINITY_P1"
    }
  }'
```

#### 10.1.5 Catalog Transit Lines / Routes (`lines` query)

```bash
curl -X POST "http://localhost:8080/otp/transmodel/v3" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "{ lines(transportModes: [metro, bus]) { id publicCode name transportMode authority { name } quays { id name } } }"
  }'
```

#### 10.1.6 Transit Authorities & Agencies (`authorities` query)

```bash
curl -X POST "http://localhost:8080/otp/transmodel/v3" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "{ authorities { id name timezone url phone lines { publicCode } } }"
  }'
```

#### 10.1.7 Server Information & Graph Dimensions (`serverInfo` query)

```bash
curl -X POST "http://localhost:8080/otp/transmodel/v3" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "{ serverInfo { version cpuName nCores internalTransitModelTimeZone envelope } }"
  }'
```

#### 10.1.8 Default Routing Parameters (`routingParameters` query)

```bash
curl -X POST "http://localhost:8080/otp/transmodel/v3" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "{ routingParameters { walkSpeed walkReluctance transferPenalty transferSlack searchWindow } }"
  }'
```

---

### 10.2 GTFS GraphQL API (`/otp/routers/default/index/graphql`)

#### 10.2.1 Transit Routes Query

```bash
curl -X POST "http://localhost:8080/otp/routers/default/index/graphql" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "{ routes { id shortName longName mode agency { name } } }"
  }'
```

#### 10.2.2 Transit Stops Query

```bash
curl -X POST "http://localhost:8080/otp/routers/default/index/graphql" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "{ stops(name: \"Majestic\") { id name code lat lon routes { shortName } } }"
  }'
```

#### 10.2.3 GTFS Routing Query (`plan`)

```bash
curl -X POST "http://localhost:8080/otp/routers/default/index/graphql" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "query": "{ plan(from: {lat: 12.9352, lon: 77.6245}, to: {lat: 12.9709, lon: 77.5372}, date: \"2026-09-21\", time: \"09:00:00\", transportModes: [{mode: BUS}, {mode: SUBWAY}]) { itineraries { duration startTime endTime legs { mode duration distance from { name } to { name } route { shortName } } } } }"
  }'
```

---

### 10.3 Mapbox Vector Tiles API (`/otp/debug/vectortiles`)

#### 10.3.1 Vector Tile Style Specification (MapLibre / Mapbox GL)

```bash
curl -s "http://localhost:8080/otp/debug/vectortiles/style.json"
```

#### 10.3.2 Stops & Stations Layer TileJSON Metadata

```bash
curl -s "http://localhost:8080/otp/debug/vectortiles/regularStops,areaStops,groupStops/tilejson.json"
```

#### 10.3.3 Download PBF Vector Tile (Stops Layer)

```bash
curl -s "http://localhost:8080/otp/debug/vectortiles/regularStops,areaStops,groupStops/12/2928/1924.pbf" -o stops_tile.pbf
```

#### 10.3.4 Street Network (Edges & Vertices) TileJSON Metadata

```bash
curl -s "http://localhost:8080/otp/debug/vectortiles/edges,vertices/tilejson.json"
```

#### 10.3.5 In-Station Transfer Links TileJSON Metadata

```bash
curl -s "http://localhost:8080/otp/debug/vectortiles/transfers/tilejson.json"
```

---

### 10.4 Observability, Health & Updaters APIs

#### 10.4.1 Lightweight Ping (Heartbeat)

```bash
curl -s "http://localhost:8080/otp/ping"
```

#### 10.4.2 Actuator Health Check (Requires `"ActuatorAPI": true` in `otp-config.json`)

```bash
curl -s "http://localhost:8080/otp/actuator/health"
```

#### 10.4.3 Prometheus Metrics Scraping (Requires `"ActuatorAPI": true` in `otp-config.json`)

```bash
curl -s "http://localhost:8080/otp/actuator/prometheus"
```

#### 10.4.4 Real-time Updater Polling Status

```bash
curl -s "http://localhost:8080/otp/updaters"
```

---

### 10.5 Interactive Web Interfaces & Developer IDEs

#### 10.5.1 Transmodel GraphiQL Explorer (Browser)

```text
http://localhost:8080/graphiql?flavor=transmodel
```

#### 10.5.2 GTFS GraphiQL Explorer (Browser)

```text
http://localhost:8080/graphiql?flavor=gtfs
```

#### 10.5.3 OpenTripPlanner Visual Debug Client (Browser)

```text
http://localhost:8080/
```
