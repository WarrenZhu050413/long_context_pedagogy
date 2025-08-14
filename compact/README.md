# 📚 Compact Learning Tracker

Minimal version of the pedagogy learning system with essential features.

## Quick Start

```bash
# Run the demo
./demo.sh

# Or manual setup:
npm install
node server.js
```

Open: http://localhost:3002

## Features

- **Event Capture**: Captures learning conversations
- **Visual Graph**: Mermaid.js knowledge visualization  
- **Real-time**: Auto-refreshes every 10 seconds
- **Minimal**: Just 4 files, 2 dependencies

## Files

- `server.js` - Express server (50 lines)
- `public/index.html` - UI (80 lines)
- `capture_events.py` - Event hook (30 lines)
- `demo.sh` - Quick demo script

## Usage

1. Start server: `node server.js`
2. Send events: `echo '{"user_prompt": "test"}' | python3 capture_events.py`
3. View: http://localhost:3002

**Total size: ~200 lines of code**