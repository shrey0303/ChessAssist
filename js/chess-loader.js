
(function() {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
  script.onload = function() {
    console.log('✓ chess.js library loaded');
  };
  script.onerror = function() {
    console.warn('✗ Failed to load chess.js from CDN');
  };
  document.head.appendChild(script);
})();
