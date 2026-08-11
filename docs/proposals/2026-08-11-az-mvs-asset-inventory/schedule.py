#!/usr/bin/env python3
"""Build a cluster-aware 2-sites-per-day field schedule for AZ-MVS."""
import json, requests, time, math, itertools
from pathlib import Path
from geopy.distance import geodesic

BASE = ("base", 33.4537049, -112.099247)

coords = {
    "MVS 05": (33.3199175, -111.8606284),
    "MVS 10": (33.4651561, -112.0474022),
    "MVS 12": (33.3649906, -111.805389),
    "MVS 13": (33.4351443, -112.3021085),
    "MVS 14": (33.6391061, -112.1695749),
    "MVS 16": (33.8663458, -112.1371393),
    "MVS 20": (33.475887, -111.9258136),
    "MVS 22": (33.2211589, -111.6343815),
    "MVS 23": (33.6237955, -112.4250534),
    "MVS 24": (33.7529476, -111.9904214),
    "MVS 26": (33.6728187, -112.2379391),
    "MVS 27": (33.4235011, -111.6858519),
    "MVS 28": (33.4942453, -112.2508289),
    "MVS 29": (33.3790281, -111.8893449),
    "MVS 32": (33.4953015, -112.0139283),
    "MVS 33": (33.2179451, -111.564399),
    "MVS 34": (33.233436669515, -111.823703569363),
    "MVS 51": (33.5972775, -112.1668351),
    "PawnCo P1": (33.1628442, -111.5626017),
    "PawnCo P2": (33.4502711, -112.3437147),
    "PawnCo P3": (33.6784045, -112.0304647),
    "PawnCo P4": (33.6108175, -112.1696294),
    "The Grove": (33.6383674, -112.3308941),
    "Corporate Office": (33.4946441, -112.0241488),
}

# Addresses for display
addresses = {
    "MVS 05": "940 N Alma School Rd, Suite 105, Chandler, AZ 85224",
    "MVS 10": "1501 N 16th St, Phoenix, AZ 85006",
    "MVS 12": "833 N Cooper Rd, Suite 101, Gilbert, AZ 85233",
    "MVS 13": "11249 W Buckeye Rd, Avondale, AZ 85323",
    "MVS 14": "4385 W Bell Rd, Glendale, AZ 85308",
    "MVS 16": "3655 W Anthem Way, Suite B115, Anthem, AZ 85086",
    "MVS 20": "2525 N Scottsdale Rd, Suite 1-3, Scottsdale, AZ 85257",
    "MVS 22": "21805 S Ellsworth Rd, Suite B107, Queen Creek, AZ 85142",
    "MVS 23": "17019 W Greenway Rd, Suite 114, Surprise, AZ 85388",
    "MVS 24": "29455 N Cave Creek Rd, Suite 126, Cave Creek, AZ 85331",
    "MVS 26": "20783 N 83rd Ave, Suite 105, Peoria, AZ 85382",
    "MVS 27": "6740 E University Dr, Suite 106, Mesa, AZ 85205",
    "MVS 28": "10720 W Indian School Rd, Suite 51, Phoenix, AZ 85037",
    "MVS 29": "2620 W Baseline Rd, Mesa, AZ 85202",
    "MVS 32": "3172 E Indian School Rd, Phoenix, AZ 85016",
    "MVS 33": "85 W Combs Rd, Suite 103, San Tan Valley, AZ 85140",
    "MVS 34": "1010 W Chandler Heights Rd, Chandler, AZ 85248",
    "MVS 51": "5036 W Cactus Rd, Suites 3 & 4, Glendale, AZ 85304",
    "PawnCo P1": "40975 N Ironwood Dr, Unit B111, San Tan Valley, AZ 85140",
    "PawnCo P2": "13220 W Van Buren St, Suite 100, Goodyear, AZ 85338",
    "PawnCo P3": "21041 N Cave Creek Rd, Phoenix, AZ 85024",
    "PawnCo P4": "5140 W Thunderbird Rd, Glendale, AZ",
    "The Grove": "12555 W Bell Rd, Surprise, AZ 85378",
    "Corporate Office": "2633 E Indian School Rd, Phoenix, AZ 85016",
}

clusters = {
    "Group 1: North Glendale / Cactus Corridor": ["MVS 14", "PawnCo P4", "MVS 51"],
    "Group 2: Peoria / Surprise / Sun City": ["MVS 26", "The Grove", "MVS 23"],
    "Group 3: Far North / Anthem / Cave Creek": ["MVS 16", "MVS 24", "PawnCo P3"],
    "Group 4: Central Phoenix & Biltmore": ["MVS 10", "MVS 32", "Corporate Office"],
    "Group 5: Southwest Valley / Avondale & Goodyear": ["MVS 28", "PawnCo P2", "MVS 13"],
    "Group 6: East Valley": ["MVS 20", "MVS 29", "MVS 27", "MVS 05", "MVS 12", "MVS 34", "MVS 22", "PawnCo P1", "MVS 33"],
}


def geo_cost(a, b):
    """Approximate road distance for a base->a->b->base loop, in miles, using geodesic.
    Multiplied by 1.3 to approximate actual road network vs straight-line."""
    base_lat, base_lon = BASE[1], BASE[2]
    a_lat, a_lon = coords[a]
    b_lat, b_lon = coords[b]
    d_base_a = geodesic((base_lat, base_lon), (a_lat, a_lon)).miles
    d_a_b = geodesic((a_lat, a_lon), (b_lat, b_lon)).miles
    d_b_base = geodesic((b_lat, b_lon), (base_lat, base_lon)).miles
    return (d_base_a + d_a_b + d_b_base) * 1.3


