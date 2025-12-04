const Chess = typeof Chess !== 'undefined' ? Chess : null;

// Lichess API endpoints
const LICHESS_API = {
  EVENT_STREAM: 'https://lichess.org/api/stream/event',
  BOARD_STREAM: 'https://lichess.org/api/board/game/stream/',
};

// State management
let lichessToken = null;
let eventStreamController = null;
let eventStreamReader = null;
let openBoardStreams = new Map(); 

// Analysis rate-limiting per game
const ANALYZE_INTERVAL = 800; // ms between analyses
const lastAnalyzeAt = new Map(); // gameId -> timestamp

// Stockfish worker reference (to be initialized)
let stockfishWorker = null;

// ============================================================================
// INITIALIZATION & TOKEN LOADING
// ============================================================================

/**
 * Initialize the inference module
 * Loads token from storage and starts event stream if available
 */
function initializeInference() {
  console.log('[Inference] Initializing...');
  
  chrome.storage.local.get('lichess_token', (res) => {
    if (res.lichess_token) {
      lichessToken = res.lichess_token;
      console.log('[Inference] Token loaded from storage');
      openEventStreamWithBackoff();
    } else {
      console.warn('[Inference] No lichess_token found in storage');
      console.warn('[Inference] Please set token via: chrome.storage.local.set({lichess_token: "YOUR_TOKEN"})');
    }
  });
}

/**
 * Listener for storage changes (token updates)
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.lichess_token) {
    const newToken = changes.lichess_token.newValue;
    if (newToken && newToken !== lichessToken) {
      console.log('[Inference] Token updated in storage');
      lichessToken = newToken;
      closeEventStream();
      openEventStreamWithBackoff();
    }
  }
});

// ============================================================================
// EVENT STREAM MANAGEMENT (GLOBAL INCOMING EVENTS)
// ============================================================================

/**
 * Open event stream with exponential backoff on failure
 */
let backoffAttempt = 0;

async function openEventStreamWithBackoff() {
  try {
    await openEventStream();
    backoffAttempt = 0;
  } catch (err) {
    console.error('[Inference] Event stream error:', err.message);
    backoffAttempt++;
    const waitTime = Math.min(30000, Math.pow(2, backoffAttempt) * 1000);
    console.log(`[Inference] Reconnecting event stream in ${waitTime}ms (attempt ${backoffAttempt})`);
    await sleep(waitTime);
    openEventStreamWithBackoff();
  }
}

/**
 * Open the global incoming-events stream
 * One persistent connection for all incoming events (gameStart, gameFinish, challenge, etc.)
 */
