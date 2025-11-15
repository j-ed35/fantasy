"""
Scrape weekly running back data from https://data.fantasypoints.com/nfl/tools/player/rushing-basic
We then calculate Weighted Opportunities (WO) using the exact formula from the site.
(1.35*in20Attempts) + (2.29*in20Targets) + (0.49*non20Attempts) + (1.48*non20Targets)


"""

import os, csv, requests

OUT_DIR = "/Users/jacobederer/Repositories/fantasy/data/running_backs"
SEASON = 2025
WEEKS = list(range(1, 8))

URL_RUSH = "https://data.fantasypoints.com/v2/ds/nfl/tools/player/rushing-basic/values"
URL_RECV = (
    "https://data.fantasypoints.com/v2/ds/nfl/tools/player/receiving-basic/values"
)

HEADERS = {
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
    "Origin": "https://fantasypointsdata.com",
    "Referer": "https://fantasypointsdata.com/",
    "User-Agent": "Mozilla/5.0",
}


def payload_for_week(week: int):
    return {
        "context": {
            "tableProperty": "rushingBasic",
            "grouping": "$player.playerId",
            "dualContext": False,
            "modelContext": "player",
            "routeContext": "player",
            "routeContextTarget": "player",
            "weeks": {"REG": [week]},
            "filterMatch": {
                "isGamePlayed": {"eq": True},
                "game.season": {"eq": SEASON},
                "player.position": {"in": ["RB", "FB"]},
            },
            "filterPlay": {
                "teamRoles": {"in": ["offense", {"$ifNull": ["$$play.team.roles", []]}]}
            },
            "filterResult": {
                "playerStats.gamesPlayed": {"gte": 1},
                "playerStats.rushing.attempts.total": {"gte": 1},
            },
            "qualifiers": {},
            "splits": {},
            "disabled": {"filterMatch": {}, "filterPlay": {}, "filterResult": {}},
            "requiresSchedule": None,
            "requiresCharting": False,
            "requiresPlayByPlay": False,
            "requiresPreTotals": False,
            "requiresPostTotals": False,
            "requiresMultiplePipelines": False,
            "requiredRoles": ["role_anonymous"],
            "isFreePreview": False,
            "useCache": True,
            "flatten": True,
            "debug": False,
        }
    }


def post_json(url, payload):
    r = requests.post(url, headers=HEADERS, json=payload, timeout=30)
    ct = (r.headers.get("content-type") or "").lower()
    if r.status_code != 200 or "application/json" not in ct:
        raise RuntimeError(f"Bad response {r.status_code} {ct}: {r.text[:300]}")
    return r.json()


def get_in(d, path, default=0):
    cur = d
    for p in path.split("."):
        if not isinstance(cur, dict) or p not in cur:
            return default
        cur = cur[p]
    return cur


def weighted_opportunities_fp(row):
    g = lambda p: get_in(row, p, 0)
    in20_att = g("playerStats.inside20.rushing.attempts.total")
    in20_tgt = g("playerStats.inside20.receiving.targets.total")
    att = g("playerStats.rushing.attempts.total")
    tgt = g("playerStats.receiving.targets.total")
    non20_att = att - in20_att
    non20_tgt = tgt - in20_tgt
    wo = 1.35 * in20_att + 2.29 * in20_tgt + 0.49 * non20_att + 1.48 * non20_tgt
    return round(wo, 1)


def run_week(week: int):
    payload = payload_for_week(week)

    rush = post_json(URL_RUSH, payload)
    recv = post_json(URL_RECV, payload)

    rush_rows = rush.get("content", {}).get("rows", {}).get("values", [])
    recv_rows = recv.get("content", {}).get("rows", {}).get("values", [])

    # receiving index per player
    recv_by_pid = {get_in(r, "player.playerId", None): r for r in recv_rows}

    out_rows = []
    for rr in rush_rows:
        pid = get_in(rr, "player.playerId", None)
        rcv = recv_by_pid.get(pid, {})

        # core ids/meta
        season = get_in(rr, "game.season")
        opp = get_in(rr, "opponent.abbreviation")
        row_out = {
            "season": season,
            "week": get_in(rr, "game.week"),
            "playerId": pid,
            "player": f"{get_in(rr, 'player.firstName', '')} {get_in(rr, 'player.lastName', '')}".strip(),
            "team": get_in(rr, "team.abbreviation"),
            "opponent": opp,
        }

        # rushing stats
        row_out["attempts"] = get_in(rr, "playerStats.rushing.attempts.total", 0)
        row_out["rushYds"] = get_in(rr, "playerStats.rushing.yards.total", 0)
        row_out["rushTD"] = get_in(rr, "playerStats.rushing.touchdowns.total", 0)

        # receiving stats (from receiving table)
        row_out["catches"] = get_in(rcv, "playerStats.receiving.receptions.total", 0)
        row_out["recYds"] = get_in(rcv, "playerStats.receiving.yards.total", 0)
        row_out["recTD"] = get_in(rcv, "playerStats.receiving.touchdowns.total", 0)
        row_out["targets"] = get_in(rcv, "playerStats.receiving.targets.total", 0)

        # Weighted Opportunities (exact site formula)
        # Build a fused row containing both rushing+receiving pieces for WO calc
        fused = {}
        fused.update(rr)
        # attach receiving sub-tree fields we rely on
        if isinstance(rcv, dict):
            fused.setdefault("playerStats", {}).setdefault("receiving", {})  # if needed
        row_out["wo"] = weighted_opportunities_fp({**rr, **rcv})

        out_rows.append(row_out)

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"rb_week_{week}_{SEASON}.csv")
    with open(out_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(out_rows[0].keys()))
        w.writeheader()
        w.writerows(out_rows)
    print(f"Saved {out_path} ({len(out_rows)} rows).")


if __name__ == "__main__":
    for wk in WEEKS:
        run_week(wk)
