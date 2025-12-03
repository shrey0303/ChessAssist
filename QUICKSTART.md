# ChessAssist - Streaming API Integration Quick Start

## What's New

The extension now uses **Lichess Streaming API** for real-time game monitoring instead of polling. This means:

✅ **Real-time updates** - Instant notifications when moves are made  
✅ **Lower latency** - No polling delays  
✅ **Persistent connection** - One stream per game  
✅ **Rate-limit safe** - Debounced Stockfish analysis (800ms min)  
✅ **Automatic reconnection** - Exponential backoff on connection loss  

## Setup (5 minutes)

### 1. Get Your Lichess Token

1. Go to https://lichess.org/account/oauth/token
2. Create a new token
3. Required scopes: `challenge:read`, `stream:play-bot` (or `stream:game`)
4. Copy the token (starts with `lichess_`)

### 2. Install Extension

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Navigate to `c:\Users\LENOVO\Documents\ChessAssist`
5. Extension installed! 🎉

### 3. Configure Token

1. Click ChessAssist icon in top-right
2. Paste your Lichess token in the input field
3. Click "Set Token & Start Monitoring"
4. You'll see: "Connected to Lichess"

### 4. Play & Monitor

1. Go to https://play.lichess.org/
2. Start a casual or rated game
3. Click ChessAssist popup
4. See real-time analysis:
   - Current move number
   - Best move suggestion
   - Position evaluation
   - Player names & ratings

## How It Works

```
┌─────────────────────────────────────────┐
│ Lichess Event Stream                    │
│ (/api/stream/event)                     │
│ Watches for: gameStart, gameFinish      │
└──────────────┬──────────────────────────┘
               │
               ├─> gameStart
               │
               ↓
┌─────────────────────────────────────────┐
│ Per-Game Board Stream                   │
│ (/api/board/game/stream/{gameId})       │
│ Receives: gameFull, gameState, chatLine │
└──────────────┬──────────────────────────┘
               │
               ├─> New move detected
               │
               ↓
┌─────────────────────────────────────────┐
│ Stockfish Analysis                      │
│ (Rate-limited: 800ms min)               │
│ FEN → Best move + Evaluation            │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ Popup UI Update                         │
│ Show: Best move, Eval, Status           │
└─────────────────────────────────────────┘
```

## File Changes

### New Files
- **`js/inference.js`** - Main streaming integration module (700+ lines)
- **`STREAMING_INTEGRATION.md`** - Complete API documentation

### Modified Files
- **`js/popup.js`** - New token input, message listeners
- **`html/popup.html`** - Token form instead of username prompt
- **`js/background.js`** - Message routing for new actions
- **`manifest.json`** - Added inference.js script

### Legacy Files (still available)
- `js/gamemonitor.js` - Old polling approach (kept for reference)
- `js/stockfish.js` - Direct Stockfish API wrapper (kept for reference)
- `js/gamedata.js` - Game history collection (kept for reference)

## Architecture

**Service Worker (background.js + inference.js):**
- Handles all network requests (no CORS issues)
- Manages Lichess streams (event + board streams)
- Debounces Stockfish analysis
- Routes messages to popup

**Popup (popup.js + popup.html):**
- Token input & storage
- Message listeners for updates
- UI updates from analysis results
- Start/stop monitoring controls

## Console Logs

The extension logs everything with `[Inference]` prefix:

```
[Inference] Module loaded
[Inference] Token loaded from storage
[Inference] Opening event stream...
[Inference] Event stream connected
[Inference] Event: gameStart
[Inference] Game started: BEOucQJo
[Inference] Opening board stream for game: BEOucQJo
[Inference] Board stream connected for BEOucQJo
[Inference] gameFull event for BEOucQJo
[Inference] Analyzing position for BEOucQJo
[Inference] Analysis for BEOucQJo: best=e2e4, eval=35
```

Open DevTools (F12) → Console to see these logs.

## Troubleshooting

### "No lichess_token found in storage"
- Copy-paste your token in popup
- Click "Set Token & Start Monitoring"

### "Unauthorized - invalid or expired token"
- Generate new token at https://lichess.org/account/oauth/token
- Make sure scopes include `stream:play-bot` or `stream:game`

### Analysis not appearing
- Make sure you're playing on lichess.org
- Wait 1-2 seconds for stream to connect
- Check DevTools console for `[Inference]` logs

### Extension not responding
- Reload extension: chrome://extensions → reload button
- Or: Remove and re-add the extension

## Configuration

Edit `inference.js` to adjust:

```javascript
// Line ~310: Analysis rate limiting
const ANALYZE_INTERVAL = 800; // ms between analyses

// Line ~600: Backoff timing (for reconnection)
const waitTime = Math.min(30000, Math.pow(2, backoffAttempt) * 1000);
```

## Limits & Performance

- **Max concurrent games**: Unlimited (memory limited)
- **Analysis depth**: 15 (Stockfish online API)
- **API rate limit**: ~1-2 calls/sec per game (configurable)
- **Memory per game**: ~1-2MB (Chess.js instance + reader buffer)
- **CPU**: Minimal (stream parsing + Chess.js is fast)

## Next Steps

1. ✅ Install extension & set token
2. ✅ Play a game on lichess.org
3. ✅ Monitor real-time analysis in popup
4. ⏳ Optional: Collect game data via gamedata.js for ML training
5. ⏳ Optional: Train your own chess model

## FAQ

**Q: Is my token safe?**  
A: Yes. It's stored locally in `chrome.storage.local` and only sent to lichess.org.

**Q: Does this work offline?**  
A: No, it requires internet connection to Lichess.

**Q: Can I use multiple tokens?**  
A: Currently one token per browser. Each token can be different.

**Q: What if I'm playing blitz?**  
A: Analysis might lag behind moves in very fast games (depth 15 takes ~1-2 seconds).

**Q: Can I use this while spectating?**  
A: Only if you're playing. Spectation requires `stream:game` scope but different API endpoint.

## Support

- Full API documentation: `STREAMING_INTEGRATION.md`
- Check DevTools console (F12) for detailed logs
- Lichess API docs: https://lichess.org/api
- Stockfish Online: https://stockfish.online/

---

**Status**: ✅ Production Ready  
**Last Updated**: December 3, 2025  
**Next Feature**: Multi-game monitoring & game history analysis
