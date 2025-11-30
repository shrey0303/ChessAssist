// Popup script
const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const userGreeting = document.getElementById('userGreeting');
const loadingSpinner = document.getElementById('loadingSpinner');

// Check if user is already authenticated
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
});

function checkAuthStatus() {
  chrome.storage.sync.get(['user', 'platform', 'token'], (data) => {
    if (data.user && data.token) {
      showMainSection(data.user, data.platform);
    } else {
      showLoginSection();
    }
  });
}

function showLoginSection() {
  loginSection.style.display = 'block';
  mainSection.style.display = 'none';
}

function showMainSection(username, platform) {
  loginSection.style.display = 'none';
  mainSection.style.display = 'block';
  userGreeting.textContent = `Welcome, ${username}!`;
}

function showLoading(show) {
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

// Lichess Authentication
document.getElementById('lichessBtn').addEventListener('click', () => {
  authenticateWithLichess();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  chrome.storage.sync.remove(['user', 'platform', 'token', 'games', 'userStats'], () => {
    showLoginSection();
  });
});

// Analyze Position
document.getElementById('analyzeBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'analyze'}, (response) => {
      console.log('Analysis response:', response);
    });
  });
});

// Analyze Current Game (new)
document.getElementById('analyzeCurrentBtn').addEventListener('click', () => {
  analyzeCurrentGameAction();
});

// ===== LICHESS AUTHENTICATION =====
function authenticateWithLichess() {
  showLoading(true);
  
  // Prompt user for their Lichess username
  const username = prompt('Enter your Lichess username:');
  
  if (!username || !username.trim()) {
    showLoading(false);
    return;
  }
  
  fetchLichessUserProfile(username.trim());
}

function fetchLichessUserProfile(username) {
  // Use background script to make API call (avoids CORS issues)
  console.log('Sending message to background for user:', username);
  
  chrome.runtime.sendMessage({
    action: 'fetchLichessUser',
    username: username
  }, (response) => {
    console.log('Response received:', response);
    
    if (!response) {
      console.error('No response from background script');
      showLoading(false);
      alert('Error: Could not connect to background script. Please reload the extension.');
      return;
    }
    
    if (response.error) {
      console.error('Lichess auth error:', response.error);
      showLoading(false);
      alert('Error: ' + response.error + '. Please check the username and try again.');
      return;
    }
    
    console.log('Lichess user data:', response.data);
    
    // Store user data
    chrome.storage.sync.set({
      user: response.data.username,
      platform: 'lichess',
      token: response.data.id,
      userId: response.data.id,
      userStats: {
        rating: response.data.perfs?.blitz?.rating || 'N/A',
        games: response.data.nbPlayed || 0,
        followers: response.data.nbFollowers || 0
      }
    }, () => {
      console.log('Lichess user authenticated:', response.data.username);
      fetchLichessGames(response.data.username);
    });
  });
}

function fetchLichessGames(username) {
  // Use background script to make API call
  console.log('Sending message to background for games:', username);
  
  chrome.runtime.sendMessage({
    action: 'fetchLichessGames',
    username: username
  }, (response) => {
    console.log('Games response received:', response);
    showLoading(false);
    
    if (!response) {
      console.error('No response from background script for games');
      chrome.storage.sync.get(['user'], (data) => {
        showMainSection(data.user, 'lichess');
      });
      return;
    }
    
    if (response.error) {
      console.error('Error fetching Lichess games:', response.error);
      // Still show main section even if games fetch fails
      chrome.storage.sync.get(['user'], (data) => {
        showMainSection(data.user, 'lichess');
      });
      return;
    }
    
    console.log('Fetched Lichess games:', response.games.length);
    
    // Store games
    chrome.storage.sync.set({games: response.games}, () => {
      chrome.storage.sync.get(['user'], (data) => {
        showMainSection(data.user, 'lichess');
      });
    });
  });
}

// ===== STOCKFISH ANALYSIS =====
function analyzeCurrentGameAction() {
  showLoading(true);
  const resultsDiv = document.getElementById('analysisResults');
  const statusDisplay = document.getElementById('statusDisplay');
  
  chrome.storage.sync.get(['user'], (data) => {
    if (!data.user) {
      showLoading(false);
      alert('User not found. Please login again.');
      return;
    }
    
    // Call stockfish analysis
    getBestMoveForCurrentGame(data.user, 6) // depth 6 for shallow analysis
    .then(result => {
      console.log('Analysis result:', result);
      showLoading(false);
      
      // Display results
      const bestMove = result.analysis.bestMove || 'No move found';
      const score = result.analysis.score;
      
      document.getElementById('bestMoveDisplay').textContent = 
        `Best Move: ${bestMove}`;
      
      if (score && score.type === 'cp') {
        document.getElementById('evaluationDisplay').textContent = 
          `Evaluation: ${score.eval} (pawns)`;
      } else if (score && score.type === 'mate') {
        document.getElementById('evaluationDisplay').textContent = 
          `Mate in ${score.moves} moves`;
      } else {
        document.getElementById('evaluationDisplay').textContent = 'Evaluation: N/A';
      }
      
      statusDisplay.textContent = 'Analysis complete!';
      resultsDiv.style.display = 'block';
    })
    .catch(error => {
      console.error('Analysis error:', error);
      showLoading(false);
      statusDisplay.textContent = `Error: ${error.message}`;
      resultsDiv.style.display = 'block';
    });
  });
}