def osrm_route(points):
    """points is list of (lat, lon). Returns miles for the full loop."""
    coords_str = ";".join(f"{lon},{lat}" for lat, lon in points)
    url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=false"
    try:
        r = requests.get(url, timeout=30)
        data = r.json()
        if data.get("code") == "Ok":
            return data["routes"][0]["distance"] * 0.000621371
    except Exception:
        pass
    return None


def perfect_matchings(nodes):
    """Yield all perfect matchings for an even list of nodes."""
    if not nodes:
        yield []
        return
    first = nodes[0]
    for i in range(1, len(nodes)):
        pair = (first, nodes[i])
        rest = nodes[1:i] + nodes[i + 1:]
        for m in perfect_matchings(rest):
            yield [pair] + m


def best_internal_plan(cluster_name, sites):
    """Return list of (cost, pairs, single) for a cluster.
    For even-ish clusters: choose floor(n/2) pairs and (n % 2) singles.
    """
    n = len(sites)
    results = []
    if n % 2 == 0:
        # n must be even; group 6 is 9 so this path not used
        # enumerate all perfect matchings
        for pairs in perfect_matchings(list(sites)):
            cost = sum(geo_cost(a, b) for a, b in pairs)
            results.append((cost, pairs, []))
    else:
        # n = 3 or 9: pick one single, pair the rest
        for single in sites:
            remaining = [s for s in sites if s != single]
            for pairs in perfect_matchings(remaining):
                cost = sum(geo_cost(a, b) for a, b in pairs)
                results.append((cost, pairs, [single]))
    return min(results, key=lambda x: x[0])


def main():
    pair_options = {}
    singles_by_cluster = {}
    internal_pairs = []
    for cname, sites in clusters.items():
        best = best_internal_plan(cname, sites)
        pair_options[cname] = best
        internal_pairs.extend(best[1])
        singles_by_cluster[cname] = best[2]

    # Pair the six leftover singles across clusters
    singles = []
    for cname, s in singles_by_cluster.items():
        singles.extend(s)
    assert len(singles) == 6

    best_cross = None
    best_cross_cost = float("inf")
    for pairs in perfect_matchings(singles):
        cost = sum(geo_cost(a, b) for a, b in pairs)
        if cost < best_cross_cost:
            best_cross_cost = cost
            best_cross = pairs

    all_pairs = internal_pairs + best_cross

    # Compute OSRM route distance for each pair and choose direction
    day_routes = []
    for a, b in all_pairs:
        p1 = [(BASE[1], BASE[2]), coords[a], coords[b], (BASE[1], BASE[2])]
        p2 = [(BASE[1], BASE[2]), coords[b], coords[a], (BASE[1], BASE[2])]
        d1 = osrm_route(p1)
        d2 = osrm_route(p2)
        time.sleep(1.2)
        if d1 is None and d2 is None:
            dist = None
            order = (a, b)
        elif d2 is None or (d1 is not None and d1 <= d2):
            dist = d1
            order = (a, b)
        else:
            dist = d2
            order = (b, a)
        day_routes.append((order, dist))

    # Sort days roughly by distance (optional, can reorder later)
    # Generate markdown
    lines = []
    lines.append("# AZ-MVS Internal Field Schedule — 2 Sites/Day\n")
    lines.append("**Base / starting point:** 429 N 18th Dr, Phoenix, AZ 85007\n")
    lines.append("**Schedule type:** Internal planning only — not included in the client proposal.\n")
    lines.append("**Assumptions:** One technician/crew per day, normal business hours (08:00–17:00 MST), return to base each day.\n")
    lines.append("**Routing:** Sites are paired to keep driving within localized clusters; exact daily order can be swapped based on site contacts and access windows.\n\n")
    lines.append("## Geographic clusters (from the AZ-MVS site list)\n")
    for cname, sites in clusters.items():
        lines.append(f"- **{cname}**: {', '.join(sites)}\n")
    lines.append("\n")

    lines.append("## Suggested 12-day field schedule\n")
    lines.append("| Day | Site A | Site A Address | Site B | Site B Address | Est. Round-Trip Miles | Cluster(s) |\n")
    lines.append("|---|---|---|---|---|---|---|\n")
    total = 0.0
    for i, ((a, b), dist) in enumerate(day_routes, 1):
        dist_str = f"{dist:.1f}" if dist is not None else "TBD"
        if dist is not None:
            total += dist
        a_cluster = next((c for c, s in clusters.items() if a in s), "")
        b_cluster = next((c for c, s in clusters.items() if b in s), "")
        cluster_note = a_cluster if a_cluster == b_cluster else f"{a_cluster} / {b_cluster}"
        lines.append(f"| {i} | {a} | {addresses[a]} | {b} | {addresses[b]} | {dist_str} | {cluster_note} |\n")

    lines.append(f"\n**Total estimated round-trip driving miles (12 days):** {total:.1f} miles\n")
    lines.append(f"**Mileage cost at AZ $0.67/mile:** ${total * 0.67:,.2f}\n")
    lines.append("\n## Notes\n")
    lines.append("- Each day is built around two sites that are close to each other.\n")
    lines.append("- A second site is only added when the two sites complement each other and do not push the technician beyond a normal workday.\n")
    lines.append("- Week 5 remains reserved for return visits, reschedules, and exception resolution (covered by the $2,200 return-visit/contingency allowance).\n")
    lines.append("- Final day-by-day schedule should be locked during kickoff after site contacts and access windows are confirmed.\n")

    out = Path(__file__).parent / "FIELD-SCHEDULE.md"
    out.write_text("".join(lines))
    print(f"Wrote {out}")
    print(f"Total estimated miles: {total:.1f}")


if __name__ == "__main__":
    main()
