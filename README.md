# Fantasy Football Analysis Tool

A comprehensive fantasy football analysis tool that scrapes player data, calculates weighted opportunities (WO), and provides interactive web-based visualizations for fantasy football decision-making.

🔗 **Live Demo**: [https://j-ed35.github.io/fantasy/](https://j-ed35.github.io/fantasy/)

## Features

### 📊 Data Analysis
- **Weighted Opportunities (WO) Calculation**: Implements the exact FantasyPoints.com formula for running backs
  - `WO = (1.35 × in20Attempts) + (2.29 × in20Targets) + (0.49 × non20Attempts) + (1.48 × non20Targets)`
- **Multi-Week Tracking**: Collects and analyzes running back performance across multiple weeks
- **Comprehensive Stats**: Tracks rushing attempts, yards, TDs, receptions, receiving yards, targets, and more

### 🕷️ Data Scraping
- **FantasyPoints.com Integration**: Automated scraping of NFL running back data
- **Yahoo Fantasy Integration**: Support for Yahoo Fantasy leagues (OAuth authentication)
- **ESPN Fantasy Integration**: Support for ESPN Fantasy leagues
- **Historical Data**: Maintains CSV files for each week of the season

### 🌐 Web Interface
- **Interactive Dashboard**: Clean, responsive web interface for data visualization
- **Player Analysis**: Individual player performance tracking and comparison
- **Team Optimization**: Tools for fantasy lineup optimization

## Project Structure

```
fantasy/
├── src/
│   └── scrapers/
│       ├── wo_scraper.py          # FantasyPoints.com data scraper
│       ├── yahoo_matchups.py      # Yahoo Fantasy league integration
│       └── __init__.py
├── data/
│   ├── running_backs/             # Weekly RB performance data (CSV)
│   │   ├── rb_week_1_2025.csv
│   │   ├── rb_week_2_2025.csv
│   │   └── ...
│   └── teams.json                 # Team data
├── static/
│   ├── styles.css                 # Main stylesheet
│   └── styles copy.css            # Alternative styles
├── js/
│   └── script.js                  # Frontend JavaScript
├── index.html                     # Main web interface
├── Players.html                   # Player-specific views
├── copy.html                      # Alternative layout
├── config.py                      # Configuration management
└── requirements.txt               # Python dependencies
```

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/j-ed35/fantasy.git
   cd fantasy
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root:
   ```env
   # Yahoo Fantasy (Optional)
   YAHOO_LEAGUE_ID=your_league_id
   YAHOO_CONSUMER_KEY=your_consumer_key
   YAHOO_CONSUMER_SECRET=your_consumer_secret
   
   # ESPN Fantasy (Optional)
   ESPN_LEAGUE_ID=your_league_id
   ESPN_YEAR=2025
   ESPN_S2=your_s2_token
   ESPN_SWID=your_swid_token
   ```

## Usage

### Data Scraping

**Scrape Running Back Data:**
```bash
python src/scrapers/wo_scraper.py
```
This will:
- Fetch latest running back data from FantasyPoints.com
- Calculate Weighted Opportunities for each player
- Save data to CSV files in `data/running_backs/`

### Web Interface

1. **Local Development:**
   - Open `index.html` in your web browser
   - Or serve with a local server:
     ```bash
     python -m http.server 8000
     ```
   - Navigate to `http://localhost:8000`

2. **GitHub Pages:**
   - The project is automatically deployed to GitHub Pages
   - Access at: https://j-ed35.github.io/fantasy/

## Data Sources

- **FantasyPoints.com**: Primary source for NFL player statistics and advanced metrics
- **Yahoo Fantasy Sports API**: League-specific data and matchups
- **ESPN Fantasy API**: Alternative league platform integration

## Key Metrics

### Weighted Opportunities (WO)
A composite metric that weighs different types of touches based on their fantasy value:
- **Inside-20 Attempts**: 1.35x multiplier (high TD probability)
- **Inside-20 Targets**: 2.29x multiplier (highest value touches)
- **Non-Inside-20 Attempts**: 0.49x multiplier (standard rushing)
- **Non-Inside-20 Targets**: 1.48x multiplier (receiving opportunities)

This metric helps identify running backs with the most valuable touches, regardless of current production.

## Dependencies

### Python Packages
- `requests` - HTTP requests for data scraping
- `pandas` - Data manipulation and analysis
- `python-dotenv` - Environment variable management
- `espn-api` - ESPN Fantasy Sports integration
- `yahoo-oauth` - Yahoo Fantasy Sports authentication
- `yfpy` - Yahoo Fantasy Python API wrapper

### Frontend
- Pure HTML/CSS/JavaScript (no frameworks)
- Responsive design with CSS Grid and Flexbox
- Custom styling with animations and transitions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FantasyPoints.com](https://data.fantasypoints.com) for providing comprehensive NFL statistics
- Yahoo Fantasy Sports and ESPN for their fantasy football platforms
- The fantasy football community for insights on player evaluation metrics

---

**Disclaimer**: This tool is for educational and personal use only. Please respect the terms of service of all data sources and fantasy platforms.
