import zipfile, csv, os, math
import xml.etree.ElementTree as ET
from scipy.spatial import cKDTree

HERE=os.path.dirname(os.path.abspath(__file__))
GTFS=os.path.join(HERE,'bmtc-bengaluru-gtfs.zip')
METRO=os.path.join(HERE,'bmrcl-namma-metro-gtfs.zip')
OUT=os.path.join(HERE,'bengaluru-transit-shape-network.osm')

def gtfs_stops(path):
    out=[]
    with zipfile.ZipFile(path) as z:
        with z.open('stops.txt') as f:
            for r in csv.DictReader(line.decode('utf-8-sig') for line in f):
                out.append((r['stop_id'],r.get('stop_name',r['stop_id']),float(r['stop_lat']),float(r['stop_lon'])))
    return out

def gtfs_shapes(path):
    shapes={}
    with zipfile.ZipFile(path) as z:
        with z.open('shapes.txt') as f:
            for r in csv.DictReader(line.decode('utf-8-sig') for line in f):
                shapes.setdefault(r['shape_id'],[]).append((float(r['shape_pt_lat']),float(r['shape_pt_lon']),int(r['shape_pt_sequence'])))
    for v in shapes.values(): v.sort(key=lambda x:x[2])
    return shapes

# Keep the original BMTC topology and add metro station access connectors.
stops=gtfs_stops(GTFS)
shapes=gtfs_shapes(GTFS)

coord_to_node={}
nodes={}
nid=1000000
def node(lat,lon):
    global nid
    key=(round(lat,5),round(lon,5))
    if key not in coord_to_node:
        coord_to_node[key]=nid
        nodes[nid]=(lat,lon)
        nid+=1
    return coord_to_node[key]

ways=[]
wid=2000000
for sid,pts in shapes.items():
    nds=[]; last=None
    for lat,lon,_ in pts:
        n=node(lat,lon)
        if n!=last: nds.append(n); last=n
    for start in range(0,len(nds),179):
        chunk=nds[start:start+180]
        if len(chunk)>=2:
            ways.append((wid,chunk,f"BMTC Corridor {sid}")); wid+=1

for _,_,lat,lon in stops: node(lat,lon)

# Metro station connectors to nearest BMTC shape-network node.
metro=gtfs_stops(METRO)
base_ids=list(nodes.keys())
base_coords=[nodes[i] for i in base_ids]
lat0=sum(x[0] for x in base_coords)/len(base_coords)
xy=[(lon*math.cos(math.radians(lat0)),lat) for lat,lon in base_coords]
tree=cKDTree(xy)
for stop_id,name,lat,lon in metro:
    station=node(lat,lon)
    _,idx=tree.query([lon*math.cos(math.radians(lat0)),lat])
    nearest=base_ids[int(idx)]
    ways.append((wid,[station,nearest],f"Metro access - {name}")); wid+=1

with open(OUT,'w',encoding='utf-8',buffering=1024*1024) as out:
    out.write('<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="Bengaluru Integrated Transit Network Refiner">\n')
    for n,(lat,lon) in nodes.items():
        out.write(f'  <node id="{n}" lat="{lat:.7f}" lon="{lon:.7f}"/>\n')
    for w,nds,name in ways:
        out.write(f'  <way id="{w}">\n')
        for n in nds: out.write(f'    <nd ref="{n}"/>\n')
        if name.startswith("Metro access"):
            out.write('    <tag k="highway" v="footway"/>\n<tag k="foot" v="yes"/>\n<tag k="access" v="yes"/>\n')
        else:
            out.write('    <tag k="highway" v="tertiary"/>\n<tag k="foot" v="yes"/>\n<tag k="bicycle" v="yes"/>\n<tag k="motor_vehicle" v="yes"/>\n<tag k="oneway" v="no"/>\n')
        out.write(f'    <tag k="name" v="{name.replace("&","&amp;").replace("\"","&quot;")}"/>\n')
        out.write('  </way>\n')
    out.write('</osm>\n')
print(f"Generated {OUT} with BMTC network + {len(metro)} metro station access connectors.")
