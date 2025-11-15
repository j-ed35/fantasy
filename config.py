import os
from dotenv import load_dotenv

load_dotenv(".env")


YAHOO_LEAGUE_ID = os.getenv("YAHOO_LEAGUE_ID")
YAHOO_CONSUMER_KEY = os.getenv("YAHOO_CONSUMER_KEY")
YAHOO_CONSUMER_SECRET = os.getenv("YAHOO_CONSUMER_SECRET")
YAHOO_GAME_CODE = os.getenv("YAHOO_GAME_CODE", "nfl")
YAHOO_GAME_ID = os.getenv("YAHOO_GAME_ID", None)

# Token fields (after first‐time auth, if saved to .env)
YAHOO_ACCESS_TOKEN = os.getenv("YAHOO_ACCESS_TOKEN")
YAHOO_REFRESH_TOKEN = os.getenv("YAHOO_REFRESH_TOKEN")
YAHOO_TOKEN_TIME = os.getenv("YAHOO_TOKEN_TIME")
YAHOO_TOKEN_TYPE = os.getenv("YAHOO_TOKEN_TYPE")


# ESPN Leagues
ESPN_LEAGUE_ID = os.getenv("ESPN_LEAGUE_ID")
ESPN_YEAR = os.getenv("ESPN_YEAR")
ESPN_S2 = os.getenv("ESPN_S2")
ESPN_SWID = os.getenv("ESPN_SWID")
