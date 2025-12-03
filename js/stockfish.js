// Stockfish Analysis Module
// This module handles chess position analysis using Stockfish API

// Stockfish API endpoint (free public API)
const STOCKFISH_API = 'https://stockfish.online/api/s/v2.php';

/**
 * Fetch current game state for the authenticated user
 * @param {string} username - Lichess username
 * @returns {Promise} - Current game data
 */
function fetchCurrentGameState(username) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://lichess.org/api/user/${username}/current-game`;
    
    console.log('Fetching current game for:', username);
    
    fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
      console.log('Current game response status:', response.status);
      if (!response.ok) {
        throw new Error('No active game found');
      }
      return response.json();
    })
    .then(data => {
      console.log('Current game state full response:', data);
      console.log('Game object:', data.game);
      resolve(data);
    })
    .catch(error => {
      console.error('Error fetching current game:', error);
      reject(error);
    });
  });
}

/**
 * Extract FEN (Forsyth-Edwards Notation) from game data
 * @param {object} gameData - Game data from Lichess API
 * @returns {string} - FEN string
 */
function extractFENFromGame(gameData) {
  // If game data contains a game object with moves
  if (gameData.game) {
    const game = gameData.game;
    // The game object should contain the current position
    // We need to parse moves to get current FEN
    return game.fen || parseFENFromMoves(game.moves);
  }
  return null;
}

/**
 * Parse FEN from a list of moves
 * This is a simple implementation - in production, use a chess library
 * @param {string} moves - Space-separated moves in algebraic notation
 * @returns {string} - FEN string
 */
function parseFENFromMoves(moves) {
  // Basic implementation - returns the current position
  // For a real implementation, you'd use a library like chess.js
  if (!moves || moves.length === 0) {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }
  
  // This is a placeholder - actual FEN generation from moves requires
  // a proper chess library implementation
  console.warn('FEN parsing from moves requires chess.js library');
  return null;
}

/**
 * Analyze position using Stockfish API
 * @param {string} fen - FEN notation of the position
 * @param {number} depth - Search depth (1-20, shallow = 5-10)
 * @returns {Promise} - Analysis result with best move
 */
function analyzePositionWithStockfish(fen, depth = 6) {
  return new Promise((resolve, reject) => {
    if (!fen) {
      reject(new Error('Invalid FEN position'));
      return;
    }

    console.log('Analyzing FEN:', fen);
    console.log('Depth:', depth);

    const params = new URLSearchParams({
      fen: fen,
      depth: Math.min(depth, 20) // Cap depth at 20
    });

    const apiUrl = `${STOCKFISH_API}?${params.toString()}`;
    console.log('API URL:', apiUrl);

    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
      console.log('Stockfish response status:', response.status);
      if (!response.ok) {
        throw new Error(`Stockfish API HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Stockfish raw response:', data);
      
      // Parse response - handle different response formats
      const analysis = {
        bestMove: data.bestmove || data.best || null,
        evaluation: data.evaluation || data.score || null,
        mate: data.mate || null,
        depth: data.depth || depth,
        score: parseStockfishScore(data)
      };
      
      console.log('Parsed analysis:', analysis);
      resolve(analysis);
    })
    .catch(error => {
      console.error('Stockfish analysis error:', error);
      reject(error);
    });
  });
}

/**
 * Parse Stockfish score from API response
 * @param {object} data - Stockfish API response
 * @returns {object} - Parsed score information
 */
function parseStockfishScore(data) {
  // Stockfish returns score in centipawns
  // Positive = white advantage, Negative = black advantage
  
  if (data.mate) {
    return {
      type: 'mate',
      moves: data.mate
    };
  }
  
  if (data.evaluation !== undefined) {
    return {
      type: 'cp', // centipawns
      value: data.evaluation,
      eval: (data.evaluation / 100).toFixed(2) // Convert to pawns
    };
  }
  
  return null;
}

/**
 * Get best move recommendation from current game
 * @param {string} username - Lichess username
 * @param {number} depth - Search depth (shallow = 5-6)
 * @returns {Promise} - Best move analysis
 */
function getBestMoveForCurrentGame(username, depth = 6) {
  return new Promise(async (resolve, reject) => {
    try {
      // Step 1: Fetch current game
      const gameData = await fetchCurrentGameState(username);
      console.log('Fetched current game');
      
      // Step 2: Extract FEN from game
      const fen = extractFENFromGame(gameData);
      if (!fen) {
        // If we can't extract FEN, try using the game data directly
        reject(new Error('Could not extract position from game'));
        return;
      }
      console.log('Extracted FEN:', fen);
      
      // Step 3: Analyze with Stockfish
      const analysis = await analyzePositionWithStockfish(fen, depth);
      console.log('Analysis complete');
      
      resolve({
        username: username,
        gameData: gameData,
        fen: fen,
        analysis: analysis,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error in getBestMoveForCurrentGame:', error);
      reject(error);
    }
  });
}

/**
 * Simple position evaluation (shallow depth)
 * Uses minimal depth for quick analysis
 * @param {string} fen - FEN string
 * @returns {Promise} - Quick evaluation
 */
function quickEvaluatePosition(fen) {
  return analyzePositionWithStockfish(fen, 5); // Shallow depth
}

/**
 * Deep analysis of position
 * Uses higher depth for more accurate analysis
 * @param {string} fen - FEN string
 * @returns {Promise} - Detailed evaluation
 */
function deepAnalyzePosition(fen) {
  return analyzePositionWithStockfish(fen, 15); // Deeper analysis
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchCurrentGameState,
    extractFENFromGame,
    analyzePositionWithStockfish,
    getBestMoveForCurrentGame,
    quickEvaluatePosition,
    deepAnalyzePosition,
    parseStockfishScore
  };
}
