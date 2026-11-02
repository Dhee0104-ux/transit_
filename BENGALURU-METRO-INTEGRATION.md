# Bengaluru Integrated Build — BMTC + Namma Metro

This copy of OpenTripPlanner has been prepared for Bengaluru multimodal routing.

### Included

- Existing BMTC GTFS feed.
- Namma Metro Purple, Green and Yellow GTFS feed.
- Fallback OSM network with Metro walking-access connectors.
- Prebuilt OTP 2.11.0-SNAPSHOT shaded JAR compiled for Java 25.
- Existing OTP frontend/source tree is preserved.

### Run on Windows

```bat
bengaluru\run-bengaluru.cmd
```

Then open `http://localhost:8080`.

### Validate data

```bat
python bengaluru\validate-integrated.py
```

### Recreate the Metro feed

```bat
python bengaluru\build-metro-gtfs.py
python bengaluru\validate-integrated.py
```

See `bengaluru\README.md` and `bengaluru\BUILD-WINDOWS.md` for details.
