import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_metro_subway():
    query = """
    {
      plan(
        from: {lat: 12.97817, lon: 77.63833}
        to: {lat: 12.97559, lon: 77.57313}
        date: "2026-09-10"
        time: "09:00:00"
        transportModes: [{mode: SUBWAY}, {mode: WALK}]
      ) {
        itineraries {
          duration
          legs {
            mode
            duration
            distance
            from { name lat lon }
            to { name lat lon }
            route { shortName longName }
          }
        }
      }
    }
    """
    req = urllib.request.Request(
        'http://localhost:8080/otp/gtfs/v1',
        data=json.dumps({'query': query}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(json.dumps(data, indent=2))

if __name__ == "__main__":
    test_metro_subway()
