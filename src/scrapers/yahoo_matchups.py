# src/scrapers/yahoo_matchups.py
# to run: python3 -m src.scrapers.yahoo_matchups


import os
import sys
from pathlib import Path
import logging
import json
import pandas as pd
from dotenv import load_dotenv
from yfpy.query import YahooFantasySportsQuery
import config

# Ensure project root in path so config.py is importable
sys.path.append(str(Path(__file__).resolve().parents[2]))

# Suppress yfpy query warnings
logging.getLogger("yfpy.query").setLevel(logging.ERROR)


def init_yahoo() -> YahooFantasySportsQuery:
    load_dotenv(".env")
    yahoo = YahooFantasySportsQuery(
        league_id=config.YAHOO_LEAGUE_ID,
        game_code=config.YAHOO_GAME_CODE,
        game_id=config.YAHOO_GAME_ID,
        yahoo_consumer_key=config.YAHOO_CONSUMER_KEY,
        yahoo_consumer_secret=config.YAHOO_CONSUMER_SECRET,
    )
    return yahoo


def get_all_weeks_matchups(
    yahoo: YahooFantasySportsQuery, weeks: list[int]
) -> pd.DataFrame:
    all_rows = []

    for wk in weeks:
        print(f"Fetching week {wk}...", end=" ")
        resp = yahoo.get_league_matchups_by_week(wk)

        for idx, item in enumerate(resp):
            teams = item.teams

            if len(teams) < 2:
                print(f"\nWarning: Week {wk}, Matchup {idx + 1} has {len(teams)} teams")
                continue

            team_obj0 = teams[0]
            team_obj1 = teams[1]

            # Clean team names - handle byte string encoding
            def clean_name(name):
                if isinstance(name, bytes):
                    return name.decode("utf-8")
                elif isinstance(name, str) and name.startswith("b'"):
                    # Handle string representation of bytes
                    try:
                        return eval(name).decode("utf-8")
                    except (ValueError, AttributeError, SyntaxError):
                        return name
                return name

            row = {
                "week": item.week,
                "team1_name": clean_name(team_obj0.name),
                "team1_score": team_obj0.points,
                "team1_projected": team_obj0.projected_points,
                "team2_name": clean_name(team_obj1.name),
                "team2_score": team_obj1.points,
                "team2_projected": team_obj1.projected_points,
            }
            all_rows.append(row)

        print(f"✓ {len([r for r in all_rows if r['week'] == wk])} matchups")

    df = pd.DataFrame(all_rows)
    return df


if __name__ == "__main__":
    yahoo = init_yahoo()
    weeks_to_fetch = list(range(1, 15))  # Weeks 1-14
    matchups_df = get_all_weeks_matchups(yahoo, weeks_to_fetch)
    print("\n" + "=" * 60)
    print("MATCHUPS DATA:")
    print("=" * 60)
    print(matchups_df)

    # Save CSV
    csv_path = (
        Path(__file__).resolve().parents[2] / "data" / "yahoo_league_matchups_2025.csv"
    )
    matchups_df.to_csv(csv_path, index=False)
    print(f"✅ Saved CSV to {csv_path}")

    # Save JavaScript file for playoff calculator
    js_path = Path(__file__).resolve().parents[2] / "js" / "matchup_data.js"
    matchups_list = matchups_df.to_dict('records')
    js_content = "// Auto-generated from CSV data\n"
    js_content += "const MATCHUP_DATA = "
    js_content += json.dumps(matchups_list, indent=2, ensure_ascii=False)
    js_content += ";\n"
    js_path.write_text(js_content, encoding='utf-8')
    print(f"✅ Saved JavaScript to {js_path}")
