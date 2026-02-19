const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { BskyAgent } = require('@atproto/api');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database setup
const db = new Database('handles.db');
db.prepare(`
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    did TEXT NOT NULL,
    handle TEXT NOT NULL,
    domain TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(handle, domain)
  )
`).run();

// Cloudflare Configuration
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const cfApi = axios.create({
  baseURL: 'https://api.cloudflare.com/client/v4',
  headers: {
    'Authorization': `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Helper: Get Zone ID for a domain
async function getZoneId(domain) {
  try {
    const response = await cfApi.get('/zones', { params: { name: domain } });
    if (response.data.result && response.data.result.length > 0) {
      return response.data.result[0].id;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching zone ID for ${domain}:`, error.message);
    return null;
  }
}

// Routes
app.post('/api/login', async (req, res) => {
  const { handle, password } = req.body;
  if (!handle || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    const loginRes = await agent.login({ identifier: handle, password: password });
    res.json({ success: true, did: loginRes.data.did, handle: loginRes.data.handle });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/domains', async (req, res) => {
  try {
    const response = await cfApi.get('/zones', { params: { status: 'active', per_page: 50 } });
    const domains = response.data.result.map(zone => zone.name);
    res.json({ domains });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch domains from Cloudflare' });
  }
});

app.get('/api/check-handle', async (req, res) => {
  const { handle, domain } = req.query;
  if (!handle || !domain) {
    return res.status(400).json({ error: 'Handle and domain are required' });
  }

  const reservation = db.prepare('SELECT * FROM reservations WHERE handle = ? AND domain = ?').get(handle, domain);
  if (reservation) {
    return res.json({ available: false, reason: 'Reserved', did: reservation.did });
  }

  try {
    const zoneId = await getZoneId(domain);
    if (!zoneId) return res.status(404).json({ error: 'Domain not managed by this account' });

    const recordName = `_atproto.${handle}.${domain}`;
    const response = await cfApi.get(`/zones/${zoneId}/dns_records`, {
      params: { name: recordName, type: 'TXT' }
    });

    if (response.data.result && response.data.result.length > 0) {
      return res.json({ available: false, reason: 'DNS record already exists' });
    }

    res.json({ available: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check DNS availability' });
  }
});

app.post('/api/automate-all', async (req, res) => {
  const { currentHandle, appPassword, desiredHandle, domain } = req.body;
  if (!currentHandle || !appPassword || !desiredHandle || !domain) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    const loginRes = await agent.login({ identifier: currentHandle, password: appPassword });
    const did = loginRes.data.did;

    const existing = db.prepare('SELECT * FROM reservations WHERE handle = ? AND domain = ?').get(desiredHandle, domain);
    if (existing && existing.did !== did) {
      return res.status(400).json({ error: 'Handle already claimed by someone else' });
    }

    const zoneId = await getZoneId(domain);
    if (!zoneId) return res.status(404).json({ error: 'Domain not managed here' });

    const recordName = `_atproto.${desiredHandle}.${domain}`;

    const checkRes = await cfApi.get(`/zones/${zoneId}/dns_records`, { params: { name: recordName, type: 'TXT' } });
    if (checkRes.data.result.length === 0) {
        await cfApi.post(`/zones/${zoneId}/dns_records`, {
            type: 'TXT',
            name: recordName,
            content: `did=${did}`,
            ttl: 3600
        });
    } else {
        const recordId = checkRes.data.result[0].id;
        await cfApi.put(`/zones/${zoneId}/dns_records/${recordId}`, {
            type: 'TXT',
            name: recordName,
            content: `did=${did}`,
            ttl: 3600
        });
    }

    if (!existing) {
        db.prepare('INSERT INTO reservations (did, handle, domain) VALUES (?, ?, ?)').run(did, desiredHandle, domain);
    }

    const newHandle = `${desiredHandle}.${domain}`;
    await agent.updateHandle({ handle: newHandle });

    res.json({ success: true, handle: newHandle, did: did });
  } catch (error) {
    console.error('Automation error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Automation failed' });
  }
});

app.post('/api/update-handle', async (req, res) => {
  const { currentHandle, appPassword, newHandle } = req.body;
  if (!currentHandle || !appPassword || !newHandle) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier: currentHandle, password: appPassword });
    await agent.updateHandle({ handle: newHandle });
    res.json({ success: true });
  } catch (error) {
    console.error('ATProto update error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to update handle on Bluesky' });
  }
});

app.get('/api/my-handles', (req, res) => {
    const { did } = req.query;
    if (!did) return res.status(400).json({ error: 'DID is required' });
    const results = db.prepare('SELECT handle, domain FROM reservations WHERE did = ?').all(did);
    res.json({ handles: results });
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
