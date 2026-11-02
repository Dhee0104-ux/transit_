#!/usr/bin/env python3
"""
Generate the BMRCL Namma Metro GTFS used by this integrated OTP package.
Extracts real OpenStreetMap subway railway track geometry to produce accurate,
smooth curves that follow elevated viaducts and road corridors (such as Chord Road)
instead of straight chords between stations.
"""
import urllib.request, urllib.parse, json, csv, math, os, zipfile, sys, heapq
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

HERE = Path(__file__).resolve().parent
SRC = HERE / "metro-network-source.csv"
OUT = HERE / "bmrcl-namma-metro-gtfs.zip"

print("=== 1. Loading metro-network-source.csv and OSM railway tracks ===")
existing_rows = list(csv.DictReader(SRC.open(encoding="utf-8")))

lines = {}
for r in existing_rows:
    lines.setdefault(r["line"], []).append(r)
for v in lines.values():
    v.sort(key=lambda x: int(x["sequence"]))

# Cache or fetch OSM subway ways
osm_cache = HERE / ".metro-osm-ways-cache.json"
if osm_cache.exists():
    with open(osm_cache, encoding="utf-8") as f:
        all_ways = json.load(f)
else:
    print("Fetching OSM subway ways from Overpass...")
    q = """[out:json][timeout:60];
    (
      way["railway"="subway"](12.80,77.40,13.15,77.80);
      way["railway"="construction"]["construction"="subway"](12.80,77.40,13.15,77.80);
      way["name"~"Namma Metro"](12.80,77.40,13.15,77.80);
      way["operator"="BMRCL"](12.80,77.40,13.15,77.80);
    );
    out geom;
    """
    data = urllib.parse.urlencode({'data': q}).encode('utf-8')
    req = urllib.request.Request('https://overpass-api.de/api/interpreter', data=data, headers={'User-Agent': 'BengaluruOTP/1.0'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        all_ways = res.get("elements", [])
    with open(osm_cache, "w", encoding="utf-8") as f:
        json.dump(all_ways, f)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0 # meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1-a))

def round_pt(pt):
    return (round(pt["lat"], 6), round(pt["lon"], 6))

# Build track graph
print("=== 2. Building connected railway track graph ===")
adj = {}
all_pts = []

for w in all_ways:
    geom = w.get("geometry", [])
    if len(geom) < 2:
        continue
    for p in geom:
        all_pts.append(round_pt(p))
    for i in range(len(geom) - 1):
        p1 = round_pt(geom[i])
        p2 = round_pt(geom[i+1])
        d = haversine(p1[0], p1[1], p2[0], p2[1])
        adj.setdefault(p1, []).append((p2, d))
        adj.setdefault(p2, []).append((p1, d))

# Bridge micro-gaps
grid = {}
for p in set(all_pts):
    gx, gy = int(p[0] * 1000), int(p[1] * 1000)
    grid.setdefault((gx, gy), []).append(p)

for p1 in set(all_pts):
    gx, gy = int(p1[0] * 1000), int(p1[1] * 1000)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for p2 in grid.get((gx+dx, gy+dy), []):
                if p1 != p2:
                    d = haversine(p1[0], p1[1], p2[0], p2[1])
                    if d <= 120:
                        adj.setdefault(p1, []).append((p2, d))

def find_nearest_node(lat, lon, max_dist=500):
    best_node = None
    best_d = float('inf')
    for node in adj:
        d = haversine(lat, lon, node[0], node[1])
        if d < best_d:
            best_d = d
            best_node = node
    if best_d <= max_dist:
        return best_node, best_d
    return None, best_d

def shortest_path(start_node, end_node):
    if start_node == end_node:
        return [start_node]
    dist = {start_node: 0.0}
    prev = {}
    pq = [(0.0, start_node)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float('inf')):
            continue
        if u == end_node:
            break
        for v, w in adj.get(u, []):
            if d + w < dist.get(v, float('inf')):
                dist[v] = d + w
                prev[v] = u
                heapq.heappush(pq, (d + w, v))
    if end_node not in prev and start_node != end_node:
        return None
    path = []
    curr = end_node
    while curr:
        path.append(curr)
        curr = prev.get(curr)
    path.reverse()
    return path

def build_line_geometry(stns):
    pts = [(float(stns[0]["latitude"]), float(stns[0]["longitude"]))]
    for i in range(len(stns) - 1):
        s1, s2 = stns[i], stns[i+1]
        lat1, lon1 = float(s1["latitude"]), float(s1["longitude"])
        lat2, lon2 = float(s2["latitude"]), float(s2["longitude"])
        n1, _ = find_nearest_node(lat1, lon1)
        n2, _ = find_nearest_node(lat2, lon2)
        path = shortest_path(n1, n2) if (n1 and n2) else None
        if path and len(path) >= 2:
            for p in path[1:]:
                if pts[-1] != p:
                    pts.append(p)
        else:
            pts.append((lat2, lon2))
        stn_pt = (lat2, lon2)
        if pts[-1] != stn_pt:
            pts.append(stn_pt)
    return pts

print("=== 3. Generating GTFS feed with curved shapes ===")

meta = {
    "Purple Line": ("PURPLE", "Purple Line", "7E22CE", "Whitefield (Kadugodi) - Challaghatta"),
    "Green Line":  ("GREEN",  "Green Line",  "16A34A", "Madavara - Silk Institute"),
    "Yellow Line": ("YELLOW", "Yellow Line", "CA8A04", "RV Road - Bommasandra"),
}

def hms(seconds):
    s = int(round(seconds))
    return f"{s//3600:02d}:{(s%3600)//60:02d}:{s%60:02d}"

tables = {
    "agency.txt": [
        ["agency_id","agency_name","agency_url","agency_timezone","agency_lang"],
        ["BMRCL","Bangalore Metro Rail Corporation Limited","https://bmrc.co.in/","Asia/Kolkata","en"]
    ],
    "routes.txt": [
        ["route_id","agency_id","route_short_name","route_long_name","route_type","route_color","route_text_color"]
    ],
    "stops.txt": [
        ["stop_id","stop_code","stop_name","stop_lat","stop_lon","location_type","wheelchair_boarding"]
    ],
    "calendar.txt": [
        ["service_id","monday","tuesday","wednesday","thursday","friday","saturday","sunday","start_date","end_date"],
        ["METRO_DAILY","1","1","1","1","1","1","1","20260907","20270907"]
    ],
    "trips.txt": [
        ["route_id","service_id","trip_id","trip_headsign","direction_id","shape_id","bikes_allowed","wheelchair_accessible"]
    ],
    "stop_times.txt": [
        ["trip_id","arrival_time","departure_time","stop_id","stop_sequence","pickup_type","drop_off_type","timepoint"]
    ],
    "shapes.txt": [
        ["shape_id","shape_pt_lat","shape_pt_lon","shape_pt_sequence","shape_dist_traveled"]
    ],
    "feed_info.txt": [
        ["feed_publisher_name","feed_publisher_url","feed_lang","feed_start_date","feed_end_date","feed_version"],
        ["BMRCL","https://bmrc.co.in/","en","20260907","20270907","2026-09-curved"]
    ],
    "transfers.txt": [
        ["from_stop_id","to_stop_id","transfer_type","min_transfer_time"]
    ]
}

for line, (rid, name, color, longn) in meta.items():
    tables["routes.txt"].append([rid, "BMRCL", name, longn, "1", color, "FFFFFF"])

seen_stops = set()
for r in existing_rows:
    code = r["station_code"]
    if code in seen_stops:
        continue
    seen_stops.add(code)
    tables["stops.txt"].append([
        f"METRO_{code}", code, r["station_name"],
        r["latitude"], r["longitude"], "0", "1"
    ])

tables["transfers.txt"].append(["METRO_KGWA", "METRO_KGWA", "2", "120"])
tables["transfers.txt"].append(["METRO_RVR", "METRO_RVR", "2", "120"])

FREQUENCY = 300  # 5 minutes
DWELL = 30       # 30 seconds
SPEED_KMH = 40   # 40 km/h

for line, (rid, _, _, _) in meta.items():
    if line not in lines:
        continue
    ordered_stns = lines[line]
    forward_geom = build_line_geometry(ordered_stns)
    backward_geom = list(reversed(forward_geom))

    for direction, (seq, geom) in enumerate([(ordered_stns, forward_geom), (list(reversed(ordered_stns)), backward_geom)]):
        shape_id = f"{rid}_{direction}"
        cum_dist = 0.0
        for seq_num, pt in enumerate(geom, 1):
            if seq_num > 1:
                prev = geom[seq_num - 2]
                cum_dist += haversine(prev[0], prev[1], pt[0], pt[1]) / 1000.0
            tables["shapes.txt"].append([
                shape_id, f"{pt[0]:.7f}", f"{pt[1]:.7f}", str(seq_num), f"{cum_dist:.4f}"
            ])

        offsets = [0]
        total = 0.0
        for i in range(1, len(seq)):
            seg_km = haversine(float(seq[i-1]["latitude"]), float(seq[i-1]["longitude"]),
                               float(seq[i]["latitude"]), float(seq[i]["longitude"])) / 1000.0
            seg_sec = (seg_km / SPEED_KMH) * 3600
            seg_sec = max(60.0, seg_sec)
            total += seg_sec + DWELL
            offsets.append(round(total))

        n = 0
        for departure in range(5*3600, 23*3600, FREQUENCY):
            trip_id = f"{rid}_{direction}_{n:04d}"
            tables["trips.txt"].append([
                rid, "METRO_DAILY", trip_id,
                seq[-1]["station_name"], str(direction), shape_id, "0", "1"
            ])
            for i, r in enumerate(seq):
                t = departure + offsets[i]
                arr = hms(t)
                dep = hms(t + DWELL) if i < len(seq)-1 else arr
                tables["stop_times.txt"].append([
                    trip_id, arr, dep, f"METRO_{r['station_code']}", str(i+1), "0", "0", "1"
                ])
            n += 1

tmp = HERE / ".metro-gtfs-tmp"
tmp.mkdir(exist_ok=True)
for fn, data in tables.items():
    with (tmp/fn).open("w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(data)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for fn in tables:
        z.write(tmp/fn, fn)
for p in tmp.iterdir():
    p.unlink()
tmp.rmdir()

print(f"\n=== Rebuild Complete ===")
print(f"Saved to: {OUT}")
print(f"Total shape points across all lines: {len(tables['shapes.txt'])-1}")
