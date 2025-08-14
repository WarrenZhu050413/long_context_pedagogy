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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(ROOT, 'public')));

// Main UI endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

// Event capture endpoint
app.post('/events', (req, res) => {
  try {
    const { session_id, event_type, timestamp, ...eventData } = req.body;
    
    if (!session_id || !event_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store event
    const stmt = db.prepare(`
      INSERT INTO events (session_id, event_type, timestamp, data)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(
      session_id,
      event_type,
      timestamp || Date.now(),
      JSON.stringify(eventData)
    );

    res.json({ success: true, session_id, event_type });
  } catch (error) {
    console.error('Error storing event:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    
    const stmt = db.prepare(`
      SELECT * FROM events 
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    const events = stmt.all(limit);
    
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

// Knowledge base endpoints
app.get('/kb/claude-graph', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'claude_knowledge_graph.mmd');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.type('text/plain').send(content);
    } else {
      res.status(404).send('Claude knowledge graph not found');
    }
  } catch (error) {
    res.status(500).send('Error reading Claude knowledge graph');
  }
});

app.get('/kb/user-graph', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'user_knowledge_graph.mmd');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.type('text/plain').send(content);
    } else {
      res.status(404).send('User knowledge graph not found');
    }
  } catch (error) {
    res.status(500).send('Error reading user knowledge graph');
  }
});

app.get('/kb/user-profile', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'user.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.type('application/json').send(content);
    } else {
      res.status(404).json({ error: 'User profile not found' });
    }
  } catch (error) {
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🎓 Pedagogy server running on http://localhost:${PORT}`);
  console.log(`📊 Events API: /events`);
  console.log(`🧠 Knowledge graphs: /kb/claude-graph, /kb/user-graph`);
  console.log(`👤 User profile: /kb/user-profile`);
});