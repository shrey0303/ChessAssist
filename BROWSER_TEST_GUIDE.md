# ChessAssist Browser Test Guide

## Overview

The `browser-test.html` file allows you to test the entire Lichess streaming integration **directly in your browser without installing the extension**. This test includes the complete workflow: token generation → storage → streaming → analysis.

## 📋 What's Tested

- ✅ **OAuth Token Generation** - Get a token from Lichess.org
- ✅ **Token Storage** - Store token securely in browser localStorage
- ✅ **Token Verification** - Verify your token works with Lichess API
- ✅ **Event Stream** - Connect to `/api/stream/event` for live game updates
- ✅ **Board Stream** - Connect to specific game board stream for move-by-move updates
- ✅ **Stockfish Analysis** - Send FEN positions for real-time chess engine analysis
- ✅ **Rate Limiting** - Verify analysis is rate-limited to prevent API throttling
- ✅ **Full Integration** - Complete workflow test combining all components

## 🚀 Quick Start

### Step 1: Generate Your Token

1. Open `browser-test.html` in your web browser
2. Click the **"Generate Token on Lichess.org"** button
3. You'll be taken to Lichess OAuth page (or asked to log in first)
4. Click **"Approve"** to grant ChessAssist permission
5. You'll see a token like: `lichess_xxxxxxxxxxxxxxxxxxxx`

### Step 2: Store the Token

1. Copy the token from Lichess
2. Paste it into the **"Paste your Lichess token here"** field
3. Click **"Store Token Locally"** button
4. You should see a success message and token status showing "✓ Stored & Ready"

The token is now saved in your browser's local storage and will persist across page reloads.

### Step 3: Verify Token Works

1. Click the **"✓ Verify Token Works"** button
2. The test will connect to Lichess API and show:
   - Your username
   - Your account ID
   - When you joined Lichess

This confirms your token is valid and has proper permissions.

## 🔌 Testing Streaming Connections

### Event Stream Test

The event stream listens to **all** your games in real-time.

1. In the left panel, click **"Start Event Stream"**
2. The test will connect to `https://lichess.org/api/stream/event`
3. **Keep-alive signals** will appear every few seconds (normal)
4. **Start a game on Lichess.org** in another browser tab
5. You should see a `gameStart` event in the test page
6. Click **"Stop Event Stream"** when done

### Board Stream Test

The board stream watches a **specific game** in real-time as moves are played.

1. Start a game on Lichess.org (or find a game ID)
2. In the right panel under "Board Stream", enter the game ID (e.g., `abc123def`)
3. Click **"Connect to Board Stream"**
4. You should see:
   - `gameFull` event with player names
   - Initial position from game
5. **Make a move in the game** on Lichess.org
6. You should see:
   - Updated FEN position
   - Move counter increasing
   - Analysis with best move and evaluation
7. Click **"Stop Board Stream"** when done

## 🧠 Testing Stockfish Analysis

The Stockfish Online API provides instant chess engine analysis.

### Manual Analysis

1. In the "Stockfish Analysis" panel, you can:
   - Enter any FEN position
   - Set analysis depth (1-20, higher = deeper but slower)
   - Click **"Analyze"** to get best move and evaluation
   - See metrics like depth, nodes per second, etc.

### Rate Limiting Test

1. Click **"Test Rate Limiting"**
2. The test will make 5 rapid analysis calls
3. You'll see the 800ms minimum interval enforced between requests
4. This demonstrates the rate limiting strategy to prevent API abuse

## 📊 Full Integration Test

This runs a complete workflow test:

1. Click **"Run Full Integration Test"** button
2. The test will:
   - ✓ Verify token is stored
   - ✓ Test Lichess API connection
   - ✓ Test Stockfish Online API
   - ✓ Report all systems ready

If all tests pass, your setup is ready to use!

## 🔧 Understanding the Output

Each test shows timestamps and status indicators:

- **✓ (Green)** - Success
- **✗ (Red)** - Error
- **→ (White)** - Information
- **ℹ (Blue)** - Additional details

Messages include:
- Operation being performed
- Results returned
- Any errors or issues
- Performance metrics (timing, etc.)

## 🔐 Security Notes

- **Token Storage**: Your token is stored in browser localStorage, which is:
  - Not encrypted (don't use on shared computers)
  - Accessible to any website in your browser
  - Cleared when you click "Clear Token"
- **Token Scope**: This token can only:
  - Read your games via streaming
  - Read basic account info
  - Cannot make moves or modify settings
- **Testing**: This test page makes real API calls to Lichess.org and Stockfish Online

## 🎯 Typical Workflow

```
1. Generate Token (Lichess OAuth)
   ↓
2. Store Token (save to localStorage)
   ↓
3. Verify Token (test Lichess API)
   ↓
4. Connect Event Stream (listen for all games)
   ↓
5. Start Game on Lichess
   ↓
6. See gameStart event
   ↓
7. Connect Board Stream (watch game)
   ↓
8. See gameFull + moves with analysis
   ↓
9. Move triggers Stockfish analysis
   ↓
10. See best move + evaluation in real-time
```

## 🐛 Troubleshooting

### "Token invalid (401 Unauthorized)"
- Token may have expired or been revoked
- Try generating a new token

### Event Stream shows no events
- You may not have the token stored
- Try clicking "Verify Token Works" first
- Make sure you're logged into Lichess in another tab

### Board Stream says "Game not found"
- Game ID might be wrong
- Game may have ended (stream can't start for finished games)
- Try a game ID from an active game

### No analysis appears
- Stockfish Online might be temporarily slow
- Try analyzing a simple starting position first
- Check that depth isn't too high (causes timeout)

### "Connection error"
- Network issue or browser is offline
- Try refreshing the page
- Check if Lichess.org is accessible

## 🔄 How It Works (Technical)

### Token Flow
```
User → Lichess OAuth → Token → Browser localStorage → API Requests
```

### Event Stream
```
Lichess Event Stream ←→ Browser ←→ NDJSON Parser ←→ Test Display
```

### Board Stream
```
Lichess Board Stream ←→ Browser ←→ NDJSON Parser ←→ Chess.js ←→ FEN
                                                          ↓
                                                    Stockfish Analysis
```

### Rate Limiting
```
New Move Detected → Check Last Analysis Time
                  → If < 800ms ago: Wait & Queue
                  → If > 800ms ago: Send to Stockfish immediately
```

## 📚 Related Documentation

- `README.md` - Main extension overview
- `STREAMING_INTEGRATION.md` - Detailed streaming architecture
- `QUICKSTART.md` - Getting started with the extension
- `inference.js` - Core streaming + analysis code (in extension)
- `browser-test.html` - This test page (standalone, no installation needed)

## 🎓 Learning Resources

- **Lichess API**: https://lichess.org/api
- **Lichess Streaming**: https://lichess.org/api#tag/Board/operation/apiStreamEvent
- **Stockfish Online**: https://stockfish.online/api/s/v2
- **Chess.js**: https://github.com/jhlywa/chess.js

---

**Questions?** Check the console (F12) for detailed error messages. The test page logs everything for debugging!
