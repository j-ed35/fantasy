// Playoff Calculator - Interactive Fantasy Standings

// State Management
let matchups = [];
let teams = {};
let userSelections = {}; // Track user selections for remaining games
let currentFilter = 'all';
let focusedTeam = null;

// Initialize the calculator
function init() {
  try {
    loadMatchupData();
    calculateStandings();
    populateTeamSelector();
    renderStandings();
    renderMatchups();
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing playoff calculator:', error);
    document.getElementById('matchupsContainer').innerHTML =
      '<div style="padding: 20px; text-align: center; color: red;">Error loading matchup data: ' + error.message + '</div>';
  }
}

// Load matchup data from the included JavaScript file
function loadMatchupData() {
  if (typeof MATCHUP_DATA === 'undefined') {
    throw new Error('Matchup data not found. Please ensure matchup_data.js is loaded.');
  }

  MATCHUP_DATA.forEach((row, index) => {
    // Parse scores - treat 0.0 as incomplete
    const team1Score = parseFloat(row.team1_score);
    const team2Score = parseFloat(row.team2_score);
    const team1HasScore = row.team1_score !== '' && team1Score > 0;
    const team2HasScore = row.team2_score !== '' && team2Score > 0;

    const matchup = {
      week: parseInt(row.week),
      team1: {
        name: row.team1_name,
        score: team1HasScore ? team1Score : null,
        projected: parseFloat(row.team1_projected) || null
      },
      team2: {
        name: row.team2_name,
        score: team2HasScore ? team2Score : null,
        projected: parseFloat(row.team2_projected) || null
      },
      completed: team1HasScore && team2HasScore,
      id: `week${row.week}_${index}`
    };

    matchups.push(matchup);

    // Initialize team records
    if (!teams[matchup.team1.name]) {
      teams[matchup.team1.name] = { name: matchup.team1.name, wins: 0, losses: 0, pointsFor: 0, totalPoints: 0 };
    }
    if (!teams[matchup.team2.name]) {
      teams[matchup.team2.name] = { name: matchup.team2.name, wins: 0, losses: 0, pointsFor: 0, totalPoints: 0 };
    }
  });
}

// Calculate current standings based on completed games and user selections
function calculateStandings() {
  // Reset all team records
  Object.values(teams).forEach(team => {
    team.wins = 0;
    team.losses = 0;
    team.pointsFor = 0;
    team.totalPoints = 0;
  });

  // Process all matchups
  matchups.forEach(matchup => {
    let winner, loser;

    if (matchup.completed) {
      // Use actual scores for completed games
      if (matchup.team1.score > matchup.team2.score) {
        winner = matchup.team1.name;
        loser = matchup.team2.name;
      } else {
        winner = matchup.team2.name;
        loser = matchup.team1.name;
      }

      teams[matchup.team1.name].pointsFor += matchup.team1.score;
      teams[matchup.team2.name].pointsFor += matchup.team2.score;
      teams[matchup.team1.name].totalPoints += matchup.team1.score;
      teams[matchup.team2.name].totalPoints += matchup.team2.score;

      teams[winner].wins++;
      teams[loser].losses++;
    } else {
      // Check if user made a selection for this remaining game
      if (userSelections[matchup.id]) {
        winner = userSelections[matchup.id];
        loser = winner === matchup.team1.name ? matchup.team2.name : matchup.team1.name;

        teams[winner].wins++;
        teams[loser].losses++;

        // Add projected points for user selections
        teams[winner].totalPoints += 110;
        teams[loser].totalPoints += 95;
      }
    }
  });
}

// Populate team selector dropdown
function populateTeamSelector() {
  const selector = document.getElementById('focusTeam');
  const sortedTeamNames = Object.keys(teams).sort();

  sortedTeamNames.forEach(teamName => {
    const option = document.createElement('option');
    option.value = teamName;
    option.textContent = teamName;
    selector.appendChild(option);
  });
}

// Update focused team stats
function updateFocusedTeamStats() {
  const statsContainer = document.getElementById('focusTeamStats');

  if (!focusedTeam) {
    statsContainer.style.display = 'none';
    return;
  }

  statsContainer.style.display = 'flex';

  const sortedTeams = getSortedTeams();
  const teamIndex = sortedTeams.findIndex(t => t.name === focusedTeam);
  const currentSeed = teamIndex + 1;
  const team = teams[focusedTeam];

  document.getElementById('currentSeed').textContent = currentSeed;
  document.getElementById('projectedRecord').textContent = `${team.wins}-${team.losses}`;
}

