// Background service worker
console.log('ChessAssist background service worker loaded');

// Import inference module (Lichess streaming + Stockfish)
importScripts('inference.js');

// Initialize inference when service worker starts
initializeInference();

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request.action);
  
  if (request.action === 'fetchLichessUser') {
    console.log('Fetching Lichess user:', request.username);
    fetchLichessUserFromAPI(request.username, sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'fetchLichessGames') {
    console.log('Fetching Lichess games:', request.username);
    fetchLichessGamesFromAPI(request.username, sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'setLichessToken') {
    console.log('Setting Lichess token');
    chrome.storage.local.set({ lichess_token: request.token }, () => {
      sendResponse({ status: 'token_set' });
    });
    return true;
  }
  
  if (request.action === 'startStreamMonitoring') {
    console.log('Starting stream monitoring');
    chrome.runtime.sendMessage({ action: 'startMonitoring' }, (response) => {
      sendResponse(response);
    });
    return true;
  }
  
  if (request.action === 'stopStreamMonitoring') {
    console.log('Stopping stream monitoring');
    chrome.runtime.sendMessage({ action: 'stopMonitoring' }, (response) => {
      sendResponse(response);
    });
    return true;
  }
  
  if (request.action === 'process') {
    console.log('Processing request:', request);
    sendResponse({status: 'processed'});
    return true;
  }
});

// Fetch user profile from Lichess API
function fetchLichessUserFromAPI(username, sendResponse) {
  console.log('Starting API call for user:', username);
  const apiUrl = `https://lichess.org/api/user/${username}`;
  
  fetch(apiUrl, {
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(response => {
    console.log('User API response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Lichess user fetched successfully:', data.username);
    sendResponse({
      data: data,
      error: null
    });
  })
  .catch(error => {
    console.error('Error fetching Lichess user:', error.message);
    sendResponse({
      data: null,
      error: error.message
    });
  });
}

// Fetch games from Lichess API
function fetchLichessGamesFromAPI(username, sendResponse) {
  console.log('Starting API call for games:', username);
  const apiUrl = `https://lichess.org/api/games/user/${username}?max=20&sort=dateDesc`;
  
  fetch(apiUrl, {
    headers: {
      'Accept': 'application/ndjson'
    }
  })
  .then(response => {
    console.log('Games API response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then(data => {
    // Parse NDJSON (newline-delimited JSON)
    const games = data.trim().split('\n').map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(game => game !== null);
    
    console.log('Lichess games fetched successfully:', games.length);
    sendResponse({
      games: games,
      error: null
    });
  })
  .catch(error => {
    console.error('Error fetching Lichess games:', error.message);
    sendResponse({
      games: [],
      error: error.message
    });
  });
}

// Install event
chrome.runtime.onInstalled.addListener(() => {
  console.log('ChessAssist extension installed');
});
