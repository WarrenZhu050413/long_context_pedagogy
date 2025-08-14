# Pedagogy MVP - Learning System with Claude Code

A minimal, clean implementation of a pedagogy learning system that integrates with Claude Code to track learning progress through knowledge graphs.

## Features

- **Modular workspace setup** with topic-based initialization
- **Event capture system** that hooks into Claude Code events
- **Knowledge graph tracking** for both Claude and user understanding
- **Clean, unified UI** showing learning progress and knowledge gaps
- **Real-time monitoring** of learning sessions

## Quick Start

### 1. Setup a Learning Workspace

```bash
# Install dependencies
npm install

# Create a new learning workspace
python3 setup_workspace.py -d my-learning -t "your topic here"

# Example: Learn about machine learning
python3 setup_workspace.py -d ml-study -t "machine learning basics"
```

### 2. Start the Monitoring Server

```bash
# Start the pedagogy server
npm start

# Open browser to view progress
open http://localhost:3001
```

### 3. Begin Learning with Claude

```bash
# Navigate to your workspace
cd my-learning

# Start Claude Code (the workspace will auto-initialize)
claude -p "Let's start learning!"
```

## Architecture

### Core Components

- **`setup_workspace.py`** - Modular setup script with template-based file generation
- **`templates/`** - Clean template files for hooks, commands, and configurations
- **`server.js`** - Minimal Express server for event capture and knowledge graph serving
- **`public/index.html`** - Unified UI for monitoring learning progress

### File Structure

```
pedagogy-mvp/
├── setup_workspace.py           # Main setup script
├── templates/                   # Template files
│   ├── capture_events.py        # Claude Code event hook
│   ├── settings.json            # Hook configuration
│   ├── study_init.md            # /study::init command
│   └── claude_md.md             # CLAUDE.md instructions
├── server.js                    # Event capture server
├── public/index.html            # Monitoring UI
├── package.json                 # Dependencies
└── tests/                       # Playwright tests
```

### Workspace Structure (Generated)

```
my-learning/                     # Your learning workspace
├── .claude/                     # Claude Code configuration
│   ├── hooks/capture_events.py  # Event capture hook
│   ├── settings.json            # Hook settings
│   ├── commands/study::init.md  # Learning command
│   └── CLAUDE.md                # Instructions for Claude
├── claude_knowledge_graph.mmd   # Claude's complete knowledge
├── user_knowledge_graph.mmd     # Your current understanding
├── user.json                    # Your learning profile
└── kb/                          # Supporting research materials
```

## How It Works

### 1. Workspace Initialization

The setup script creates a Claude Code workspace with:
- Event capture hooks that send all interactions to the monitoring server
- A `/study::init` command that triggers comprehensive topic research
- Knowledge graph files for tracking learning progress
- Auto-initialization on session start

### 2. Learning Session Flow

1. **SessionStart**: Automatically triggers `/study::init` command
2. **Research Phase**: Claude researches the topic and builds `claude_knowledge_graph.mmd`
3. **Teaching Phase**: Claude analyzes knowledge gaps and teaches accordingly
4. **Progress Tracking**: Updates `user_knowledge_graph.mmd` as understanding grows
5. **Event Capture**: All interactions are logged for analysis

### 3. Real-time Monitoring

The web UI shows:
- **Claude's Knowledge**: Complete topic knowledge graph
- **Your Knowledge**: Current understanding and progress
- **Learning Profile**: Preferences, goals, and session history
- **Learning Activity**: Real-time event stream

## API Endpoints

- `GET /` - Main monitoring UI
- `GET /events` - All learning events (JSON)
- `GET /events/:sessionId` - Events for specific session
- `POST /events` - Submit new events (used by hooks)
- `GET /kb/claude-graph` - Claude's knowledge graph
- `GET /kb/user-graph` - User's knowledge graph
- `GET /kb/user-profile` - User profile data
- `GET /sessions` - List all learning sessions
- `GET /health` - Server health check

## Customization

### Adding New Templates

1. Create template files in `templates/`
2. Use `$ARGUMENTS` placeholder for dynamic content
3. Load templates in `setup_workspace.py` using `load_template()`

### Modifying the UI

Edit `public/index.html` - it's a single-file UI with embedded CSS and JavaScript.

### Extending Event Capture

Modify `templates/capture_events.py` to capture additional data or add new event types.

## Testing

```bash
# Run basic server tests
npm test

# Manual testing
curl http://localhost:3001/health
curl http://localhost:3001/events
```

## Principles

- **Functional over fancy** - Core features only, no bloat
- **Clean and modular** - Template-based, no hardcoded strings
- **Single source of truth** - One clean codebase
- **Git-friendly** - Regular commits at working milestones

## Requirements

- Python 3.8+
- Node.js 14+
- Claude Code CLI
- Modern web browser

## License

MIT