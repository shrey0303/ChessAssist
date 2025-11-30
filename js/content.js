// Content script - runs on the pages you visit
console.log('ChessAssist content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    console.log('Analyzing chess position...');
    // Add your chess analysis logic here
    sendResponse({status: 'Analysis complete'});
  }
});
