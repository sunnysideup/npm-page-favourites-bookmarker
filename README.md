# @sunnysideup/npm-page-favourites-bookmarker

Tiny in-page bookmark manager with a heart button, overlay list, and optional server sync (email/phone verification supported).

## Features

- Heart button on every page to toggle bookmark (saves URL + title).
- Overlay list of bookmarks (hotkey toggle), with remove + drag-to-sort.
- Uses `localStorage` or `sessionStorage`.
- Optional server sync:
  - Sends events on add/remove.
  - Allows saving an email/phone identity.
  - Requests verification code from server, then enables cross-device sync.
- Zero dependencies, plain ESM.

## Install

```bash
npm i  @sunnysideup/npm-page-favourites-bookmarker
```

## Usage

### with a bundler (Vite/Webpack/Rollup)

```js
import '@sunnysideup/npm-page-favourites-bookmarker/src/index.css'
import { PageFaves } from '@sunnysideup/npm-page-favourites-bookmarker';


```

### without a bundler (Vite/Webpack/Rollup)

```html

<link rel="stylesheet" href="/node_modules/@sunnysideup/npm-page-favourites-bookmarker/src/index.css">
<script type="module">
  import { PageFaves } from '/node_modules/@sunnysideup/npm-page-favourites-bookmarker/src/index.js'

</script>

```

### initialising the module (with / without a bundler (Vite/Webpack/Rollup))

#### simplest setup

```js
import { PageFaves } from '@sunnysideup/npm-page-favourites-bookmarker'
import '@sunnysideup/npm-page-favourites-bookmarker/src/index.css'

const pf = new PageFaves({
  storage: 'local',
  baseUrl: 'https://api.example.com/my-controller',
  endpoints: { 
    events: '/track', 
    bookmarks: '/user/bookmarks' 
  },
  heartPositionLeftRight: 'right',
  heartPositionTopBottom: 'bottom',
  overlayHotkey: 'KeyB', // this will need to be pressed with CTRL+SHIFT
  syncOnLoad: true
})
pf.init()

```

### customise per page

Add the following to your html:

```html

<script>
  window.npmPageFavouritesBookmarker = {
    includeOnThisPage: false,
    userIsLoggedIn: true,
    heartPositionLeftRight: 'right',
    heartPositionTopBottom: 'bottom',
  }
</script>
```


#### customise templates

```js

import { PageFaves } from '@sunnysideup/npm-page-favourites-bookmarker'
import { defaultTemplates } from '@sunnysideup/npm-page-favourites-bookmarker/src/ui/templates.js'
import '@sunnysideup/npm-page-favourites-bookmarker/src/index.css'

const pf = new PageFaves({
  storage: 'local',
  baseUrl: 'https://api.example.com/my-controller',
  endpoints: {
    events: '/track',
    bookmarks: '/user/bookmarks'
  },
  heartPositionLeftRight: 'right',
  heartPositionTopBottom: 'bottom',
  overlayHotkey: 'KeyB', // this will need to be pressed with CTRL+SHIFT
  syncOnLoad: true,
  templates: {
    heart: ({ onClick, position, isOn }) => {
      const a = document.createElement('a')
      a.href = '#'
      a.className = `my-heart ${position}`
      a.textContent = isOn() ? '★' : '☆'
      a.addEventListener('click', (e) => { e.preventDefault(); onClick() })
      return a
    },
    overlayBar: (args) => defaultTemplates.overlayBar(args),
    overlayShell: () => {
      const wrap = document.createElement('div'); wrap.className = 'my-overlay'
      const list = document.createElement('div'); list.className = 'my-overlay-list'
      wrap.append(list); return { wrap, list }
    },
    overlayRow: ({ item /*, index, onRemove, onReorder */ }) => {
      const row = document.createElement('div')
      row.className = 'my-row'
      row.textContent = item.title
      row.addEventListener('click', () => window.open(item.url, '_blank'))
      return row
    }
  }
})
pf.init()


```

## API

### Bookmark methods

- `add(url, title)` → add a bookmark  
- `remove(url)` → remove bookmark  
- `toggleCurrent()` → toggle current page  
- `list()` → get all bookmarks  
- `isBookmarked(url)` → check if URL is saved  

### Overlay

- `showOverlay()`  
- `hideOverlay()`  

### Identity & sync

- `saveIdentity({ email, phone })` → store identity locally & send to server  
- `requestVerification()` → request code (server should send SMS/email)  
- `verifyCode(code)` → check code with server → enables sync  
- `syncFromServer()` → pull bookmarks and merge with local  

