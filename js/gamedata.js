// Game Data Collector Module
// Fetches user's past games from Lichess API for model training

/**
 * Fetch all past games for a user (with pagination support)
 * @param {string} username - Lichess username
 * @param {number} maxGames - Maximum number of games to fetch (default 100)
 * @returns {Promise} - Array of game data
 */
function fetchUserPastGames(username, maxGames = 100) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://lichess.org/api/games/user/${username}?max=${Math.min(maxGames, 300)}&sort=dateDesc`;
    
    console.log(`Fetching ${maxGames} past games for user: ${username}`);
    
    fetch(apiUrl, {
      headers: {
        'Accept': 'application/ndjson'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {
      // Parse NDJSON (newline-delimited JSON)
      const games = data.trim().split('\n')
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            console.warn('Failed to parse game line:', line.substring(0, 50));
            return null;
          }
        })
        .filter(game => game !== null);
      
      console.log(`✓ Fetched ${games.length} games for training`);
      resolve(games);
    })
    .catch(error => {
      console.error('Error fetching past games:', error);
      reject(error);
    });
  });
}

/**
 * Extract training data from a single game
 * @param {object} game - Game object from Lichess API
 * @returns {object} - Processed game data for training
 */
function extractGameTrainingData(game) {
  return {
    gameId: game.id,
    date: game.createdAt,
    speed: game.speed,
    variant: game.variant,
    white: {
      username: game.players.white.user?.name || 'Anonymous',
      rating: game.players.white.rating || null,
      ratingDiff: game.players.white.ratingDiff || null,
      result: game.status === 'mate' && game.winner === 'white' ? 'win' : 
              game.status === 'mate' && game.winner === 'black' ? 'loss' : 'draw'
    },
    black: {
      username: game.players.black.user?.name || 'Anonymous',
      rating: game.players.black.rating || null,
      ratingDiff: game.players.black.ratingDiff || null,
      result: game.status === 'mate' && game.winner === 'black' ? 'win' : 
              game.status === 'mate' && game.winner === 'white' ? 'loss' : 'draw'
    },
    moves: game.moves || '',
    pgn: game.pgn || '',
    fen: game.fen || null,
    status: game.status,
    winner: game.winner || null,
    termination: game.statusName || null,
    timeControl: game.clock ? `${game.clock.initial}+${game.clock.increment}` : 'unlimited'
  };
}

/**
 * Process multiple games for training dataset
 * @param {array} games - Array of game objects from Lichess API
 * @returns {object} - Processed dataset with statistics
 */
function processGamesForTraining(games) {
  console.log(`Processing ${games.length} games for training dataset`);
  
  const processedGames = games.map(game => extractGameTrainingData(game));
  
  // Calculate statistics
  const stats = {
    totalGames: processedGames.length,
    bySpeed: {},
    byVariant: {},
    byResult: {
      wins: 0,
      losses: 0,
      draws: 0
    },
    averageOpponentRating: 0,
    dateRange: {
      oldest: null,
      newest: null
    }
  };
  
  let totalOpponentRating = 0;
  let ratingCount = 0;
  
  processedGames.forEach(game => {
    // Count by speed
    stats.bySpeed[game.speed] = (stats.bySpeed[game.speed] || 0) + 1;
    
    // Count by variant
    stats.byVariant[game.variant] = (stats.byVariant[game.variant] || 0) + 1;
    
    // Count results (assuming white player is the user for now)
    if (game.white.result === 'win') stats.byResult.wins++;
    else if (game.white.result === 'loss') stats.byResult.losses++;
    else stats.byResult.draws++;
    
    // Average opponent rating
    if (game.black.rating) {
      totalOpponentRating += game.black.rating;
      ratingCount++;
    }
    
    // Date range
    const gameDate = new Date(game.date);
    if (!stats.dateRange.newest || gameDate > new Date(stats.dateRange.newest)) {
      stats.dateRange.newest = game.date;
    }
    if (!stats.dateRange.oldest || gameDate < new Date(stats.dateRange.oldest)) {
      stats.dateRange.oldest = game.date;
    }
  });
  
  if (ratingCount > 0) {
    stats.averageOpponentRating = Math.round(totalOpponentRating / ratingCount);
  }
  
  // Calculate win rate
  const totalDecisiveGames = stats.byResult.wins + stats.byResult.losses;
  stats.winRate = totalDecisiveGames > 0 ? 
    ((stats.byResult.wins / totalDecisiveGames) * 100).toFixed(2) + '%' : 
    'N/A';
  
  return {
    games: processedGames,
    statistics: stats,
    dataset: {
      totalSamples: processedGames.length,
      features: ['moves', 'pgn', 'fen', 'timeControl', 'speed', 'variant'],
      labels: ['result', 'winner']
    }
  };
}

