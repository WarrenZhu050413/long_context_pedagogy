const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3001;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'db', 'events.db');

// Initialize database
const initDatabase = () => {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      event_type TEXT,
      timestamp INTEGER,
      data TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_session_id ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
  `);

  return db;
};

const db = initDatabase();

// Input validation and sanitization utilities
const validateSessionId = (sessionId) => {
  return typeof sessionId === 'string' && 
         sessionId.length > 0 && 
         sessionId.length <= 100 &&
         /^[a-zA-Z0-9\-_]+$/.test(sessionId);
};

const validateEventType = (eventType) => {
  const allowedTypes = ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop'];
  return typeof eventType === 'string' && allowedTypes.includes(eventType);
};

const validateWorkspace = (workspace) => {
  if (!workspace) return true; // workspace is optional
  return typeof workspace === 'string' && 
         workspace.length <= 100 &&
         /^[a-zA-Z0-9\-_]+$/.test(workspace);
};

const sanitizeInput = (input, maxLength = 1000) => {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).replace(/[<>]/g, '');
};

// Database operation wrapper with error handling
const dbOperation = async (operation, context = '') => {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database Error (${context}):`, error.message);
    throw new Error(`Database operation failed: ${context}`);
  }
};

// Enhanced Middleware with Error Handling
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// JSON parsing with error handling
app.use(express.json({ 
  limit: '10mb',
  type: 'application/json'
}));

// Handle JSON parsing errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('JSON Parse Error:', error.message);
    return res.status(400).json({ 
      error: 'Invalid JSON payload',
      details: 'Request body contains malformed JSON'
    });
  }
  next(error);
});

app.use(express.static(path.join(ROOT, 'public')));

// Main UI endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

// Enhanced Event capture endpoint with validation
app.post('/events', async (req, res) => {
  try {
    const { session_id, event_type, timestamp, ...eventData } = req.body;
    
    // Comprehensive input validation
    if (!session_id || !event_type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['session_id', 'event_type']
      });
    }

    if (!validateSessionId(session_id)) {
      return res.status(400).json({ 
        error: 'Invalid session_id format',
        details: 'Session ID must be alphanumeric with dashes/underscores, max 100 chars'
      });
    }

    if (!validateEventType(event_type)) {
      return res.status(400).json({ 
        error: 'Invalid event_type',
        allowed: ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop']
      });
    }

    // Validate workspace if provided
    if (eventData.workspace && !validateWorkspace(eventData.workspace)) {
      return res.status(400).json({ 
        error: 'Invalid workspace format',
        details: 'Workspace must be alphanumeric with dashes/underscores, max 100 chars'
      });
    }

    // Sanitize string inputs
    const sanitizedData = { ...eventData };
    if (sanitizedData.user_prompt) {
      sanitizedData.user_prompt = sanitizeInput(sanitizedData.user_prompt, 5000);
    }
    if (sanitizedData.workspace) {
      sanitizedData.workspace = sanitizeInput(sanitizedData.workspace, 100);
    }

    // Validate timestamp
    const eventTimestamp = timestamp || Date.now();
    if (typeof eventTimestamp !== 'number' || eventTimestamp < 0) {
      return res.status(400).json({ 
        error: 'Invalid timestamp',
        details: 'Timestamp must be a positive number'
      });
    }

    // Store event with error handling
    await dbOperation(() => {
      const stmt = db.prepare(`
        INSERT INTO events (session_id, event_type, timestamp, data)
        VALUES (?, ?, ?, ?)
      `);
      
      return stmt.run(
        session_id,
        event_type,
        eventTimestamp,
        JSON.stringify(sanitizedData)
      );
    }, 'event insertion');

    res.json({ 
      success: true, 
      session_id, 
      event_type,
      timestamp: eventTimestamp
    });

  } catch (error) {
    console.error('Event capture error:', error);
    
    // Don't expose internal error details in production
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ 
      error: 'Internal server error',
      ...(isDev && { details: error.message })
    });
  }
});

