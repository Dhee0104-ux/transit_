#!/usr/bin/env python3
import csv, os, zipfile
from collections import Counter
HERE=os.path.dirname(os.path.abspath(__file__))

def rows(z, fn):
    with z.open(fn) as b:
        text=(line.decode('utf-8-sig') for line in b)
        yield from csv.DictReader(text)

def validate(path):
    required=['agency.txt','stops.txt','routes.txt','trips.txt','stop_times.txt','calendar.txt','shapes.txt']
    with zipfile.ZipFile(path) as z:
        missing=[x for x in required if x not in z.namelist()]
        if missing: raise SystemExit(f"{os.path.basename(path)} missing: {missing}")

        route_ids=set(); trip_ids=set(); stop_ids=set(); shape_ids=set()
        for r in rows(z,'routes.txt'):
            rid=r['route_id']
            if rid in route_ids: raise SystemExit(f"{path}: duplicate route_id {rid}")
            route_ids.add(rid)
        for s in rows(z,'stops.txt'):
            sid=s['stop_id']
            if sid in stop_ids: raise SystemExit(f"{path}: duplicate stop_id {sid}")
            stop_ids.add(sid)
        for s in rows(z,'shapes.txt'):
            shape_ids.add(s['shape_id'])
        trip_count=0
        for t in rows(z,'trips.txt'):
            tid=t['trip_id']
            if tid in trip_ids: raise SystemExit(f"{path}: duplicate trip_id {tid}")
            if t['route_id'] not in route_ids: raise SystemExit(f"{path}: bad route ref {t['route_id']}")
            if t['shape_id'] not in shape_ids: raise SystemExit(f"{path}: bad shape ref {t['shape_id']}")
            trip_ids.add(tid); trip_count+=1

        stop_time_count=0; per_trip=Counter()
        for x in rows(z,'stop_times.txt'):
            if x['trip_id'] not in trip_ids: raise SystemExit(f"{path}: bad trip ref {x['trip_id']}")
            if x['stop_id'] not in stop_ids: raise SystemExit(f"{path}: bad stop ref {x['stop_id']}")
            per_trip[x['trip_id']]+=1; stop_time_count+=1
            for k in ('arrival_time','departure_time'):
                h,m,s=map(int,x[k].split(':'))
                if not (0<=m<60 and 0<=s<60 and 0<=h<=47):
                    raise SystemExit(f"{path}: invalid time {x[k]}")
        cal=list(rows(z,'calendar.txt'))
        if not cal or cal[0]['start_date']!='20260907' or cal[0]['end_date']!='20270907':
            raise SystemExit(f"{path}: unexpected service calendar")
        print(f"PASS {os.path.basename(path)}: routes={len(route_ids)} stops={len(stop_ids)} trips={trip_count} stop_times={stop_time_count} shapes={len(shape_ids)}")

validate(os.path.join(HERE,'bmtc-bengaluru-gtfs.zip'))
validate(os.path.join(HERE,'bmrcl-namma-metro-gtfs.zip'))
print("PASS: both transit feeds are structurally consistent and use the same service window.")
