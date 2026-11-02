import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

test_pairs = [
    ("Koramangala Sony World Signal -> Vijayanagar Metro", (12.9352, 77.6245), (12.9709, 77.5372)),
    ("Domlur Flyover -> Rajajinagar Metro", (12.9609, 77.6387), (13.0003, 77.5497)),
    ("BTM 2nd Stage -> Yeshwanthpur Metro", (12.9165, 77.6101), (13.0232, 77.5497)),
    ("Lalbagh West Gate -> Indiranagar Metro", (12.94625, 77.57978), (12.97817, 77.63833)),
    ("Koramangala 5th Block -> Majestic Bus & Metro Hub", (12.9350, 77.6200), (12.97559, 77.57313)),
    ("Marathahalli Bridge -> Cubbon Park Metro", (12.9560, 77.7010), (12.98097, 77.59731))
]

for title, origin, dest in test_pairs:
    gql = f"""
    {{
      plan(
        from: {{lat: {origin[0]}, lon: {origin[1]}}}
        to: {{lat: {dest[0]}, lon: {dest[1]}}}
        date: "2026-09-10"
        time: "09:00:00"
        transportModes: [{{mode: TRANSIT}}, {{mode: WALK}}]
      ) {{
        itineraries {{
          duration
          startTime
          endTime
          legs {{
            mode
            duration
            distance
            from {{ name lat lon }}
            to {{ name lat lon }}
            route {{ shortName longName mode }}
          }}
        }}
      }}
    }}
    """
    req = urllib.request.Request(
        'http://localhost:8080/otp/gtfs/v1',
        data=json.dumps({'query': gql}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        itins = data.get('data', {}).get('plan', {}).get('itineraries', [])
        for i, itin in enumerate(itins):
            modes = [l['mode'] for l in itin['legs']]
            if 'BUS' in modes and 'SUBWAY' in modes and 'WALK' in modes:
                print(f"================================================================")
                print(f"🎯 FOUND COMPLETE MULTIMODAL TRIP (WALK + BUS + METRO):")
                print(f"Route: {title}")
                print(f"Origin Coordinates: ({origin[0]}, {origin[1]})")
                print(f"Destination Coordinates: ({dest[0]}, {dest[1]})")
                print(f"Total Trip Duration: {itin['duration']//60} mins")
                print(f"================================================================")
                for idx, l in enumerate(itin['legs']):
                    r = l.get('route')
                    rname = f" [Route: {r.get('longName') or r.get('shortName')}]" if r else ""
                    print(f"  Step {idx+1}: [{l['mode']:6s}] {l['from']['name']} -> {l['to']['name']} ({l['distance']:.0f}m, {l['duration']//60} mins){rname}")
                print()
