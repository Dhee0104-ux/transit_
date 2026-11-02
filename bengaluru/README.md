# OpenTripPlanner Bengaluru — BMTC + Namma Metro Integration

This package keeps the existing OpenTripPlanner source tree and frontend and integrates Bengaluru's **BMTC bus network with Namma Metro**.

## Transit feeds

The `bengaluru` directory contains two independent GTFS feeds:

- `bmtc-bengaluru-gtfs.zip` — the supplied BMTC feed.
- `bmrcl-namma-metro-gtfs.zip` — Namma Metro feed with Purple, Green and Yellow lines.

OTP reads both feeds during the same graph build, so a route can contain BMTC and/or Metro legs and transfers between them.

## Metro network included

- Purple Line — Whitefield (Kadugodi) ↔ Challaghatta — 37 stations
- Green Line — Madavara ↔ Silk Institute — 32 stations
- Yellow Line — Rashtreeya Vidyalaya Road ↔ Delta Electronics Bommasandra — 16 stations
- Shared/interchange stations are represented by the same GTFS stop ID where appropriate.

The Metro station/network source used for this package is the public Bengaluru Metro Network & Stations dataset. It provides station coordinates, line, sequence, interchange flag and adjacent-station information. The generated feed is therefore suitable for routing integration, but its generated timetable should be treated as a planning approximation rather than an official train-by-train timetable.

## Walking access

The existing project uses a compact BMTC-derived fallback OSM network rather than a full Bengaluru OSM road extract. This version adds a short pedestrian connector from each Metro station to the nearest node in that fallback network, so Metro stations are not isolated from walking access.

For production-quality walking/car routing, replace the fallback OSM with a real Bengaluru OSM PBF.

## Important note about the second uploaded archive

The archive supplied alongside the project contains BMTC and local-rail records and an unused `METROB` agency entry, but it contains **no Metro routes/trips**. Using it directly would not actually add Namma Metro service. Therefore the integrated package uses the separate public Bengaluru Metro station/network dataset described above instead of falsely treating that archive as a Metro feed.

## Run on Windows

The package includes a prebuilt OTP shaded JAR, so Maven is **not required just to run this copy**.

Install Java 25 and run:

```bat
bengaluru\run-bengaluru.cmd
```

Then open:

```text
http://localhost:8080
```

The first start rebuilds the graph using both GTFS feeds.

## Validate

```bat
python bengaluru\validate-integrated.py
```

Expected result:

```text
PASS bmtc-bengaluru-gtfs.zip
PASS bmrcl-namma-metro-gtfs.zip
PASS: both transit feeds are structurally consistent
```

## Recreate Metro GTFS

```bat
python bengaluru\build-metro-gtfs.py
python bengaluru\validate-integrated.py
```
