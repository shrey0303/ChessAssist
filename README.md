# ChessAssist Chrome Extension

A basic Chrome extension structure for chess analysis assistance.

## File Structure

```
ChessAssist/
├── manifest.json          # Extension configuration
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── popup.css             # Popup styles (in styles.css)
├── options.html          # Settings page
├── options.js            # Settings logic
├── options.css           # Settings styles
├── content.js            # Content script (runs on pages)
├── background.js         # Background service worker
├── styles.css            # Shared styles
└── images/               # Extension icons
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## How to Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the ChessAssist folder

## Files Overview

- **manifest.json**: Defines permissions, scripts, and extension metadata
- **popup.html/js**: The UI shown when clicking the extension icon
- **options.html/js**: Settings page accessible via extension menu
- **content.js**: Script injected into web pages
- **background.js**: Service worker for background tasks
- **styles.css**: Styling for the popup

## Next Steps

1. Add your extension icons to the `images/` folder (16x16, 48x48, 128x128 PNG)
2. Implement chess analysis logic in `content.js`
3. Add event handling as needed
4. Test the extension in Chrome

## Features Implemented

- ✅ Popup interface with analyze and settings buttons
- ✅ Settings page with chrome.storage.sync
- ✅ Background service worker
- ✅ Content script for page interaction
- ✅ Message passing between components