## Server Endpoints

You can override each endpoint individually in `endpoints`.

- `POST {events}` → `{ type, payload, at }` (called on add/remove/identity)  
- `GET {bookmarks}` → `[{ url, title, ts }]`  

## Server examples

Here are a couple of examples for the server side:

### PHP

```php

<?php
// public/index.php
declare(strict_types=1);

// --- Config ---------------------------------------------------------------
$storageDir = dirname(__DIR__) . '/data';
$cookieName = 'pfid';
$cookieDays = 30;

// --- Bootstrap ------------------------------------------------------------
is_dir($storageDir) || mkdir($storageDir, 0777, true);
header('Content-Type: application/json; charset=utf-8');
setCors();

// --- Router ---------------------------------------------------------------
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

try {
    if ($method === 'POST' && $path === '/track') {
        handleTrack($storageDir);
    } elseif ($method === 'POST' && $path === '/auth/send-code') {
        handleSendCode($storageDir);
    } elseif ($method === 'POST' && $path === '/auth/verify-code') {
        handleVerifyCode($storageDir, $cookieName, $cookieDays);
    } elseif ($method === 'GET' && $path === '/user/bookmarks') {
        handleGetBookmarks($storageDir, $cookieName);
    } else {
        jsonResponse(['error' => 'Not found'], 404);
    }
} catch (Throwable $e) {
    jsonResponse(['error' => 'Server error', 'detail' => $e->getMessage()], 500);
}

// --- Handlers -------------------------------------------------------------
function handleTrack(string $storageDir) : void
{
    $body = getJsonBody();
    $entry = [
        'type' => (string)($body['type'] ?? ''),
        'payload' => $body['payload'] ?? null,
        'at' => (int)($body['at'] ?? time()),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    ];
    $logFile = $storageDir . '/events.log';
    file_put_contents($logFile, json_encode($entry, JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND);
    jsonResponse(['ok' => true]);
}

function handleSendCode(string $storageDir) : void
{
    $body = getJsonBody();
    $identity = (array)($body['identity'] ?? []);
    $hash = getIdentityHash($identity);
    if ($hash === '') {
        jsonResponse(['ok' => false, 'error' => 'identity_required'], 400);
        return;
    }

    $code = generateCode();
    $codes = loadJson($storageDir . '/codes.json');
    $codes[$hash] = [
        'code' => $code,
        'expiresAt' => time() + 10 * 60, // 10 minutes
    ];
    saveJson($storageDir . '/codes.json', $codes);

    // Simulate sending by logging; replace with real email/SMS gateway call.
    file_put_contents($storageDir . '/outbox.log', json_encode([
        'to' => $identity,
        'code' => $code,
        'sentAt' => time(),
    ], JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND);

    jsonResponse(['ok' => true]);
}

function handleVerifyCode(string $storageDir, string $cookieName, int $cookieDays) : void
{
    $body = getJsonBody();
    $identity = (array)($body['identity'] ?? []);
    $hash = getIdentityHash($identity);
    $code = trim((string)($body['code'] ?? ''));

    if ($hash === '' || $code === '') {
        jsonResponse(['verified' => false, 'error' => 'invalid_request'], 400);
        return;
    }

    $codes = loadJson($storageDir . '/codes.json');
    $row = $codes[$hash] ?? null;

    if (!is_array($row) || (int)$row['expiresAt'] < time() || (string)$row['code'] !== $code) {
        jsonResponse(['verified' => false]);
        return;
    }

    // Mark verified session via cookie
    setcookie($cookieName, $hash, [
        'expires' => time() + ($cookieDays * 24 * 60 * 60),
        'path' => '/',
        'secure' => isHttps(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    jsonResponse(['verified' => true]);
}

function handleGetBookmarks(string $storageDir, string $cookieName) : void
{
    $hash = $_COOKIE[$cookieName] ?? '';
    if ($hash === '') {
        // Not verified: return empty list (or 401 if you prefer)
        jsonResponse([]);
        return;
    }

    $file = userFile($storageDir, $hash, 'bookmarks.json');
    $bookmarks = loadJson($file);
    // Shape: [{ url, title, ts }]
    if (!is_array($bookmarks)) {
        $bookmarks = [];
    }
    jsonResponse(array_values($bookmarks));
}

// --- Helpers --------------------------------------------------------------
function jsonResponse(array $data, int $status = 200) : void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function getJsonBody() : array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function loadJson(string $file) : array
{
    if (!is_file($file)) {
        return [];
    }
    $json = file_get_contents($file) ?: '';
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

function saveJson(string $file, array $data) : void
{
    is_dir(dirname($file)) || mkdir(dirname($file), 0777, true);
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function userFile(string $storageDir, string $hash, string $name) : string
{
    return $storageDir . '/users/' . $hash . '/' . $name;
}

function getIdentityHash(array $identity) : string
{
    $email = trim((string)($identity['email'] ?? ''));
    $phone = trim((string)($identity['phone'] ?? ''));
    if ($email === '' && $phone === '') {
        return '';
    }
    return hash('sha256', $email . '|' . $phone);
}

function generateCode() : string
{
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function isHttps() : bool
{
    $https = $_SERVER['HTTPS'] ?? '';
    $proto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
    return strtolower($https) === 'on' || strtolower($proto) === 'https';
}

function setCors() : void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

```

