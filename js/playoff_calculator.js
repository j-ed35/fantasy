// Playoff Calculator - Interactive Fantasy Standings

// State Management
let matchups = [];
let teams = {};
let userSelections = {}; // Track user selections for remaining games
let currentFilter = 'all';
let focusedTeam = null;
let simulationResults = null; // Store Monte Carlo simulation results

// Initialize the calculator
function init() {
  try {
    loadMatchupData();
    calculateStandings();
    populateTeamSelector();
    renderStandings();
    renderMatchups();
    setupEventListeners();
    // Run initial simulation
    runMonteCarloSimulation(10000, true);
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

  if (simulationResults && simulationResults[focusedTeam]) {
    const odds = (simulationResults[focusedTeam].playoffAppearances / simulationResults[focusedTeam].totalSimulations * 100).toFixed(1);
    document.getElementById('playoffOdds').textContent = `${odds}%`;
    document.getElementById('playoffOdds').style.color = odds >= 50 ? '#28a745' : (odds >= 25 ? '#ffc107' : '#dc3545');
  } else {
    document.getElementById('playoffOdds').textContent = '--';
  }
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
  const showOdds = simulationResults !== null;

  let html = `
    <div class="standings-row header">
      <div>Rank</div>
      <div>Team</div>
      <div>Record</div>
      <div>PF</div>
      ${showOdds ? '<div>Odds</div>' : ''}
    </div>
  `;

  sortedTeams.forEach((team, index) => {
    const rank = index + 1;
    const isPlayoffBound = rank <= 6;
    const playoffClass = isPlayoffBound ? 'playoff-bound' : '';
    const isFocused = team.name === focusedTeam ? 'focused-team' : '';

    let oddsColumn = '';
    if (showOdds && simulationResults[team.name]) {
      const odds = (simulationResults[team.name].playoffAppearances / simulationResults[team.name].totalSimulations * 100).toFixed(1);
      oddsColumn = `<div class="playoff-odds">${odds}%</div>`;
    }

    html += `
      <div class="standings-row ${playoffClass} ${isFocused}">
        <div class="rank">${rank}</div>
        <div class="team-name">
          ${team.name}
          ${isPlayoffBound ? '<span class="playoff-indicator"></span>' : ''}
        </div>
        <div class="record">${team.wins}-${team.losses}</div>
        <div class="points-for">${team.totalPoints.toFixed(1)}</div>
        ${oddsColumn}
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

// Calculate playoff odds impact for a specific matchup outcome
function calculateMatchupImpact(matchupId, winnerName) {
  if (!focusedTeam || !simulationResults) return null;

  // Create a copy of userSelections with this matchup added
  const tempSelections = { ...userSelections, [matchupId]: winnerName };

  // Run a quick simulation with the temporary selections
  const quickResults = runQuickSimulation(1000, tempSelections);

  if (!quickResults || !quickResults[focusedTeam]) return null;

  // Return the playoff odds for the focused team with this outcome
  return (quickResults[focusedTeam].playoffAppearances / quickResults[focusedTeam].totalSimulations * 100);
}

// Run a quick simulation without UI updates (for impact calculation)
function runQuickSimulation(numSimulations, selectionsOverride = null) {
  const selections = selectionsOverride || userSelections;
  const results = {};
  Object.keys(teams).forEach(teamName => {
    results[teamName] = {
      playoffAppearances: 0,
      totalSimulations: numSimulations,
      avgSeed: 0,
      seedTotals: 0
    };
  });

  // Get current team strength based on current wins
  const teamStrength = {};
  Object.keys(teams).forEach(teamName => {
    const totalGames = teams[teamName].wins + teams[teamName].losses;
    const winPct = totalGames > 0 ? teams[teamName].wins / totalGames : 0.5;
    teamStrength[teamName] = 0.3 + (winPct * 0.4);
  });

  const remainingMatchups = matchups.filter(m => !m.completed && !selections[m.id]);
  const fixedMatchups = matchups.filter(m => m.completed || selections[m.id]);

  // Run simulations
  for (let sim = 0; sim < numSimulations; sim++) {
    const simTeams = {};

    Object.keys(teams).forEach(teamName => {
      simTeams[teamName] = { name: teamName, wins: 0, losses: 0, pointsFor: 0, totalPoints: 0 };
    });

    fixedMatchups.forEach(matchup => {
      let winner, loser;

      if (matchup.completed) {
        if (matchup.team1.score > matchup.team2.score) {
          winner = matchup.team1.name;
          loser = matchup.team2.name;
        } else {
          winner = matchup.team2.name;
          loser = matchup.team1.name;
        }
        simTeams[matchup.team1.name].pointsFor += matchup.team1.score;
        simTeams[matchup.team2.name].pointsFor += matchup.team2.score;
        simTeams[matchup.team1.name].totalPoints += matchup.team1.score;
        simTeams[matchup.team2.name].totalPoints += matchup.team2.score;
      } else if (selections[matchup.id]) {
        winner = selections[matchup.id];
        loser = winner === matchup.team1.name ? matchup.team2.name : matchup.team1.name;
        simTeams[winner].totalPoints += 110;
        simTeams[loser].totalPoints += 95;
      }

      simTeams[winner].wins++;
      simTeams[loser].losses++;
    });

    remainingMatchups.forEach(matchup => {
      const team1Strength = teamStrength[matchup.team1.name];
      const team2Strength = teamStrength[matchup.team2.name];
      const totalStrength = team1Strength + team2Strength;
      const team1WinProb = team1Strength / totalStrength;

      const rand = Math.random();
      const winner = rand < team1WinProb ? matchup.team1.name : matchup.team2.name;
      const loser = winner === matchup.team1.name ? matchup.team2.name : matchup.team1.name;

      simTeams[winner].wins++;
      simTeams[loser].losses++;

      // Add projected points for simulated matchups
      simTeams[winner].totalPoints += 110;
      simTeams[loser].totalPoints += 95;
    });

    const sortedSimTeams = Object.values(simTeams).sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.totalPoints - a.totalPoints;
    });

    sortedSimTeams.forEach((team, index) => {
      const seed = index + 1;
      if (seed <= 6) {
        results[team.name].playoffAppearances++;
      }
      results[team.name].seedTotals += seed;
    });
  }

  Object.keys(results).forEach(teamName => {
    results[teamName].avgSeed = (results[teamName].seedTotals / numSimulations).toFixed(1);
  });

  return results;
}

// Cache for matchup impact calculations
let matchupImpactCache = {};

// Render matchups for a specific week
function renderWeekMatchups(weekMatchups) {
  return weekMatchups.map(matchup => {
    const completed = matchup.completed;
    const team1Winner = completed && matchup.team1.score > matchup.team2.score;
    const team2Winner = completed && matchup.team2.score > matchup.team1.score;
    const team1Selected = !completed && userSelections[matchup.id] === matchup.team1.name;
    const team2Selected = !completed && userSelections[matchup.id] === matchup.team2.name;

    // Calculate impact if a team is focused and this is a remaining matchup
    let team1HelpfulClass = '';
    let team2HelpfulClass = '';

    if (focusedTeam && !completed && !userSelections[matchup.id] && simulationResults) {
      // Get current odds for focused team
      const currentOdds = simulationResults[focusedTeam]
        ? (simulationResults[focusedTeam].playoffAppearances / simulationResults[focusedTeam].totalSimulations * 100)
        : 0;

      // Use cache key to avoid recalculating
      const cacheKey = `${focusedTeam}_${matchup.id}_${JSON.stringify(userSelections)}`;

      if (!matchupImpactCache[cacheKey]) {
        // Calculate odds if team1 wins
        const team1WinOdds = calculateMatchupImpact(matchup.id, matchup.team1.name);
        // Calculate odds if team2 wins
        const team2WinOdds = calculateMatchupImpact(matchup.id, matchup.team2.name);

        matchupImpactCache[cacheKey] = {
          team1Impact: team1WinOdds !== null ? team1WinOdds - currentOdds : 0,
          team2Impact: team2WinOdds !== null ? team2WinOdds - currentOdds : 0
        };
      }

      const impact1 = matchupImpactCache[cacheKey].team1Impact;
      const impact2 = matchupImpactCache[cacheKey].team2Impact;

      // Determine which outcome is better for the focused team
      // Only highlight if there's a meaningful difference (>1% threshold)
      const impactDiff = Math.abs(impact1 - impact2);

      if (impactDiff > 1) {
        if (impact1 > impact2) {
          // Team1 winning is better for focused team
          team1HelpfulClass = 'helpful-choice';
          team2HelpfulClass = 'harmful-choice';
        } else {
          // Team2 winning is better for focused team
          team1HelpfulClass = 'harmful-choice';
          team2HelpfulClass = 'helpful-choice';
        }
      }
    }

    return `
      <div class="matchup-card ${completed ? 'completed' : ''}" data-matchup-id="${matchup.id}">
        <div class="matchup-teams">
          <div class="team ${team1Winner ? 'winner' : ''} ${team2Winner ? 'loser' : ''} ${team1Selected ? 'selected' : ''} ${team1HelpfulClass}"
               data-team="${matchup.team1.name}">
            <span class="team-score ${!matchup.team1.score ? 'no-score' : ''}">
              ${matchup.team1.score ? matchup.team1.score.toFixed(2) : 'TBD'}
            </span>
            <span class="team-name-match">${matchup.team1.name}</span>
          </div>
          <div class="vs-divider">VS</div>
          <div class="team ${team2Winner ? 'winner' : ''} ${team1Winner ? 'loser' : ''} ${team2Selected ? 'selected' : ''} ${team2HelpfulClass}"
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

// Monte Carlo Simulation - Run 10,000 simulations of remaining games
function runMonteCarloSimulation(numSimulations = 10000, silent = false) {
  const btn = document.getElementById('runSimulationBtn');
  const indicator = document.getElementById('simulatingIndicator');

  if (!silent) {
    btn.disabled = true;
    btn.textContent = 'Running...';
  }

  // Show loading indicator briefly
  indicator.style.display = 'flex';

  // Use setTimeout to allow UI to update
  setTimeout(() => {
    const results = {};
    Object.keys(teams).forEach(teamName => {
      results[teamName] = {
        playoffAppearances: 0,
        totalSimulations: numSimulations,
        avgSeed: 0,
        seedTotals: 0
      };
    });

    // Get current team strength based on current wins (for weighted probability)
    const teamStrength = {};
    Object.keys(teams).forEach(teamName => {
      // Calculate strength: base 50% + bonus based on current win percentage
      const totalGames = teams[teamName].wins + teams[teamName].losses;
      const winPct = totalGames > 0 ? teams[teamName].wins / totalGames : 0.5;
      teamStrength[teamName] = 0.3 + (winPct * 0.4); // Range: 30% to 70%
    });

    // Get remaining matchups
    const remainingMatchups = matchups.filter(m => !m.completed && !userSelections[m.id]);
    const fixedMatchups = matchups.filter(m => m.completed || userSelections[m.id]);

    // Run simulations
    for (let sim = 0; sim < numSimulations; sim++) {
      const simTeams = {};

      // Initialize with base stats from completed and user-selected games
      Object.keys(teams).forEach(teamName => {
        simTeams[teamName] = { name: teamName, wins: 0, losses: 0, pointsFor: 0, totalPoints: 0 };
      });

      // Process completed and user-selected games
      fixedMatchups.forEach(matchup => {
        let winner, loser;

        if (matchup.completed) {
          if (matchup.team1.score > matchup.team2.score) {
            winner = matchup.team1.name;
            loser = matchup.team2.name;
          } else {
            winner = matchup.team2.name;
            loser = matchup.team1.name;
          }
          simTeams[matchup.team1.name].pointsFor += matchup.team1.score;
          simTeams[matchup.team2.name].pointsFor += matchup.team2.score;
          simTeams[matchup.team1.name].totalPoints += matchup.team1.score;
          simTeams[matchup.team2.name].totalPoints += matchup.team2.score;
        } else if (userSelections[matchup.id]) {
          winner = userSelections[matchup.id];
          loser = winner === matchup.team1.name ? matchup.team2.name : matchup.team1.name;
          simTeams[winner].totalPoints += 110;
          simTeams[loser].totalPoints += 95;
        }

        simTeams[winner].wins++;
        simTeams[loser].losses++;
      });

      // Simulate remaining matchups with weighted probabilities
      remainingMatchups.forEach(matchup => {
        const team1Strength = teamStrength[matchup.team1.name];
        const team2Strength = teamStrength[matchup.team2.name];

        // Normalize probabilities so they sum to 1
        const totalStrength = team1Strength + team2Strength;
        const team1WinProb = team1Strength / totalStrength;

        const rand = Math.random();
        const winner = rand < team1WinProb ? matchup.team1.name : matchup.team2.name;
        const loser = winner === matchup.team1.name ? matchup.team2.name : matchup.team1.name;

        simTeams[winner].wins++;
        simTeams[loser].losses++;

        // Add projected points for simulated matchups
        simTeams[winner].totalPoints += 110;
        simTeams[loser].totalPoints += 95;
      });

      // Sort teams and determine playoff teams
      const sortedSimTeams = Object.values(simTeams).sort((a, b) => {
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        return b.totalPoints - a.totalPoints;
      });

      // Top 6 make playoffs
      sortedSimTeams.forEach((team, index) => {
        const seed = index + 1;
        if (seed <= 6) {
          results[team.name].playoffAppearances++;
        }
        results[team.name].seedTotals += seed;
      });
    }

    // Calculate average seeds
    Object.keys(results).forEach(teamName => {
      results[teamName].avgSeed = (results[teamName].seedTotals / numSimulations).toFixed(1);
    });

    simulationResults = results;
    document.getElementById('simulationNote').style.display = 'block';
    renderStandings();

    // Hide loading indicator
    setTimeout(() => {
      indicator.style.display = 'none';
    }, silent ? 300 : 100);

    if (!silent) {
      btn.disabled = false;
      btn.textContent = 'Re-run Simulation';
    }
  }, silent ? 0 : 50);
}

// Setup event listeners
function setupEventListeners() {
  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    userSelections = {};
    matchupImpactCache = {}; // Clear cache on reset
    calculateStandings();
    renderStandings();
    renderMatchups();
    // Auto-run simulation after reset
    runMonteCarloSimulation(10000, true);
  });

  // Run simulation button (manual re-run)
  document.getElementById('runSimulationBtn').addEventListener('click', () => {
    runMonteCarloSimulation();
  });

  // Team selector
  document.getElementById('focusTeam').addEventListener('change', (e) => {
    focusedTeam = e.target.value || null;
    matchupImpactCache = {}; // Clear cache when team changes
    renderStandings();
    renderMatchups(); // Re-render matchups to show helpful choices
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

    matchupImpactCache = {}; // Clear cache when selection changes
    calculateStandings();
    renderStandings();
    renderMatchups();

    // Auto-run simulation after selection
    runMonteCarloSimulation(10000, true);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
