const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const ROOT = __dirname;
const WORKSPACE = path.join(ROOT, 'workspace');
const SLICES_DIR = path.join(WORKSPACE, 'slices');
const DB_PATH = path.join(ROOT, 'db', 'sessions.db');

// Initialize SQLite database
const initDatabase = () => {
  // Ensure db directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_updated INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS file_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      file_type TEXT NOT NULL,
      content TEXT,
      timestamp INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS global_files (
      file_type TEXT PRIMARY KEY,
      content TEXT,
      last_updated INTEGER DEFAULT (strftime('%s', 'now')),
      version INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      event_type TEXT,
      tool_name TEXT,
      tool_input TEXT,
      tool_output TEXT,
      file_changes TEXT,
      timestamp INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_session_id ON file_snapshots(session_id);
    CREATE INDEX IF NOT EXISTS idx_file_type ON file_snapshots(file_type);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON file_snapshots(timestamp);
    CREATE INDEX IF NOT EXISTS idx_event_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type);
  `);

  return db;
};

const db = initDatabase();

app.use(express.json());
// Serve Teacher UI at /teacher
app.get('/teacher', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'teacher.html'));
});
// Redirect legacy path to canonical /teacher
app.get('/teacher.html', (req, res) => {
  res.redirect(301, '/teacher');
});
app.use('/', express.static(path.join(ROOT, 'public')));

function safeJoin(root, p) {
  const full = path.resolve(root, p);
  if (!full.startsWith(root)) throw new Error('Invalid path');
  return full;
}

app.get('/kb/toc.json', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'toc.json');
    res.type('application/json').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});


app.get('/kb/graph.mmd', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'graph.mmd');
    res.type('text/plain; charset=utf-8').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).send('Not found');
  }
});

app.get('/kb/session.json', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'session.json');
    res.type('application/json').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});

app.get('/kb/user.json', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'user.json');
    res.type('application/json').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});


app.get('/kb/agent_graph.mmd', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'agent_graph.mmd');
    res.type('text/plain; charset=utf-8').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).send('Not found');
  }
});

app.get('/kb/system.md', async (req, res) => {
  try {
    const file = safeJoin(WORKSPACE, 'injected/system.md');
    res.type('text/markdown; charset=utf-8').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).send('Not found');
  }
});

app.get('/kb/slices', async (req, res) => {
  try {
    const dir = safeJoin(WORKSPACE, 'slices');
    const files = (await fsp.readdir(dir)).filter(f => f.endsWith('.md'));
    const items = files.map(f => ({ slug: f.replace(/\.md$/, ''), path: `/kb/slices/${f.replace(/\.md$/, '')}` }));
    res.json({ items });
  } catch (e) {
    res.json({ items: [] });
  }
});

app.get('/kb/slices/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!/^[a-z0-9\-_.]+$/.test(slug)) return res.status(400).send('bad slug');
    const file = safeJoin(SLICES_DIR, `${slug}.md`);
    res.type('text/markdown; charset=utf-8').send(await fsp.readFile(file, 'utf8'));
  } catch (e) {
    res.status(404).send('Not found');
  }
});

// ============ OBSERVABILITY ENDPOINTS ============

// POST /events - Simplified event logging for hooks
app.post('/events', (req, res) => {
  try {
    const { 
      session_id, 
      event_type,
      tool_name,
      tool_input,
      tool_output,
      file_changes,
      file_type,
      content 
    } = req.body;
    
    if (!session_id || !event_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store event
    const eventStmt = db.prepare(`
      INSERT INTO events (session_id, event_type, tool_name, tool_input, tool_output, file_changes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    eventStmt.run(
      session_id,
      event_type,
      tool_name || null,
      JSON.stringify(tool_input || {}),
      JSON.stringify(tool_output || {}),
      JSON.stringify(file_changes || [])
    );

    // If it's a file update for tracked files, update global
    if (file_type && content && ['user.json', 'graph.mmd', 'user_knowledge_graph.mmd'].includes(file_type)) {
      const globalStmt = db.prepare(`
        INSERT INTO global_files (file_type, content, last_updated, version)
        VALUES (?, ?, strftime('%s', 'now'), 1)
        ON CONFLICT(file_type) DO UPDATE SET
          content = excluded.content,
          last_updated = strftime('%s', 'now'),
          version = version + 1
      `);
      globalStmt.run(file_type, content);
      
      // Also write to filesystem
      const filePath = path.join(WORKSPACE, file_type);
      fs.writeFileSync(filePath, content, 'utf8');
    }

    // Update session tracking
    const sessionStmt = db.prepare('INSERT OR IGNORE INTO sessions (id) VALUES (?)');
    sessionStmt.run(session_id);
    
    const updateStmt = db.prepare("UPDATE sessions SET last_updated = strftime('%s', 'now') WHERE id = ?");
    updateStmt.run(session_id);

    res.json({ success: true, session_id, event_type });
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions - List all sessions
app.get('/sessions', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        s.id,
        s.created_at,
        s.last_updated,
        COUNT(DISTINCT f.file_type) as file_count
      FROM sessions s
      LEFT JOIN file_snapshots f ON s.id = f.session_id
      GROUP BY s.id
      ORDER BY s.last_updated DESC
    `);
    const sessions = stmt.all();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions/:id - Get session details with latest files
app.get('/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get session info
    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
    const session = sessionStmt.get(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get latest snapshot for each file type
    const filesStmt = db.prepare(`
      SELECT file_type, content, timestamp
      FROM file_snapshots
      WHERE session_id = ? AND id IN (
        SELECT MAX(id) FROM file_snapshots
        WHERE session_id = ?
        GROUP BY file_type
      )
    `);
    const files = filesStmt.all(id, id);

    // Format response
    const result = {
      ...session,
      files: {}
    };

    files.forEach(file => {
      result.files[file.file_type] = {
        content: file.content,
        timestamp: file.timestamp
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions/:id/history/:fileType - Get file change history
app.get('/sessions/:id/history/:fileType', (req, res) => {
  try {
    const { id, fileType } = req.params;
    
    const stmt = db.prepare(`
      SELECT content, timestamp
      FROM file_snapshots
      WHERE session_id = ? AND file_type = ?
      ORDER BY timestamp DESC
    `);
    const history = stmt.all(id, fileType);
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ GLOBAL FILE MANAGEMENT ============

// GET /global/:fileType - Get global file
app.get('/global/:fileType', (req, res) => {
  try {
    const { fileType } = req.params;
    
    // First check database
    const stmt = db.prepare('SELECT * FROM global_files WHERE file_type = ?');
    const dbFile = stmt.get(fileType);
    
    if (dbFile) {
      return res.json(dbFile);
    }
    
    // Fallback to filesystem for initial state
    const filePath = path.join(WORKSPACE, fileType);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Store in database for future use
      const insertStmt = db.prepare(`
        INSERT INTO global_files (file_type, content, last_updated, version)
        VALUES (?, ?, strftime('%s', 'now'), 1)
      `);
      insertStmt.run(fileType, content);
      
      return res.json({
        file_type: fileType,
        content: content,
        last_updated: Math.floor(Date.now() / 1000),
        version: 1
      });
    }
    
    res.status(404).json({ error: 'File not found' });
  } catch (error) {
    console.error('Error fetching global file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /global/:fileType - Update global file
app.post('/global/:fileType', (req, res) => {
  try {
    const { fileType } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    // Upsert global file in database
    const stmt = db.prepare(`
      INSERT INTO global_files (file_type, content, last_updated, version)
      VALUES (?, ?, strftime('%s', 'now'), 1)
      ON CONFLICT(file_type) DO UPDATE SET
        content = excluded.content,
        last_updated = strftime('%s', 'now'),
        version = version + 1
    `);
    
    const result = stmt.run(fileType, content);
    
    // Also write to filesystem for backup
    const filePath = path.join(WORKSPACE, fileType);
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Get updated record
    const getStmt = db.prepare('SELECT * FROM global_files WHERE file_type = ?');
    const updatedFile = getStmt.get(fileType);
    
    res.json({ 
      success: true, 
      file: updatedFile
    });
  } catch (error) {
    console.error('Error updating global file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

 

// GET /global - List all global files
app.get('/global', (req, res) => {
  try {
    const stmt = db.prepare('SELECT file_type, last_updated, version FROM global_files ORDER BY file_type');
    const files = stmt.all();
    res.json(files);
  } catch (error) {
    console.error('Error listing global files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events/:sessionId - Get events for a specific session
app.get('/events/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const stmt = db.prepare(`
      SELECT * FROM events 
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const events = stmt.all(sessionId, limit);
    
    // Parse JSON fields
    events.forEach(event => {
      try {
        event.tool_input = JSON.parse(event.tool_input || '{}');
        event.tool_output = JSON.parse(event.tool_output || '{}');
        event.file_changes = JSON.parse(event.file_changes || '[]');
      } catch (e) {
        // Keep as string if not valid JSON
      }
    });
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events - Get all recent events
app.get('/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const stmt = db.prepare(`
      SELECT * FROM events 
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const events = stmt.all(limit);
    
    // Parse JSON fields
    events.forEach(event => {
      try {
        event.tool_input = JSON.parse(event.tool_input || '{}');
        event.tool_output = JSON.parse(event.tool_output || '{}');
        event.file_changes = JSON.parse(event.file_changes || '[]');
      } catch (e) {
        // Keep as string if not valid JSON
      }
    });
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Simple Teacher Mode server listening on http://localhost:${PORT}`);
  console.log(`UI available: / (KB), /teacher (Observer), /events (JSON)`);
  console.log(`Observability endpoint ready at POST http://localhost:${PORT}/events`);
  console.log(`Global files endpoint: GET/POST http://localhost:${PORT}/global/:fileType`);
});
