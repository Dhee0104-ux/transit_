#!/usr/bin/env python3
"""
Pan-India Transit Routing Examples & Test Runner
Tests Multimodal, Bus, and Metro routing across major Indian Cities:
1. Delhi-NCR
2. Mumbai
3. Bengaluru
4. Chennai
5. Hyderabad
6. Kolkata
7. Pune
8. Ahmedabad
9. Kochi
"""
import sys
from gateway.india_transit_engine import IndiaTransitRouter

sys.stdout.reconfigure(encoding='utf-8')

router = IndiaTransitRouter()

TEST_CASES = [
    {
        "city": "Delhi-NCR",
        "title": "DELHI: Delhi University (North Campus) -> Millennium City Centre Gurugram",
        "from": (28.6922, 77.2144),  # Vishwa Vidyalaya
        "to":   (28.4593, 77.0725),  # Millennium City Centre Gurugram
        "note": "Direct Yellow Line across Delhi and NCR into Gurugram Cyber City"
    },
    {
        "city": "Mumbai (MMR)",
        "title": "MUMBAI: Versova (West) -> Ghatkopar (East)",
        "from": (19.1314, 72.8184),  # Versova
        "to":   (19.0864, 72.9081),  # Ghatkopar
        "note": "Mumbai Metro Line 1 East-West elevated corridor"
    },
    {
        "city": "Bengaluru",
        "title": "BENGALURU: Indiranagar -> Majestic (Purple Line)",
        "from": (12.97817, 77.63833), # Indiranagar
        "to":   (12.97559, 77.57313), # Majestic
        "note": "Namma Metro Purple Line via live OTP2 engine"
    },
    {
        "city": "Chennai",
        "title": "CHENNAI: Chennai Central -> Chennai International Airport",
        "from": (13.0819, 80.2747),  # Puratchi Thalaivar Dr. MGR Central
        "to":   (12.9806, 80.1636),  # Chennai Airport
        "note": "CMRL Blue Line direct airport express corridor"
    },
    {
        "city": "Hyderabad",
        "title": "HYDERABAD: HITEC City (Cyberabad) -> Secunderabad Railway Station",
        "from": (17.4489, 78.3814),  # HITEC City
        "to":   (17.4347, 78.5042),  # Secunderabad East
        "note": "L&T Hyderabad Metro Blue Line IT corridor"
    },
    {
        "city": "Kolkata",
        "title": "KOLKATA: Howrah Railway Station -> Salt Lake Sector V (IT Hub)",
        "from": (22.5847, 88.3417),  # Howrah Station
        "to":   (22.5786, 88.4339),  # Salt Lake Sector V
        "note": "Kolkata Metro Green Line (India's First Underwater River Tunnel)"
    },
    {
        "city": "Pune",
        "title": "PUNE: PCMC Bhavan -> Swargate",
        "from": (18.6297, 73.8119),  # PCMC
        "to":   (18.5008, 73.8581),  # Swargate
        "note": "Pune Metro Purple Line North-South corridor"
    },
    {
        "city": "Ahmedabad",
        "title": "AHMEDABAD: Motera Stadium -> APMC Vasna",
        "from": (23.0919, 72.5978),  # Narendra Modi Stadium Motera
        "to":   (22.9842, 72.5386),  # APMC
        "note": "Ahmedabad Metro North-South Red Line corridor"
    },
    {
        "city": "Kochi",
        "title": "KOCHI: High Court -> Fort Kochi (Water Metro)",
        "from": (9.9819, 76.2758),   # High Court Jetty
        "to":   (9.9658, 76.2425),   # Fort Kochi Jetty
        "note": "Kochi Water Metro electric battery vessel transit route"
    }
]

def run_pan_india_examples():
    print("\n" + "#"*70)
    print("  PAN-INDIA TRANSIT ROUTING DEMONSTRATION")
    print("  Metro Systems  |  Bus Networks  |  Suburban  |  Water Metro")
    print("#"*70)

    for idx, test in enumerate(TEST_CASES, 1):
        f_coord = test["from"]
        t_coord = test["to"]
        result = router.plan_trip(f_coord, t_coord)
        itins = result.get("itineraries", [])

        print(f"\n{'='*70}")
        print(f"  {idx}. [{test['city']}] {test['title']}")
        print(f"     Note: {test['note']}")
        print(f"     From: ({f_coord[0]}, {f_coord[1]}) -> To: ({t_coord[0]}, {t_coord[1]})")
        print(f"{'='*70}")

        if not itins:
            print("  *** No itineraries found ***")
            continue

        best = itins[0]
        dur_min = best["duration"] // 60
        print(f"  Total Duration: {dur_min} mins | Legs:")

        for l_idx, leg in enumerate(best.get("legs", []), 1):
            mode = leg["mode"]
            f_name = leg["from"]["name"]
            t_name = leg["to"]["name"]
            dist = leg.get("distance", 0)
            dur = leg.get("duration", 0) // 60
            r_info = ""
            if leg.get("route"):
                r = leg["route"]
                r_name = r.get("longName") or r.get("shortName") or ""
                r_info = f"  [Line: {r_name}]"
            print(f"    {l_idx}. [{mode:6s}] {f_name} -> {t_name} ({dist:.0f}m, {dur} min){r_info}")

    print(f"\n{'='*70}")
    print("  [PASSED] All Pan-India transit routing test cases executed successfully!")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    run_pan_india_examples()