// Get events for a session
app.get('/events/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const stmt = db.prepare(`
      SELECT * FROM events 
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    const events = stmt.all(sessionId, limit);
    
    // Parse data field
    events.forEach(event => {
      try {
        event.data = JSON.parse(event.data || '{}');
      } catch (e) {
        event.data = {};
      }
    });
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all recent events
app.get('/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const since = parseInt(req.query.since) || (Date.now() - 3600000); // Default: past hour
    const eventType = req.query.event_type || 'UserPromptSubmit'; // Default: conversations only
    const workspace = req.query.workspace;
    
    let query = `
      SELECT * FROM events 
      WHERE event_type = ? AND timestamp > ?
    `;
    let params = [eventType, since];
    
    // Add workspace filtering if specified
    if (workspace) {
      query += ` AND (JSON_EXTRACT(data, '$.workspace') = ? OR JSON_EXTRACT(data, '$.working_directory') LIKE ?)`;
      params.push(workspace, `%/${workspace}`);
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);
    
    const stmt = db.prepare(query);
    const events = stmt.all(...params);
    
    // Parse data field
    events.forEach(event => {
      try {
        event.data = JSON.parse(event.data || '{}');
      } catch (e) {
        event.data = {};
      }
    });
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get workspace path
const getWorkspacePath = (workspace = null) => {
  if (!workspace) {
    return process.cwd();
  }
  const workspacePath = path.join(ROOT, workspace);
  // Security check: ensure workspace is within our root directory
  if (!workspacePath.startsWith(ROOT)) {
    throw new Error('Invalid workspace path');
  }
  return workspacePath;
};

// List available workspaces
app.get('/workspaces', (req, res) => {
  try {
    const workspaces = [];
    
    // Look for directories that contain knowledge graph files
    const entries = fs.readdirSync(ROOT, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && 
          !['node_modules', 'public', 'templates', 'tests', 'db'].includes(entry.name)) {
        const workspaceDir = path.join(ROOT, entry.name);
        const claudeGraph = path.join(workspaceDir, 'claude_knowledge_graph.mmd');
        const userGraph = path.join(workspaceDir, 'user_knowledge_graph.mmd');
        const userProfile = path.join(workspaceDir, 'user.json');
        
        if (fs.existsSync(claudeGraph) || fs.existsSync(userGraph) || fs.existsSync(userProfile)) {
          // Read topic from user.json if available
          let topic = entry.name;
          try {
            if (fs.existsSync(userProfile)) {
              const userData = JSON.parse(fs.readFileSync(userProfile, 'utf8'));
              topic = userData.current_topic || userData.learning_goals?.[0] || entry.name;
            }
          } catch (e) {
            // Fallback to directory name
          }
          
          workspaces.push({
            id: entry.name,
            name: entry.name,
            topic: topic,
            hasClaudeGraph: fs.existsSync(claudeGraph),
            hasUserGraph: fs.existsSync(userGraph),
            hasUserProfile: fs.existsSync(userProfile)
          });
        }
      }
    }
    
    res.json(workspaces);
  } catch (error) {
    console.error('Error listing workspaces:', error);
    res.status(500).json({ error: 'Error listing workspaces' });
  }
});

// Knowledge base endpoints with workspace support
app.get('/kb/claude-graph', (req, res) => {
  try {
    const workspace = req.query.workspace;
    const workspacePath = getWorkspacePath(workspace);
    const filePath = path.join(workspacePath, 'claude_knowledge_graph.mmd');
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.type('text/plain').send(content);
    } else {
      res.status(404).send('Claude knowledge graph not found');
    }
  } catch (error) {
    console.error('Error reading Claude knowledge graph:', error);
    res.status(500).send('Error reading Claude knowledge graph');
  }
});

app.get('/kb/user-graph', (req, res) => {
  try {
    const workspace = req.query.workspace;
    const workspacePath = getWorkspacePath(workspace);
    const filePath = path.join(workspacePath, 'user_knowledge_graph.mmd');
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.type('text/plain').send(content);
    } else {
      res.status(404).send('User knowledge graph not found');
    }
  } catch (error) {
    console.error('Error reading user knowledge graph:', error);
    res.status(500).send('Error reading user knowledge graph');
  }
});

app.get('/kb/user-profile', (req, res) => {
  try {
    const workspace = req.query.workspace;
    const workspacePath = getWorkspacePath(workspace);
    const filePath = path.join(workspacePath, 'user.json');
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.type('application/json').send(content);
    } else {
      res.status(404).json({ error: 'User profile not found' });
    }
  } catch (error) {
    console.error('Error reading user profile:', error);
    res.status(500).json({ error: 'Error reading user profile' });
  }
});

// Sessions list endpoint
app.get('/sessions', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        session_id,
        COUNT(*) as event_count,
        MIN(timestamp) as first_event,
        MAX(timestamp) as last_event
      FROM events
      GROUP BY session_id
      ORDER BY last_event DESC
    `);
    
    const sessions = stmt.all();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced Health check with system status
app.get('/health', (req, res) => {
  try {
    // Check database connectivity
    const dbCheck = db.prepare('SELECT 1 as test').get();
    const healthStatus = {
      status: 'ok',
      timestamp: Date.now(),
      database: dbCheck ? 'connected' : 'error',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    };
    
    res.json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: Date.now(),
      database: 'disconnected',
      error: 'Service temporarily unavailable'
    });
  }
});

// Global error handler (must be last middleware)
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  const isDev = process.env.NODE_ENV !== 'production';
  const errorResponse = {
    error: 'Internal server error',
    timestamp: Date.now(),
    ...(isDev && { 
      details: error.message,
      stack: error.stack 
    })
  };
  
  res.status(500).json(errorResponse);
});

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    timestamp: Date.now()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🎓 Pedagogy server running on http://localhost:${PORT}`);
  console.log(`📊 Events API: /events`);
  console.log(`🧠 Knowledge graphs: /kb/claude-graph, /kb/user-graph`);
  console.log(`👤 User profile: /kb/user-profile`);
  console.log(`🔧 Health check: /health`);
  console.log(`🏗️  Environment: ${process.env.NODE_ENV || 'development'}`);
});