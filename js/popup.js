// Popup script for ChessAssist
console.log('[Popup] Loaded');

const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const userGreeting = document.getElementById('userGreeting');
const loadingSpinner = document.getElementById('loadingSpinner');

// Check if user is already authenticated
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  setupMessageListeners();
});

/**
 * Check if user has a token stored
 */
function checkAuthStatus() {
  chrome.storage.local.get('lichess_token', (data) => {
    if (data.lichess_token) {
      userGreeting.textContent = 'Monitoring active...';
      showMainSection();
    } else {
      showLoginSection();
    }
  });
}

function showLoginSection() {
  if (loginSection) loginSection.style.display = 'block';
  if (mainSection) mainSection.style.display = 'none';
}

function showMainSection() {
  if (loginSection) loginSection.style.display = 'none';
  if (mainSection) mainSection.style.display = 'block';
}

function showLoading(show) {
  if (loadingSpinner) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
  }
}

// ============================================================================
// BUTTON HANDLERS
// ============================================================================

// Set Lichess Token
const setTokenBtn = document.getElementById('setTokenBtn');
if (setTokenBtn) {
  setTokenBtn.addEventListener('click', () => {
    const tokenInput = document.getElementById('tokenInput');
    const token = (tokenInput?.value || '').trim();
    
    if (!token) {
      alert('Please paste your Lichess token');
      return;
    }
    
    showLoading(true);
    console.log('[Popup] Setting Lichess token...');
    
    chrome.runtime.sendMessage({
      action: 'setLichessToken',
      token: token
    }, (response) => {
      showLoading(false);
      if (response?.status === 'ok' || response?.status === 'token_set') {
        alert('Token set! Monitoring will start automatically.');
        if (tokenInput) tokenInput.value = '';
        showMainSection();
        // Notify inference module to start monitoring
        chrome.runtime.sendMessage({ action: 'startMonitoring' }).catch(() => {});
      } else {
        alert('Failed to set token');
      }
    });
  });
}

// Start Monitoring
const startMonitorBtn = document.getElementById('startMonitorBtn');
if (startMonitorBtn) {
  startMonitorBtn.addEventListener('click', () => {
    console.log('[Popup] Starting stream monitoring...');
    chrome.runtime.sendMessage({
      action: 'startMonitoring'
    }, (response) => {
      console.log('[Popup] Monitoring started:', response);
      alert('Monitoring active. Play a game on lichess.org!');
    });
  });
}

// Stop Monitoring
const stopMonitorBtn = document.getElementById('stopMonitorBtn');
if (stopMonitorBtn) {
  stopMonitorBtn.addEventListener('click', () => {
    console.log('[Popup] Stopping stream monitoring...');
    chrome.runtime.sendMessage({
      action: 'stopMonitoring'
    }, (response) => {
      console.log('[Popup] Monitoring stopped:', response);
    });
  });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove('lichess_token', () => {
      chrome.runtime.sendMessage({ action: 'stopMonitoring' }).catch(() => {});
      showLoginSection();
      const tokenInput = document.getElementById('tokenInput');
      if (tokenInput) tokenInput.value = '';
    });
  });
}

// ============================================================================
// MESSAGE LISTENERS (from inference.js in background)
// ============================================================================

/**
 * Set up listeners for messages from the service worker (inference module)
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Popup] Message received:', message.type);
    
    const gameInfo = document.getElementById('gameInfo');
    const bestMoveDisplay = document.getElementById('bestMoveDisplay');
    const evaluationDisplay = document.getElementById('evaluationDisplay');
    const statusDisplay = document.getElementById('statusDisplay');
    const analysisResults = document.getElementById('analysisResults');
    
    if (message.type === 'gameFull') {
      // Game started
      const { payload } = message;
      if (gameInfo) {
        gameInfo.innerHTML = `
          <div style="padding: 10px; background: #f5f5f5; border-radius: 5px;">
            <strong>${payload.white?.name || 'White'}</strong> 
            (${payload.white?.rating || '?'})
            <br>
            vs
            <br>
            <strong>${payload.black?.name || 'Black'}</strong> 
            (${payload.black?.rating || '?'})
            <br>
            <small>${payload.perf?.name || 'Standard'} • ${payload.speed || 'rapid'}</small>
          </div>
        `;
      }
      if (statusDisplay) {
        statusDisplay.textContent = '🎮 Game started - analyzing...';
      }
      if (analysisResults) {
        analysisResults.style.display = 'block';
      }
    }
    
    if (message.type === 'gameState') {
      // Move update
      if (statusDisplay) {
        const moveCount = message.payload?.moves ? message.payload.moves.split(/\s+/).length : '?';
        const status = message.payload?.status || 'playing';
        statusDisplay.textContent = `Move ${moveCount} • Status: ${status}`;
      }
    }
    
    if (message.type === 'analysis') {
      // Stockfish analysis
      const { bestMove, evaluation, moveCount } = message;
      
      if (bestMoveDisplay) {
        if (bestMove) {
          bestMoveDisplay.innerHTML = `<strong>Best Move:</strong> <span style="color: #667eea; font-weight: bold;">${bestMove}</span>`;
        } else {
          bestMoveDisplay.innerHTML = '<strong>Best Move:</strong> Analyzing...';
        }
      }
      
      if (evaluationDisplay) {
        if (evaluation) {
          evaluationDisplay.innerHTML = `
            <strong>Evaluation:</strong> <span>${evaluation}</span>
            <br>
            <small>Move #${moveCount}</small>
          `;
        } else {
          evaluationDisplay.innerHTML = '<strong>Evaluation:</strong> Computing...';
        }
      }
      
      if (analysisResults) {
        analysisResults.style.display = 'block';
      }
    }
    
    if (message.type === 'streamClosed') {
      // Game ended
      if (statusDisplay) {
        statusDisplay.textContent = '✓ Game ended';
      }
      if (gameInfo && gameInfo.innerHTML) {
        gameInfo.innerHTML += '<br><small style="color: #999;">Stream closed</small>';
      }
    }
    
    if (message.type === 'chat') {
      // Chat message
      console.log('[Popup] Chat:', message.payload?.text);
    }
    
    if (message.type === 'opponentGone') {
      // Opponent disconnected
      if (statusDisplay) {
        const gone = message.payload?.gone ? 'Disconnected' : 'Reconnected';
        statusDisplay.textContent = `⚠️ Opponent ${gone}`;
      }
    }
  });
}

// ============================================================================
// LEGACY SUPPORT (for existing UI elements)
// ============================================================================

// Analyze current game (legacy - now handled by streaming)
const analyzeCurrentBtn = document.getElementById('analyzeCurrentBtn');
if (analyzeCurrentBtn) {
  analyzeCurrentBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'startMonitoring'
    }, (response) => {
      console.log('[Popup] Analysis started:', response);
      const statusDisplay = document.getElementById('statusDisplay');
      if (statusDisplay) {
        statusDisplay.textContent = '🔍 Monitoring active...';
      }
      const analysisResults = document.getElementById('analysisResults');
      if (analysisResults) {
        analysisResults.style.display = 'block';
      }
    });
  });
}

// Analyze board position (legacy - sends to content script)
const analyzeBtn = document.getElementById('analyzeBtn');
if (analyzeBtn) {
  analyzeBtn.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'analyze'}, (response) => {
          console.log('[Popup] Analysis response:', response);
        });
      }
    });
  });
}


