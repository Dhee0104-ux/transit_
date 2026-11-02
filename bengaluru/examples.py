import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

OTP_URL = "http://localhost:8080/otp/gtfs/v1"
DATE = "2026-09-16"  # Today - within GTFS window 2026-09-07 to 2027-09-07
TIME = "09:00:00"

def run_plan(title, from_coord, to_coord, modes, note=""):
    mode_str = "[ " + ", ".join([f"{{mode: {m}}}" for m in modes]) + " ]"
    gql = f"""
    {{
      plan(
        from: {{lat: {from_coord[0]}, lon: {from_coord[1]}}}
        to: {{lat: {to_coord[0]}, lon: {to_coord[1]}}}
        date: "{DATE}"
        time: "{TIME}"
        transportModes: {mode_str}
        numItineraries: 3
      ) {{
        itineraries {{
          duration
          legs {{
            mode
            duration
            distance
            from {{ name }}
            to {{ name }}
            route {{ shortName longName }}
          }}
        }}
      }}
    }}
    """
    req = urllib.request.Request(
        OTP_URL,
        data=json.dumps({'query': gql}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"  ERROR contacting OTP: {e}")
        return
    errors = data.get('errors')
    if errors:
        print(f"  GraphQL Errors: {errors}")
        return
    itins = data.get('data', {}).get('plan', {}).get('itineraries', [])
    print(f"\n{'='*62}")
    print(f"  {title}")
    if note:
        print(f"  ({note})")
    print(f"  From: ({from_coord[0]}, {from_coord[1]})")
    print(f"  To:   ({to_coord[0]}, {to_coord[1]})")
    print(f"  Date: {DATE}  Time: {TIME}")
    print(f"{'='*62}")
    if not itins:
        print("  *** No itineraries found. ***")
        return
    # pick best (shortest duration)
    best = min(itins, key=lambda x: x['duration'])
    print(f"  Best Route: {best['duration']//60} mins total | Legs:")
    for idx, leg in enumerate(best.get('legs', []), 1):
        mode = leg['mode']
        f_name = leg['from']['name']
        t_name = leg['to']['name']
        dist = leg['distance']
        dur = leg['duration'] // 60
        r_info = ""
        if leg.get('route'):
            r = leg['route']
            name = r.get('longName') or r.get('shortName') or ''
            r_info = f"  [Route: {name}]"
        print(f"    {idx}. [{mode:6s}] {f_name} -> {t_name} ({dist:.0f}m, {dur} min){r_info}")

if __name__ == "__main__":
    print("\n" + "#"*62)
    print("  BENGALURU TRANSIT ROUTING — OTP2 Examples")
    print("  BMTC Bus  |  Namma Metro  |  Walk  |  Multimodal")
    print("#"*62)

    # 1. Walk only: MG Road area -> Brigade Road (short walk)
    run_plan(
        "1. WALK ONLY: MG Road -> Brigade Road",
        (12.97566, 77.60676),
        (12.97290, 77.60750),
        ["WALK"],
        note="Short walk in central Bengaluru"
    )

    # 2. Bus (BMTC): Kempegowda Bus Station (Majestic) -> Shivajinagar
    #    Two major BMTC hubs, well-served by many routes
    run_plan(
        "2. BUS (BMTC): Majestic Bus Stand -> Shivajinagar",
        (12.97765, 77.57117),   # Kempegowda Bus Station
        (12.98396, 77.60323),   # Shivajinagar Bus Station
        ["TRANSIT", "WALK"],
        note="BMTC bus from Majestic to Shivajinagar"
    )

    # 3. Metro only: Indiranagar -> Majestic (direct Purple Line)
    run_plan(
        "3. METRO: Indiranagar -> Majestic (Purple Line)",
        (12.97817, 77.63833),   # Indiranagar Metro
        (12.97559, 77.57313),   # Nadaprabhu Kempegowda (Majestic) Metro
        ["TRANSIT", "WALK"],
        note="Namma Metro Purple Line direct"
    )

    # 4. Multimodal: Lalbagh -> Indiranagar (walk + metro)
    run_plan(
        "4. MULTIMODAL (Walk+Metro): Lalbagh -> Indiranagar",
        (12.94625, 77.57978),   # Lalbagh Botanical Garden
        (12.97817, 77.63833),   # Indiranagar Metro
        ["TRANSIT", "WALK"],
        note="Walk to station then metro"
    )

    # 5. Metro Interchange: Jayanagar -> Indiranagar (Green -> Purple via Majestic)
    run_plan(
        "5. METRO INTERCHANGE: Jayanagar -> Indiranagar (Green->Purple)",
        (12.93844, 77.57998),   # Near Jayanagar Metro
        (12.97817, 77.63833),   # Indiranagar Metro
        ["TRANSIT", "WALK"],
        note="Interchange at Majestic: Green Line -> Purple Line"
    )

    print(f"\n{'='*62}")
    print("  OTP2 server live at: http://localhost:8080")
    print("  GraphQL API: http://localhost:8080/otp/gtfs/v1")
    print(f"{'='*62}\n")