async function openEventStream() {
  if (!lichessToken) {
    throw new Error('No Lichess token available');
  }

  if (eventStreamController) {
    console.log('[Inference] Event stream already open');
    return;
  }

  console.log('[Inference] Opening event stream...');

  try {
    const res = await fetch(LICHESS_API.EVENT_STREAM, {
      headers: {
        'Authorization': `Bearer ${lichessToken}`,
        'Accept': 'application/x-ndjson',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Unauthorized - invalid or expired token');
      }
      if (res.status === 429) {
        throw new Error('Rate limited by Lichess API');
      }
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    eventStreamController = new AbortController();
    eventStreamReader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    console.log('[Inference] Event stream connected');

    while (true) {
      const { done, value } = await eventStreamReader.read();
      if (done) {
        console.log('[Inference] Event stream closed by server');
        eventStreamController = null;
        eventStreamReader = null;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue; // Keep-alive ping

        try {
          const event = JSON.parse(line);
          handleEventStreamLine(event);
        } catch (e) {
          console.error('[Inference] Failed to parse event JSON:', e.message, 'Line:', line);
        }
      }
    }

    throw new Error('Event stream connection closed');
  } catch (err) {
    eventStreamController = null;
    eventStreamReader = null;
    throw err;
  }
}

/**
 * Close the event stream manually
 */
function closeEventStream() {
  if (eventStreamReader) {
    eventStreamReader.cancel().catch(e => console.warn('[Inference] Error cancelling event stream:', e));
    eventStreamReader = null;
  }
  if (eventStreamController) {
    eventStreamController = null;
  }
  console.log('[Inference] Event stream closed');
}

/**
 * Handle incoming event from the event stream
 * Types: gameStart, gameFinish, challenge, challengeCanceled, etc.
 */
function handleEventStreamLine(event) {
  if (!event || !event.type) return;

  console.log(`[Inference] Event: ${event.type}`);

  if (event.type === 'gameStart' || event.type === 'gameFull') {
    const gameId = event.game?.id;
    if (gameId) {
      console.log(`[Inference] Game started: ${gameId}`);
      if (!openBoardStreams.has(gameId)) {
        openBoardStream(gameId);
      }
    }
  } else if (event.type === 'gameFinish') {
    const gameId = event.game?.id;
    if (gameId) {
      console.log(`[Inference] Game finished: ${gameId}`);
      closeBoardStream(gameId);
    }
  } else {
    // Forward other events to UI (challenge, challengeCanceled, etc.)
    chrome.runtime.sendMessage({
      type: 'lichessEvent',
      payload: event,
    }).catch(() => {
      // No listener in popup at the moment
    });
  }
}

// ============================================================================
// BOARD STREAM MANAGEMENT (PER-GAME)
// ============================================================================

/**
 * Open a per-game board stream
 * Handles real-time game state updates (moves, clocks, status)
 */
async function openBoardStream(gameId) {
  if (!lichessToken) {
    console.warn('[Inference] No token available for board stream');
    return;
  }

  const url = LICHESS_API.BOARD_STREAM + gameId;

  try {
    console.log(`[Inference] Opening board stream for game: ${gameId}`);

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${lichessToken}`,
        'Accept': 'application/x-ndjson',
      },
    });

    if (!res.ok) {
      console.warn(`[Inference] Board stream HTTP ${res.status} for ${gameId}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Initialize chess instance for this game
    const chess = Chess ? new Chess() : null;
    let lastMovesCount = 0;

    openBoardStreams.set(gameId, { reader, chess, lastMovesCount });

    console.log(`[Inference] Board stream connected for ${gameId}`);

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(`[Inference] Board stream closed for ${gameId}`);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const boardEvent = JSON.parse(line);
          await handleBoardEvent(gameId, boardEvent);
        } catch (e) {
          console.error(`[Inference] Failed to parse board event for ${gameId}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error(`[Inference] Board stream error for ${gameId}:`, err.message);
  } finally {
    closeBoardStream(gameId);
  }
}

/**
 * Close a board stream and clean up
 */
function closeBoardStream(gameId) {
  const state = openBoardStreams.get(gameId);
  if (!state) return;

  if (state.reader) {
    state.reader.cancel().catch(e => console.warn(`[Inference] Error cancelling reader for ${gameId}:`, e));
  }

  openBoardStreams.delete(gameId);

  // Notify UI that stream is closed
  chrome.runtime.sendMessage({
    type: 'streamClosed',
    gameId: gameId,
  }).catch(() => {});

  console.log(`[Inference] Board stream cleaned up for ${gameId}`);
}

/**
 * Handle board events (gameFull, gameState, chatLine, opponentGone)
 */
async function handleBoardEvent(gameId, boardEvent) {
  if (!boardEvent || !boardEvent.type) return;

  const state = openBoardStreams.get(gameId);
  if (!state) {
    console.warn(`[Inference] No state found for game ${gameId}`);
    return;
  }

  const { chess } = state;

  if (boardEvent.type === 'gameFull') {
    // Initial game setup
    console.log(`[Inference] gameFull event for ${gameId}`);

    if (chess) {
      // Load initial position
      if (boardEvent.initialFen && boardEvent.initialFen !== 'startpos') {
        chess.load(boardEvent.initialFen);
      } else {
        chess.reset();
      }

      // Apply moves from state
      if (boardEvent.state && boardEvent.state.moves) {
        const movesStr = boardEvent.state.moves.trim();
        const moves = movesStr ? movesStr.split(/\s+/) : [];
        moves.forEach(move => {
          try {
            chess.move(move, { sloppy: true });
          } catch (e) {
            console.warn(`[Inference] Failed to apply move "${move}" in ${gameId}:`, e.message);
          }
        });
        state.lastMovesCount = moves.length;
      }

      // Send FEN to Stockfish
      sendFenToStockfish(gameId, chess.fen(), boardEvent);
    }

    // Notify UI of game start
    chrome.runtime.sendMessage({
      type: 'gameFull',
      gameId: gameId,
      payload: boardEvent,
    }).catch(() => {});
  } else if (boardEvent.type === 'gameState') {
    // Ongoing game state update
    if (chess && boardEvent.moves) {
      const movesStr = boardEvent.moves.trim();
      const moves = movesStr ? movesStr.split(/\s+/) : [];

      // Apply only new moves
      if (moves.length > state.lastMovesCount) {
        for (let i = state.lastMovesCount; i < moves.length; i++) {
          try {
            chess.move(moves[i], { sloppy: true });
          } catch (e) {
            console.warn(`[Inference] Failed to apply move "${moves[i]}" in ${gameId}:`, e.message);
          }
        }
        state.lastMovesCount = moves.length;

        // Send updated FEN to Stockfish
        sendFenToStockfish(gameId, chess.fen(), boardEvent);
      }
    }

    // Notify UI of game state
    chrome.runtime.sendMessage({
      type: 'gameState',
      gameId: gameId,
      payload: {
        moves: boardEvent.moves,
        wtime: boardEvent.wtime,
        btime: boardEvent.btime,
        status: boardEvent.status,
      },
    }).catch(() => {});
  } else if (boardEvent.type === 'chatLine') {
    // Chat message
    chrome.runtime.sendMessage({
      type: 'chat',
      gameId: gameId,
      payload: boardEvent,
    }).catch(() => {});
  } else if (boardEvent.type === 'opponentGone') {
    // Opponent connection status
    chrome.runtime.sendMessage({
      type: 'opponentGone',
      gameId: gameId,
      payload: boardEvent,
    }).catch(() => {});
  }
}

// ============================================================================
// STOCKFISH ANALYSIS
// ============================================================================

/**
 * Send FEN to Stockfish worker for analysis
 * Rate-limited: max one analysis per ANALYZE_INTERVAL ms per game
 */
function sendFenToStockfish(gameId, fen, boardEvent) {
  const now = Date.now();
  const lastAnalysis = lastAnalyzeAt.get(gameId) || 0;
  const timeSinceLastAnalysis = now - lastAnalysis;

  if (timeSinceLastAnalysis < ANALYZE_INTERVAL) {
    // Skip this analysis, but schedule one if not already scheduled
    const timerKey = gameId + ':timer';
    if (!lastAnalyzeAt.has(timerKey)) {
      const delay = ANALYZE_INTERVAL - timeSinceLastAnalysis;
      const timer = setTimeout(() => {
        lastAnalyzeAt.delete(timerKey);
        lastAnalyzeAt.set(gameId, Date.now());
        // Re-fetch the latest FEN at this point (it might have changed)
        // For now, use the FEN we have
        performStockfishAnalysis(gameId, fen, boardEvent);
      }, delay);
      lastAnalyzeAt.set(timerKey, timer);
    }
    return;
  }

  lastAnalyzeAt.set(gameId, now);
  performStockfishAnalysis(gameId, fen, boardEvent);
}

/**
 * Actually perform Stockfish analysis via online API or worker
 * Currently using Stockfish online API (no local worker needed)
 */
async function performStockfishAnalysis(gameId, fen, boardEvent) {
  if (!fen) {
    console.warn(`[Inference] Empty FEN for game ${gameId}`);
    return;
  }

  console.log(`[Inference] Analyzing position for ${gameId}`);

  try {
    // Using Stockfish Online API v2
    const apiUrl = 'https://stockfish.online/api/s/v2.php';
    const params = new URLSearchParams({
      fen: fen,
      depth: 15,
    });

    const res = await fetch(`${apiUrl}?${params}`);

    if (!res.ok) {
      throw new Error(`Stockfish API HTTP ${res.status}`);
    }

    const data = await res.json();

    // Parse response
    const bestMove = data.bestmove || data.best || null;
    const evaluation = data.eval || data.evaluation || null;
    const pv = data.pv || null;

    console.log(`[Inference] Analysis for ${gameId}: best=${bestMove}, eval=${evaluation}`);

    // Notify UI with analysis result
    chrome.runtime.sendMessage({
      type: 'analysis',
      gameId: gameId,
      bestMove: bestMove,
      evaluation: evaluation,
      pv: pv,
      fen: fen,
      moveCount: boardEvent?.moves ? boardEvent.moves.split(/\s+/).length : 0,
    }).catch(() => {});
  } catch (err) {
    console.error(`[Inference] Stockfish analysis error for ${gameId}:`, err.message);
  }
}

// ============================================================================
// MESSAGE HANDLERS (from UI/popup)
// ============================================================================

/**
 * Handle incoming messages from popup/content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Inference] Message received:', request.action);

  if (request.action === 'setLichessToken') {
    const token = request.token;
    chrome.storage.local.set({ lichess_token: token }, () => {
      console.log('[Inference] Token stored and stream initialized');
      sendResponse({ status: 'ok' });
    });
    return true;
  }

  if (request.action === 'getGameState') {
    const gameId = request.gameId;
    const state = openBoardStreams.get(gameId);
    if (state && state.chess) {
      sendResponse({
        gameId: gameId,
        fen: state.chess.fen(),
        moves: state.chess.moves({ verbose: true }),
        status: 'active',
      });
    } else {
      sendResponse({
        gameId: gameId,
        status: 'not_found',
      });
    }
    return true;
  }

  if (request.action === 'startMonitoring') {
    // Resume/ensure event stream is active
    if (!eventStreamController) {
      openEventStreamWithBackoff();
    }
    sendResponse({ status: 'monitoring' });
    return true;
  }

  if (request.action === 'stopMonitoring') {
    // Close all streams
    openBoardStreams.forEach((state, gameId) => {
      closeBoardStream(gameId);
    });
    closeEventStream();
    sendResponse({ status: 'stopped' });
    return true;
  }

  sendResponse({ status: 'unknown_action' });
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// STARTUP
// ============================================================================

// Initialize when service worker starts
console.log('[Inference] Module loaded');
initializeInference();

// Graceful shutdown on extension unload
chrome.runtime.onSuspend.addListener(() => {
  console.log('[Inference] Service worker suspending, closing streams...');
  closeEventStream();
  openBoardStreams.forEach((state, gameId) => {
    closeBoardStream(gameId);
  });
});
