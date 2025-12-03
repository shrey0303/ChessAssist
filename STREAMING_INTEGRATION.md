# Lichess Stream API + Stockfish Integration Guide

## Overview

The `inference.js` module provides real-time chess game monitoring using Lichess's streaming API combined with Stockfish analysis. This creates a seamless experience where:

1. **Event Stream**: Monitors all incoming events (game starts, challenges, etc.)
2. **Board Streams**: Per-game real-time updates (moves, clocks, status)
3. **Stockfish Analysis**: Rate-limited position analysis on each move
4. **UI Updates**: Results sent to popup via message passing

## Architecture

```
┌─────────────────────┐
│   Lichess Event     │
│   Stream API        │ ← Global stream (one per token)
└──────────┬──────────┘
           │
           ├─ gameStart/gameFinish
           │
           ↓
┌─────────────────────────┐
│  Per-Game Board Stream  │
│  (one per active game)  │ ← Real-time FEN updates
└──────────┬──────────────┘
           │
           ├─ gameFull (initial)
           ├─ gameState (moves)
           ├─ chatLine
           └─ opponentGone
           │
           ↓
┌─────────────────────────┐
│   Stockfish Analysis    │
│   (rate-limited @800ms) │ ← FEN → Best move + evaluation
└──────────┬──────────────┘
           │
           ↓
┌──────────────────────────┐
│  chrome.runtime.sendMessage  │
│  → Popup UI Updates      │
└──────────────────────────┘
```

## Required Setup

### 1. Lichess Token

The extension requires a Lichess personal API token with streaming scope.

**Get your token:**
1. Go to https://lichess.org/account/oauth/token
2. Create a new token
3. Grant at least: `challenge:read`, `stream:play-bot` (or `stream:game` for spectating)
4. Copy the token

**Set the token:**

```javascript
// In popup.js or your UI:
chrome.storage.local.set({ 
  lichess_token: 'YOUR_TOKEN_HERE' 
}, () => {
  console.log('Token stored. inference.js will initialize automatically.');
});
```

### 2. Chess.js Library

The module uses Chess.js for move validation and FEN generation. It's loaded dynamically but must be available:

```html
<!-- In popup.html or other scripts -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
```

Or via `chess-loader.js`:
```javascript
// chess-loader.js already handles this
// Just ensure it's loaded before inference.js
```

## API Reference

### Initialization

```javascript
// Automatic: inference.js initializes when service worker starts
// It checks chrome.storage.local for 'lichess_token'
initializeInference();
```

### Message API

#### 1. Set Token

```javascript
chrome.runtime.sendMessage({
  action: 'setLichessToken',
  token: 'lichess_xxxxxxxxxxxx'
}, (response) => {
  console.log(response); // { status: 'ok' }
});
```

#### 2. Start/Stop Monitoring

```javascript
// Start monitoring (resume event stream)
chrome.runtime.sendMessage({
  action: 'startMonitoring'
}, (response) => {
  console.log(response); // { status: 'monitoring' }
});

// Stop monitoring (close all streams)
chrome.runtime.sendMessage({
  action: 'stopMonitoring'
}, (response) => {
  console.log(response); // { status: 'stopped' }
});
```

#### 3. Get Current Game State

```javascript
chrome.runtime.sendMessage({
  action: 'getGameState',
  gameId: 'BEOucQJo'
}, (response) => {
  console.log(response); // { gameId, fen, moves, status }
});
```

### Incoming Messages (from Service Worker)

Listen for these messages in your popup:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'lichessEvent') {
    // Any event not handled (challenges, tournament updates, etc.)
    console.log('Lichess event:', message.payload);
  }
  
  if (message.type === 'gameFull') {
    // Game started with full initial state
    const { gameId, payload } = message;
    console.log('Game started:', gameId, payload);
    // payload.white, payload.black, payload.initialFen, payload.state
  }
  
  if (message.type === 'gameState') {
    // Move update or clock tick
    const { gameId, payload } = message;
    console.log('Game state:', gameId, payload);
    // payload.moves, payload.wtime, payload.btime, payload.status
  }
  
  if (message.type === 'analysis') {
    // Stockfish analysis result
    const { gameId, bestMove, evaluation, fen, moveCount } = message;
    console.log(`Best move: ${bestMove}, Eval: ${evaluation}`);
    console.log(`Move ${moveCount}: ${bestMove}`);
  }
  
  if (message.type === 'streamClosed') {
    // Game stream ended
    const { gameId } = message;
    console.log('Game stream closed:', gameId);
  }
  
  if (message.type === 'chat') {
    // Chat message in game
    const { gameId, payload } = message;
    console.log('Chat:', payload.text);
  }
  
  if (message.type === 'opponentGone') {
    // Opponent disconnected/reconnected
    const { gameId, payload } = message;
    console.log('Opponent gone:', payload.gone);
  }
});
```

## Example: Complete Integration

### popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
  <h1>ChessAssist</h1>
  
  <div id="authSection">
    <input type="text" id="tokenInput" placeholder="Paste Lichess token...">
    <button id="setTokenBtn">Set Token</button>
  </div>
  
  <div id="monitoringSection" style="display: none;">
    <button id="startMonitorBtn">Start Monitoring</button>
    <button id="stopMonitorBtn">Stop Monitoring</button>
  </div>
  
  <div id="analysisSection">
    <h2>Current Analysis</h2>
    <div id="gameInfo"></div>
    <div id="bestMoveDisplay"></div>
    <div id="evaluationDisplay"></div>
  </div>
  
  <script src="../js/chess-loader.js"></script>
  <script src="../js/popup.js"></script>
</body>
</html>
```