/**
 * Fetch and process all training data for a user
 * @param {string} username - Lichess username
 * @param {number} maxGames - Maximum games to fetch (default 100)
 * @returns {Promise} - Complete training dataset
 */
function getTrainingDataset(username, maxGames = 100) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Building training dataset for: ${username}`);
      
      // Step 1: Fetch past games
      const games = await fetchUserPastGames(username, maxGames);
      
      // Step 2: Process games
      const trainingData = processGamesForTraining(games);
      
      console.log('✓ Training dataset created');
      console.log(`Dataset contains ${trainingData.games.length} games`);
      console.log('Statistics:', trainingData.statistics);
      
      resolve(trainingData);
    } catch (error) {
      console.error('Error building training dataset:', error);
      reject(error);
    }
  });
}

/**
 * Export training data as JSON (for downloading)
 * @param {object} trainingData - Training dataset from getTrainingDataset()
 * @returns {string} - JSON string
 */
function exportTrainingDataJSON(trainingData) {
  return JSON.stringify(trainingData, null, 2);
}

/**
 * Prepare training data in a format suitable for ML model input
 * @param {object} trainingData - Training dataset
 * @returns {object} - Formatted data for model training
 */
function formatForModelTraining(trainingData) {
  const formattedData = {
    metadata: {
      username: trainingData.username,
      totalSamples: trainingData.games.length,
      generatedAt: new Date().toISOString(),
      statistics: trainingData.statistics
    },
    trainingSet: trainingData.games.map(game => ({
      // Input features
      features: {
        moves: game.moves,
        pgn: game.pgn,
        fen: game.fen,
        timeControl: game.timeControl,
        speed: game.speed,
        variant: game.variant,
        opponentRating: game.black.rating
      },
      // Target labels
      labels: {
        result: game.white.result,
        winner: game.winner,
        status: game.status
      },
      // Metadata
      meta: {
        gameId: game.gameId,
        date: game.date
      }
    }))
  };
  
  return formattedData;
}

/**
 * Get game analysis data (moves breakdown)
 * @param {object} game - Single game object
 * @returns {array} - Array of moves with positions
 */
function analyzeSingleGameMoves(game) {
  // This would require a chess library to properly parse moves
  // For now, we return the raw moves
  const moves = game.moves ? game.moves.split(' ') : [];
  
  return {
    gameId: game.gameId,
    totalMoves: moves.length,
    moveList: moves,
    pgn: game.pgn,
    // Can be enhanced with chess.js to get positions after each move
  };
}

/**
 * Batch fetch games for multiple users
 * @param {array} usernames - Array of Lichess usernames
 * @param {number} maxGamesPerUser - Max games per user
 * @returns {Promise} - Merged training dataset
 */
function fetchMultipleUsersData(usernames, maxGamesPerUser = 50) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Fetching data for ${usernames.length} users`);
      
      const allGames = [];
      const userStats = {};
      
      for (const username of usernames) {
        try {
          const games = await fetchUserPastGames(username, maxGamesPerUser);
          allGames.push(...games);
          userStats[username] = {
            gamesCount: games.length,
            status: 'success'
          };
          console.log(`✓ Fetched ${games.length} games for ${username}`);
        } catch (error) {
          userStats[username] = {
            status: 'error',
            error: error.message
          };
          console.warn(`✗ Failed to fetch data for ${username}: ${error.message}`);
        }
      }
      
      const trainingData = processGamesForTraining(allGames);
      trainingData.userStats = userStats;
      
      resolve(trainingData);
    } catch (error) {
      console.error('Error in batch fetch:', error);
      reject(error);
    }
  });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchUserPastGames,
    extractGameTrainingData,
    processGamesForTraining,
    getTrainingDataset,
    exportTrainingDataJSON,
    formatForModelTraining,
    analyzeSingleGameMoves,
    fetchMultipleUsersData
  };
}