// Get sorted teams array
function getSortedTeams() {
  return Object.values(teams).sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return b.totalPoints - a.totalPoints;
  });
}

// Render the standings table
function renderStandings() {
  const container = document.getElementById('standingsTable');
  const sortedTeams = getSortedTeams();

  let html = `
    <div class="standings-row header">
      <div>Rank</div>
      <div>Team</div>
      <div>Record</div>
      <div>PF</div>
    </div>
  `;

  sortedTeams.forEach((team, index) => {
    const rank = index + 1;
    const isPlayoffBound = rank <= 6;
    const playoffClass = isPlayoffBound ? 'playoff-bound' : '';
    const isFocused = team.name === focusedTeam ? 'focused-team' : '';

    html += `
      <div class="standings-row ${playoffClass} ${isFocused}">
        <div class="rank">${rank}</div>
        <div class="team-name">
          ${team.name}
          ${isPlayoffBound ? '<span class="playoff-indicator"></span>' : ''}
        </div>
        <div class="record">${team.wins}-${team.losses}</div>
        <div class="points-for">${team.totalPoints.toFixed(1)}</div>
      </div>
    `;
  });

  container.innerHTML = html;
  updateFocusedTeamStats();
}

// Render all matchups grouped by week
function renderMatchups() {
  const container = document.getElementById('matchupsContainer');

  // Group matchups by week
  const weekGroups = {};
  matchups.forEach(matchup => {
    if (!weekGroups[matchup.week]) {
      weekGroups[matchup.week] = [];
    }
    weekGroups[matchup.week].push(matchup);
  });

  let html = '';

  // Sort weeks
  const weeks = Object.keys(weekGroups).sort((a, b) => parseInt(a) - parseInt(b));

  weeks.forEach(week => {
    const weekMatchups = weekGroups[week];
    const allCompleted = weekMatchups.every(m => m.completed);
    const displayWeek = shouldDisplayWeek(weekMatchups, allCompleted);

    if (!displayWeek) return;

    html += `
      <div class="week-section" data-week="${week}">
        <div class="week-header">
          <span>Week ${week}</span>
          <span class="week-status ${allCompleted ? 'completed' : ''}">
            ${allCompleted ? 'Completed' : 'Remaining'}
          </span>
        </div>
        <div class="week-matchups">
          ${renderWeekMatchups(weekMatchups)}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Determine if week should be displayed based on filter
function shouldDisplayWeek(weekMatchups, allCompleted) {
  if (currentFilter === 'all') return true;
  if (currentFilter === 'completed') return allCompleted;
  if (currentFilter === 'remaining') return !allCompleted;
  return true;
}

// Calculate which matchup outcome helps the focused team
function calculateMatchupImpact(matchup) {
  if (!focusedTeam || matchup.completed || userSelections[matchup.id]) {
    return { team1Class: '', team2Class: '' };
  }

  // If the focused team is in this matchup, don't show helpful/harmful
  if (matchup.team1.name === focusedTeam || matchup.team2.name === focusedTeam) {
    return { team1Class: '', team2Class: '' };
  }

  // Determine if each team winning would help or hurt the focused team
  // A team losing is GOOD for focused team if that team is ahead or tied
  // A team losing is BAD for focused team if that team is behind (and you need them to beat someone ahead)

  const team1WinsRank = calculateCurrentRank(matchup.team1.name);
  const team2WinsRank = calculateCurrentRank(matchup.team2.name);
  const focusedRank = calculateCurrentRank(focusedTeam);

  // Simple heuristic:
  // - If team is ahead of or tied with focused team, them LOSING is helpful
  // - If team is behind focused team, them WINNING might help if they're playing someone ahead

  let team1Class = '';
  let team2Class = '';

  // Check if team1 is a threat (ahead of or tied with focused team)
  const team1IsAhead = team1WinsRank <= focusedRank;
  // Check if team2 is a threat
  const team2IsAhead = team2WinsRank <= focusedRank;

  if (team1IsAhead && !team2IsAhead) {
    // Team1 is ahead, you want team2 to win
    team2Class = 'helpful-choice';
    team1Class = 'harmful-choice';
  } else if (team2IsAhead && !team1IsAhead) {
    // Team2 is ahead, you want team1 to win
    team1Class = 'helpful-choice';
    team2Class = 'harmful-choice';
  } else if (team1IsAhead && team2IsAhead) {
    // Both ahead - want the one further ahead to lose (helps you more)
    if (team1WinsRank < team2WinsRank) {
      team2Class = 'helpful-choice';
      team1Class = 'harmful-choice';
    } else if (team2WinsRank < team1WinsRank) {
      team1Class = 'helpful-choice';
      team2Class = 'harmful-choice';
    }
  }

  return { team1Class, team2Class };
}

// Calculate current rank for a team
function calculateCurrentRank(teamName) {
  const sortedTeams = getSortedTeams();
  return sortedTeams.findIndex(t => t.name === teamName) + 1;
}

// Render matchups for a specific week
function renderWeekMatchups(weekMatchups) {
  return weekMatchups.map(matchup => {
    const completed = matchup.completed;
    const team1Winner = completed && matchup.team1.score > matchup.team2.score;
    const team2Winner = completed && matchup.team2.score > matchup.team1.score;
    const team1Selected = !completed && userSelections[matchup.id] === matchup.team1.name;
    const team2Selected = !completed && userSelections[matchup.id] === matchup.team2.name;

    // Calculate helpful/harmful highlighting
    const impact = calculateMatchupImpact(matchup);

    return `
      <div class="matchup-card ${completed ? 'completed' : ''}" data-matchup-id="${matchup.id}">
        <div class="matchup-teams">
          <div class="team ${team1Winner ? 'winner' : ''} ${team2Winner ? 'loser' : ''} ${team1Selected ? 'selected' : ''} ${impact.team1Class}"
               data-team="${matchup.team1.name}">
            <span class="team-score ${!matchup.team1.score ? 'no-score' : ''}">
              ${matchup.team1.score ? matchup.team1.score.toFixed(2) : 'TBD'}
            </span>
            <span class="team-name-match">${matchup.team1.name}</span>
          </div>
          <div class="vs-divider">VS</div>
          <div class="team ${team2Winner ? 'winner' : ''} ${team1Winner ? 'loser' : ''} ${team2Selected ? 'selected' : ''} ${impact.team2Class}"
               data-team="${matchup.team2.name}">
            <span class="team-name-match">${matchup.team2.name}</span>
            <span class="team-score ${!matchup.team2.score ? 'no-score' : ''}">
              ${matchup.team2.score ? matchup.team2.score.toFixed(2) : 'TBD'}
            </span>
          </div>
        </div>
        <div class="matchup-status">
          ${!completed ? `
            <span class="result-badge projected">
              ${userSelections[matchup.id] ? '✓' : '?'}
            </span>
          ` : `
            <span class="result-badge final">Final</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Setup event listeners
function setupEventListeners() {
  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    userSelections = {};
    calculateStandings();
    renderStandings();
    renderMatchups();
  });

  // Team selector
  document.getElementById('focusTeam').addEventListener('change', (e) => {
    focusedTeam = e.target.value || null;
    renderStandings();
    renderMatchups();
  });

  // Week filter
  document.getElementById('weekFilter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderMatchups();
  });

  // Matchup selection (event delegation)
  document.getElementById('matchupsContainer').addEventListener('click', (e) => {
    console.log('Click detected', e.target);
    const matchupCard = e.target.closest('.matchup-card');
    if (!matchupCard) {
      console.log('No matchup card found');
      return;
    }
    if (matchupCard.classList.contains('completed')) {
      console.log('Matchup is completed');
      return;
    }

    const team = e.target.closest('.team');
    if (!team) {
      console.log('No team element found');
      return;
    }

    const matchupId = matchupCard.dataset.matchupId;
    const teamName = team.dataset.team;
    console.log('Selected team:', teamName, 'for matchup:', matchupId);

    // Toggle selection
    if (userSelections[matchupId] === teamName) {
      delete userSelections[matchupId];
    } else {
      userSelections[matchupId] = teamName;
    }

    calculateStandings();
    renderStandings();
    renderMatchups();
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
