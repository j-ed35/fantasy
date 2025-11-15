# auth/yahoo_auth.py

from pathlib import Path
from dotenv import load_dotenv
import os
from yfpy.query import YahooFantasySportsQuery

# Load your existing .env (this should be at project root)
load_dotenv(".env")

league_id = os.getenv("YAHOO_LEAGUE_ID")
game_code = os.getenv("YAHOO_GAME_CODE", "nfl")
game_id = os.getenv("YAHOO_GAME_ID")  # optional; may be None

yahoo = YahooFantasySportsQuery(
    league_id=league_id,
    game_code=game_code,
    game_id=game_id,
    yahoo_consumer_key=os.getenv("YAHOO_CONSUMER_KEY"),
    yahoo_consumer_secret=os.getenv("YAHOO_CONSUMER_SECRET"),
    browser_callback=True,
    env_file_location=Path(__file__).parent.parent,  # project root
    save_token_data_to_env_file=True,
)

print("✅ First-time authentication complete; token saved to .env.")
