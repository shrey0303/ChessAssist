# ChessAssist Installation & First Run Checklist

## Pre-Installation ✓

- [ ] You have a Lichess account (free at https://lichess.org)
- [ ] You have access to Chrome/Chromium browser
- [ ] You downloaded/cloned the ChessAssist folder to `c:\Users\LENOVO\Documents\ChessAssist`

## Step 1: Generate Lichess Token

1. [ ] Go to https://lichess.org/account/oauth/token
2. [ ] Log in if not already logged in
3. [ ] Click "+ New personal access token"
4. [ ] Name it: `ChessAssist Extension`
5. [ ] **Check these scopes:**
   - [ ] `challenge:read` 
   - [ ] `stream:play-bot` (or `stream:game` if you only want to spectate)
6. [ ] Click "Create"
7. [ ] **Copy the token** (looks like: `lichess_xxx...xxx`)
8. [ ] Save it somewhere safe (you'll need it in 1 minute)
9. [ ] ✅ **Token copied**

## Step 2: Install Extension in Chrome

1. [ ] Open Chrome/Chromium browser
2. [ ] Type `chrome://extensions` in address bar
3. [ ] Press Enter
4. [ ] Look for "Developer mode" toggle in top-right corner
5. [ ] [ ] Click to enable "Developer mode" (should turn blue)
6. [ ] Click "Load unpacked" button that appears
7. [ ] Navigate to: `c:\Users\LENOVO\Documents\ChessAssist`
8. [ ] Click "Select Folder"
9. [ ] ✅ **Extension loaded** (you should see ChessAssist card on extensions page)

## Step 3: Verify Installation

1. [ ] In top-right of Chrome, look for icon bar
2. [ ] Click the icon that looks like `♞` (chess knight) or puzzle icon
3. [ ] A popup should open (400x600px)
4. [ ] You should see:
   - [ ] "ChessAssist" title
   - [ ] "Real-time Chess Analysis with Stockfish" subtitle
   - [ ] Token input field (placeholder: `lichess_xxxxxxxxxxxxxxxxxxxx`)
   - [ ] "Get Lichess Token" button
   - [ ] "Set Token & Start Monitoring" button
5. [ ] ✅ **Extension UI loaded correctly**

## Step 4: Configure Token

1. [ ] **Go back to** the Lichess token page (or find your saved token)
2. [ ] [ ] Copy the token (should start with `lichess_`)
3. [ ] [ ] Back in the ChessAssist popup:
   - [ ] Click on the token input field
   - [ ] Right-click → Paste (or Ctrl+V)
   - [ ] You should see dots (●●●●●) showing password is masked
4. [ ] [ ] Click "Set Token & Start Monitoring" button
5. [ ] [ ] Wait 1-2 seconds
6. [ ] You should see:
   - [ ] "Connected to Lichess" message
   - [ ] "▶ Start Monitoring" button
   - [ ] "⏹ Stop Monitoring" button  
   - [ ] "Logout" button
7. [ ] ✅ **Token configured successfully**

## Step 5: Check Console (Optional but Helpful)

1. [ ] Right-click anywhere on the popup
2. [ ] Click "Inspect" or press F12
3. [ ] Go to "Console" tab
4. [ ] You should see logs like:
   ```
   [Inference] Module loaded
   [Inference] Token loaded from storage
   [Inference] Opening event stream...
   [Inference] Event stream connected
   ```
5. [ ] ✅ **Service worker is running**

## Step 6: First Live Test

1. [ ] [ ] **Open new tab** and go to https://play.lichess.org
2. [ ] [ ] **Start a game:**
   - For beginners: Click "Create a game" → "Casual" → "Play as White" (or Black)
   - Or: Accept someone else's challenge
3. [ ] [ ] Game board loads
4. [ ] [ ] **Go back to ChessAssist popup** (click the ♞ icon)
5. [ ] [ ] Wait 1-2 seconds...
6. [ ] You should see appearing:
   - [ ] Game info: `White Name (rating) vs Black Name (rating)`
   - [ ] "Move 1" status
   - [ ] Empty "Best Move" box (analyzing...)
   - [ ] Empty "Evaluation" box
7. [ ] ✅ **Extension detected the game**

## Step 7: Make Your First Move

1. [ ] [ ] Go back to the **Lichess game tab**
2. [ ] [ ] Make a move (click a piece, click destination square)
3. [ ] [ ] Go back to **ChessAssist popup**
4. [ ] [ ] Wait 1-2 seconds for analysis...
5. [ ] You should see:
   - [ ] **Best Move:** `e2e4` (or whatever is best)
   - [ ] **Evaluation:** `+35` or something similar
   - [ ] Status updated: `Move 1 • Status: playing`
6. [ ] ✅ **Real-time analysis working!**

## Step 8: Play a Few More Moves

1. [ ] [ ] Go back to Lichess game tab
2. [ ] [ ] Make another move
3. [ ] [ ] Return to ChessAssist popup
4. [ ] [ ] You should see:
   - [ ] Status updated: `Move 2`
   - [ ] NEW best move suggestion
   - [ ] NEW evaluation
5. [ ] [ ] Make 1-2 more moves and check popup each time
6. [ ] ✅ **Real-time monitoring confirmed**

## Step 9: Game Ends

1. [ ] [ ] Play until game ends (checkmate, resignation, stalemate, etc.)
2. [ ] [ ] In ChessAssist popup, you should see:
   - [ ] Game info updated with final status
   - [ ] Status message: "✓ Game ended"
   - [ ] Stream closes automatically
3. [ ] ✅ **Automatic stream cleanup working**

## Troubleshooting During First Run

### Popup shows: "Real-time Chess Analysis" but no input field
- [ ] Extension might be loading
- [ ] **Fix:** Reload popup (click ♞ icon again)

### Token input field is there, but button doesn't work
- [ ] Token might be invalid or incomplete
- [ ] **Fix:** Copy token again from https://lichess.org/account/oauth/token
- [ ] Make sure token starts with `lichess_`

### After setting token, still shows login screen
- [ ] Permission issues
- [ ] **Fix:** 
  1. Go to `chrome://extensions`
  2. Find ChessAssist
  3. Click "Details"
  4. Under "Permissions", check all are granted
  5. Reload extension (reload button on ChessAssist card)

### Game doesn't appear in popup
- [ ] Extension is not monitoring yet
- [ ] **Fix:** Click "▶ Start Monitoring" button first
- [ ] Make sure game is on **play.lichess.org** (not mobile)
- [ ] Wait 2-3 seconds before expecting results

### Best Move shows "Analyzing..." but never updates
- [ ] Stockfish API might be slow or unreachable
- [ ] **Fix:**
  1. Open DevTools (F12) → Console
  2. Look for errors about "stockfish.online"
  3. Try making another move (might just be slow first time)
  4. If persistent: Check internet connection

### ChessAssist icon not visible
- [ ] Extension might not have installed
- [ ] **Fix:**
  1. Go to `chrome://extensions`
  2. Check ChessAssist card is there
  3. Make sure it says "Enabled"
  4. Try clicking the puzzle icon or extension menu (top-right)

## Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| "No token" or "Unauthorized" | Re-generate token from lichess.org, make sure scopes include streaming |
| Analysis is slow | Normal - depth 15 analysis takes 1-2 seconds |
| Analysis doesn't update | Wait longer, or make a bigger/different move |
| Stream closes randomly | Network issue - extension will auto-reconnect |
| Extension crashes | Reload: chrome://extensions → reload button |
| Game not detected | Make sure game is on play.lichess.org (not other Lichess pages) |

## Success Indicators ✅

You're all set when you see:

1. ✅ Extension icon visible in Chrome
2. ✅ Popup opens and shows token input
3. ✅ Token can be pasted and set
4. ✅ Popup shows "Connected to Lichess"
5. ✅ Console shows `[Inference] Event stream connected`
6. ✅ When you play a game, popup shows player names
7. ✅ When you make a move, popup shows best move suggestion
8. ✅ Suggestions update each time you move
9. ✅ Game info updates automatically
10. ✅ No errors in console

## Next Steps

Once working:

1. **Monitor a full game** - Play a complete game and watch suggestions improve
2. **Try different game types:**
   - [ ] Blitz (3+0 or 3+2)
   - [ ] Rapid (10+0 or 15+10)
   - [ ] Classical (30+0 or longer)
3. **Check console logs** - Understanding logs helps with troubleshooting
4. **Collect game data** (Optional) - Use `gamedata.js` to fetch past games for analysis
5. **Read full documentation** - See STREAMING_INTEGRATION.md for advanced features

## Performance Notes

- **Recommended:** Rapid games (15+ min) for time to think
- **Challenging:** Blitz games (3+0) due to analysis latency
- **Analysis depth:** Depth 15 = ~1-2 second response time
- **Network:** Requires stable internet connection

## Advanced Setup (Optional)

### Monitor Multiple Games
- Keep ChessAssist popup open while playing multiple games
- Extension tracks all active games simultaneously

### Configure Analysis Depth
- Edit `js/inference.js` line ~370 to change depth (max 20)

### Local Stockfish (Future)
- Currently uses online API
- Future version will support local Stockfish worker

## Support

If stuck:

1. **Check DevTools Console** (F12 → Console)
   - Look for `[Inference]` logs
   - Check for errors
   
2. **Read documentation:**
   - QUICKSTART.md - Quick reference
   - STREAMING_INTEGRATION.md - Complete API docs
   - IMPLEMENTATION_SUMMARY.md - Technical details

3. **Verify installation:**
   - Extension at `chrome://extensions` (enabled?)
   - Token valid (try generating new one)
   - Internet connection stable

4. **Reload extension:**
   - Go to `chrome://extensions`
   - Click reload on ChessAssist card
   - Try again

## Completion

Once you've completed all steps and see analysis working in real-time:

**🎉 Congratulations! ChessAssist is ready to help you improve! 🎉**

---

**Document Version:** 1.0  
**Created:** December 3, 2025  
**For:** ChessAssist Chrome Extension v1.0