### JS Example for server side

```js
// server.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';

const app = express();
const PORT = process.env.PORT ?? 3000;
const storageDir = path.resolve('data');
const cookieName = 'pfid';
const cookieDays = 30;

await fs.mkdir(storageDir, { recursive: true });

app.use(express.json());
app.use((req, res, next) => {
  // CORS with credentials
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Utils ------------------------
const j = (...p) => path.join(...p);
const isHttps = (req) =>
  (req.headers['x-forwarded-proto'] || '').toString().toLowerCase() === 'https';

async function loadJson(file) {
  try {
    const txt = await fs.readFile(file, 'utf8');
    return JSON.parse(txt);
  } catch { return {}; }
}
async function saveJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}
function identityHash(identity = {}) {
  const email = String(identity.email || '').trim();
  const phone = String(identity.phone || '').trim();
  if (!email && !phone) return '';
  return crypto.createHash('sha256').update(`${email}|${phone}`).digest('hex');
}
function sixDigitCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}
function setCookie(res, name, value, days, secure) {
  const expires = new Date(Date.now() + days * 86400_000).toUTCString();
  const parts = [
    `${name}=${value}`,
    'Path=/',
    `Expires=${expires}`,
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : null,
  ].filter(Boolean);
  res.setHeader('Set-Cookie', parts.join('; '));
}
function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const map = Object.fromEntries(
    raw.split(';').map(v => v.trim().split('=').map(decodeURIComponent)).filter(kv => kv[0])
  );
  return map[name] || '';
}

// Routes -----------------------

// Event fire-and-forget
app.post('/track', async (req, res) => {
  const entry = {
    type: String(req.body?.type || ''),
    payload: req.body?.payload ?? null,
    at: Number(req.body?.at || Date.now()),
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
  };
  await fs.appendFile(j(storageDir, 'events.log'), JSON.stringify(entry) + '\n');
  res.json({ ok: true });
});

// Request verification code (logs to outbox)
app.post('/auth/send-code', async (req, res) => {
  const hash = identityHash(req.body?.identity || {});
  if (!hash) return res.status(400).json({ ok: false, error: 'identity_required' });

  const codesFile = j(storageDir, 'codes.json');
  const codes = await loadJson(codesFile);
  const code = sixDigitCode();
  codes[hash] = { code, expiresAt: Date.now() + 10 * 60_000 };
  await saveJson(codesFile, codes);

  await fs.appendFile(
    j(storageDir, 'outbox.log'),
    JSON.stringify({ to: req.body.identity, code, sentAt: Date.now() }) + '\n'
  );
  res.json({ ok: true });
});

// Verify code → set cookie
app.post('/auth/verify-code', async (req, res) => {
  const hash = identityHash(req.body?.identity || {});
  const code = String(req.body?.code || '').trim();
  if (!hash || !code) return res.status(400).json({ verified: false, error: 'invalid_request' });

  const codesFile = j(storageDir, 'codes.json');
  const codes = await loadJson(codesFile);
  const row = codes[hash];

  const valid = row && row.code === code && row.expiresAt > Date.now();
  if (!valid) return res.json({ verified: false });

  setCookie(res, cookieName, hash, cookieDays, false); // set to true if behind HTTPS
  res.json({ verified: true });
});

// Return bookmarks for verified user
app.get('/user/bookmarks', async (req, res) => {
  const hash = getCookie(req, cookieName);
  if (!hash) return res.json([]); // or res.status(401).json({error:'unauthorized'})

  const file = j(storageDir, 'users', hash, 'bookmarks.json');
  const data = await loadJson(file);
  const list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  res.json(list);
});

// Start ------------------------
app.listen(PORT, () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});

```