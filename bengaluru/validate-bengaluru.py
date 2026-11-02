import csv, os, zipfile, sys
from collections import Counter
HERE=os.path.dirname(os.path.abspath(__file__))
GTFS=os.path.join(HERE,'bmtc-bengaluru-gtfs.zip')
REQ=['agency.txt','stops.txt','routes.txt','trips.txt','stop_times.txt','calendar.txt','shapes.txt']
with zipfile.ZipFile(GTFS) as z:
    names=set(z.namelist())
    missing=[x for x in REQ if x not in names]
    if missing: raise SystemExit('Missing GTFS files: '+', '.join(missing))
    data={}
    for fn in ['agency.txt','stops.txt','routes.txt','trips.txt','stop_times.txt','calendar.txt','shapes.txt']:
        with z.open(fn) as b:
            data[fn]=list(csv.DictReader((line.decode('utf-8-sig') for line in b)))
ag=data['agency.txt']; stops=data['stops.txt']; routes=data['routes.txt']; trips=data['trips.txt']; sts=data['stop_times.txt']; shapes=data['shapes.txt']; cal=data['calendar.txt']
assert len(ag)==1 and ag[0]['agency_timezone']=='Asia/Kolkata'
assert len({r['route_id'] for r in routes})==len(routes)
assert len({t['trip_id'] for t in trips})==len(trips)
assert len({s['stop_id'] for s in stops})==len(stops)
assert not (set(t['route_id'] for t in trips)-set(r['route_id'] for r in routes))
assert not (set(x['trip_id'] for x in sts)-set(t['trip_id'] for t in trips))
assert not (set(x['stop_id'] for x in sts)-set(s['stop_id'] for s in stops))
assert not (set(t['shape_id'] for t in trips)-set(x['shape_id'] for x in shapes))
for x in sts:
    for k in ('arrival_time','departure_time'):
        h,m,s=map(int,x[k].split(':')); assert 0<=m<60 and 0<=s<60 and 0<=h<=47
assert cal[0]['start_date']=='20260907' and cal[0]['end_date']=='20270907'
print('PASS: GTFS structure and references are valid')
print('routes=',len(routes),'trips=',len(trips),'stops=',len(stops),'stop_times=',len(sts),'shapes=',len(set(x['shape_id'] for x in shapes)))
print('one-stop trips=',sum(v<2 for v in Counter(x['trip_id'] for x in sts).values()))
print('service=',cal[0]['start_date'],'to',cal[0]['end_date'])
