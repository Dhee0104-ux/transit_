# Windows: run the integrated Bengaluru project

This package is OTP 2.11.0-SNAPSHOT and the included shaded JAR was compiled for **Java 25**.

## No Maven is required to run this packaged copy

The project contains:

- `bengaluru/bmtc-bengaluru-gtfs.zip` — supplied BMTC feed
- `bengaluru/bmrcl-namma-metro-gtfs.zip` — integrated Namma Metro feed
- `bengaluru/bengaluru-transit-shape-network.osm` — BMTC fallback street network plus metro station walking connectors
- `otp-shaded/target/otp-shaded-2.11.0-SNAPSHOT-shaded.jar` — prebuilt OTP server
- the original frontend/source tree

## Run

1. Install **Eclipse Temurin JDK 25 x64**.
2. Open a new Command Prompt.
3. Verify:

```bat
java -version
```

It must report Java 25.
4. From the project root run:

```bat
bengaluru\run-bengaluru.cmd
```

The first run rebuilds the OTP graph from both transit feeds and then starts the server.

Open:

```text
http://localhost:8080
```

## Rebuild the metro feed

If `metro-network-source.csv` is changed:

```bat
python bengaluru\build-metro-gtfs.py
python bengaluru\validate-integrated.py
```

Then rerun `bengaluru\run-bengaluru.cmd`.

## Source / accuracy note

The Metro feed in this package is a planning-oriented GTFS generated from the public Bengaluru metro network/station dataset used for this integration. Station coordinates and line connectivity are included; timetable times are generated at a regular 10-minute planning interval rather than claimed as official train-by-train timings. For exact operational timetable accuracy, replace the Metro GTFS with an official/current BMRCL feed if one is provided.