### popup.js

```javascript
const tokenInput = document.getElementById('tokenInput');
const setTokenBtn = document.getElementById('setTokenBtn');
const startMonitorBtn = document.getElementById('startMonitorBtn');
const stopMonitorBtn = document.getElementById('stopMonitorBtn');
const gameInfo = document.getElementById('gameInfo');
const bestMoveDisplay = document.getElementById('bestMoveDisplay');
const evaluationDisplay = document.getElementById('evaluationDisplay');

// Set token
setTokenBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) {
    alert('Please paste a token');
    return;
  }
  
  chrome.runtime.sendMessage({
    action: 'setLichessToken',
    token: token
  }, (response) => {
    if (response?.status === 'ok') {
      alert('Token set! Monitoring should start automatically.');
      tokenInput.value = '';
      document.getElementById('authSection').style.display = 'none';
      document.getElementById('monitoringSection').style.display = 'block';
    }
  });
});

// Start monitoring
startMonitorBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'startMonitoring'
  }, (response) => {
    console.log('Monitoring started:', response);
  });
});

// Stop monitoring
stopMonitorBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'stopMonitoring'
  }, (response) => {
    console.log('Monitoring stopped:', response);
  });
});

// Listen for incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'gameFull') {
    gameInfo.innerHTML = `
      <strong>${message.payload.white.name}</strong> (${message.payload.white.rating})
      vs
      <strong>${message.payload.black.name}</strong> (${message.payload.black.rating})
      <br>
      ${message.payload.perf.name} • ${message.payload.speed}
    `;
  }
  
  if (message.type === 'analysis') {
    bestMoveDisplay.innerHTML = `<strong>Best Move:</strong> ${message.bestMove}`;
    evaluationDisplay.innerHTML = `
      <strong>Evaluation:</strong> ${message.evaluation || 'N/A'}
      <br>
      <small>Move ${message.moveCount}</small>
    `;
  }
  
  if (message.type === 'streamClosed') {
    gameInfo.innerHTML = 'Game ended';
  }
});

// Load token from storage on startup
chrome.storage.local.get('lichess_token', (res) => {
  if (res.lichess_token) {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('monitoringSection').style.display = 'block';
  }
});
```

## Rate Limiting Details

### Analysis Rate Limit

- **Interval**: 800ms minimum between analyses per game
- **Strategy**: If a move comes in faster, the analysis is scheduled for 800ms after the last analysis
- **Prevents**: Overwhelming Stockfish API or local worker with too many requests

### Backoff Strategy (Event Stream)

- **On Connection Loss**: Exponential backoff (2^n * 1000ms, max 30s)
- **Auto-Reconnect**: Automatic reconnection with increasing delays
- **Prevents**: Hammering server when it's down or rate-limiting user

## Troubleshooting

### "No lichess_token found in storage"

**Fix**: Set the token via:
```javascript
chrome.storage.local.set({ lichess_token: 'YOUR_TOKEN' });
```

### "Unauthorized - invalid or expired token"

**Fix**: Generate a new token at https://lichess.org/account/oauth/token

### "No state found for game XYZ"

**Issue**: Game stream not connected yet
**Fix**: Wait a moment; streams take a second to establish

### Stockfish analysis not appearing

**Check**:
1. Is Chess.js loaded? (check console for "✓ chess.js library loaded")
2. Is Stockfish API responsive? (check network tab)
3. Is rate limiting working? (800ms minimum between analyses)

### Stream connection keeps dropping

**Possible causes**:
1. Token expired
2. Internet connection unstable
3. Lichess server rate limiting

**Fix**: Automatic reconnection with backoff is in place. Check console logs for specific errors.

## Performance Considerations

1. **Memory**: Each open game keeps a Chess.js instance + reader in memory
2. **API Calls**: ~1-2 Stockfish API calls per second per game (rate-limited)
3. **CPU**: Minimal; Chess.js move validation is very fast
4. **Network**: Streaming endpoints use persistent connections (efficient)

## Next Steps

1. **Set your Lichess token** in storage
2. **Start a game** on lichess.org
3. **Open the extension popup** and monitor in real-time
4. **Check console** for detailed logs with `[Inference]` prefix
5. **Verify Stockfish** suggestions appear in UI

## Code Organization

```
js/
├── inference.js      ← Lichess streams + Stockfish analysis (this file)
├── background.js     ← Service worker + message router
├── popup.js          ← UI logic
├── chess-loader.js   ← Chess.js CDN loader
└── stockfish.js      ← Alternative Stockfish API wrapper (if using online API)
```

## References

- [Lichess API - Stream Events](https://lichess.org/api#tag/Stream/operation/stream)
- [Lichess API - Board Game Stream](https://lichess.org/api#tag/Board/operation/streamGameById)
- [Chess.js Documentation](https://github.com/jhlywa/chess.js)
- [Stockfish Online API](https://stockfish.online/)

---

**Last Updated**: December 3, 2025
