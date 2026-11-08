/* Snail v1.0: standalone, browser-only, read-only private Drive INDEX. */
(function () {
  'use strict';
  const core = window.AIDA_SNAIL_INDEX_CORE;
  const config = window.AIDA_CONFIG;
  const API = 'https://www.googleapis.com/drive/v3/files';
  const FOLDER = 'SNAIL_INDEX_PRIVATE';
  const MANIFEST = 'manifest_PRIVATE.json';
  const JSON_MIME = 'application/json';
  const FOLDER_MIME = 'application/vnd.google-apps.folder';
  const MAX_JSON_BYTES = 16 * 1024 * 1024;
  const connect = document.getElementById('connect');
  const authStatus = document.getElementById('auth-status');
  const form = document.getElementById('search-form');
  const input = document.getElementById('query');
  const find = document.getElementById('find');
  const status = document.getElementById('search-status');
  const results = document.getElementById('results');
  let token = null;
  let tokenClient = null;
  let busy = false;
  function setStatus(message) { status.textContent = message; }
  function textElement(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }
  function setBusy(value) { busy = value; find.disabled = value || !token; connect.disabled = value || !tokenClient; }
  function requestUrl(parentId, name) {
    // The query uses only our approved folder ID and hard-coded, validated names.
    const q = `'${parentId}' in parents and name = '${name}' and trashed = false`;
    const params = new URLSearchParams({ q, fields: 'nextPageToken,files(id,name,mimeType,parents,trashed,size)', pageSize: '100', spaces: 'drive' });
    return `${API}?${params.toString()}`;
  }
  async function driveGet(url, binary) {
    if (!token) throw new Error('Connect to Google Drive first.');
    const response = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 401) { token = null; find.disabled = true; authStatus.textContent = 'Session expired. Connect again.'; }
      throw new Error(`Google Drive read failed (HTTP ${response.status}).`);
    }
    if (!binary) return response.json();
    const length = Number(response.headers.get('content-length') || '0');
    if (length > MAX_JSON_BYTES) throw new Error('Private JSON file exceeds the size limit.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_JSON_BYTES) throw new Error('Private JSON file exceeds the size limit.');
    return bytes;
  }
  async function oneChild(parentId, name, mime) {
    if (!/^[A-Za-z0-9_-]{12,}$/.test(parentId) || !/^[A-Za-z0-9_.-]{1,100}$/.test(name))
      throw new Error('Invalid private catalog path.');
    const paramsUrl = requestUrl(parentId, name);
    let url = paramsUrl;
    let matches = [];
    for (let i = 0; i < 5 && url; i++) {
      const page = await driveGet(url, false);
      if (!Array.isArray(page.files)) throw new Error('Unexpected Google Drive listing.');
      matches = matches.concat(page.files.filter(x => x.name === name && x.trashed === false && x.parents?.includes(parentId)));
      if (i === 4 && page.nextPageToken) throw new Error('Too many matching Drive files.');
      url = page.nextPageToken ? `${paramsUrl}&pageToken=${encodeURIComponent(page.nextPageToken)}` : null;
    }
    if (matches.length !== 1 || matches[0].mimeType !== mime || !/^[A-Za-z0-9_-]{12,}$/.test(matches[0].id))
      throw new Error(`Expected one authorized ${name}; found ${matches.length}.`);
    return matches[0];
  }
  async function readJson(file, sha256) {
    const bytes = await driveGet(`${API}/${encodeURIComponent(file.id)}?alt=media`, true);
    if (sha256) {
      if (!window.crypto?.subtle) throw new Error('Browser integrity hashing is unavailable.');
      const bytesHash = await window.crypto.subtle.digest('SHA-256', bytes);
      const actual = Array.from(new Uint8Array(bytesHash), x => x.toString(16).padStart(2, '0')).join('');
      if (actual !== sha256.toLowerCase()) throw new Error(`Checksum mismatch: ${file.name}.`);
    }
    try { return JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/, '')); }
    catch (_) { throw new Error(`Invalid JSON: ${file.name}.`); }
  }
  async function copyAddress(address, button, block) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(address);
      button.textContent = 'Copied!';
      return;
    } catch (_) {
      // A non-secure browser context or denied clipboard permission must not lose the address.
      const field = document.createElement('textarea');
      field.value = address;
      field.readOnly = true;
      field.className = 'manual-copy';
      field.setAttribute('aria-label', 'Select and copy this address');
      field.rows = 2;
      block.append(field);
      field.focus();
      field.select();
      try {
        if (document.execCommand?.('copy')) { button.textContent = 'Copied!'; return; }
      } catch (_) { /* Manual selection remains visible. */ }
      button.textContent = 'Select address to copy';
    }
  }
  function showLocation(container, location) {
    const block = document.createElement('div');
    block.className = `loc${location.status === 'verified' ? '' : ' historical'}`;
    const where = location.provider === 'google_drive_mount' ? 'Google Drive folder mounted on Sparks (not a phone link)'
      : location.provider === 'windows' ? 'Sparks local path'
      : location.provider === 'web_bookmark' ? 'Web bookmark (destination not rechecked)'
      : location.provider;
    const seen = location.status === 'verified' ? 'Seen in latest scan'
      : location.status === 'stale' ? 'Previously seen; not in latest scan'
      : 'Location not verified';
    block.append(textElement('strong', `${seen} · ${where}`));
    const address = location.provider === 'web_bookmark' ? (location.url || location.path) : (location.path || location.url);
    block.append(textElement('code', address || 'No address recorded'));
    if (address) {
      const actions = document.createElement('div');
      actions.className = 'location-actions';
      const copy = textElement('button', 'Copy address', 'secondary');
      copy.type = 'button';
      copy.addEventListener('click', () => { void copyAddress(address, copy, block); });
      actions.append(copy);
      // Only a real HTTPS URL gets a clickable link. Windows and G: paths are text only.
      if (typeof location.url === 'string' && /^https:\/\//.test(location.url)) {
        const link = textElement('a', 'Open website');
        link.href = location.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        actions.append(link);
      }
      block.append(actions);
    }
    container.append(block);
  }
  function showHits(query, count, hits) {
    results.replaceChildren();
    results.append(textElement('p', `${count.toLocaleString()} matches for “${query}” · showing ${hits.length}.`, 'result-heading'));
    if (!hits.length) {
      results.append(textElement('p', 'No matching name or alias found. The file may still exist under another name.', 'empty'));
      return;
    }
    for (const hit of hits) {
      const card = document.createElement('article');
      card.className = 'result';
      card.append(textElement('h3', hit.title));
      for (const location of hit.locations) showLocation(card, location);
      results.append(card);
    }
  }
  async function runSearch(query) {
    if (busy || !token) return;
    const normalized = core.normalize(query).split(' ').filter(Boolean);
    if (!query || query.length > 180 || normalized.length > 12) {
      setStatus('Please use 1–180 characters and at most 12 words.');
      return;
    }
    setBusy(true);
    results.replaceChildren();
    setStatus('Finding and verifying the private catalog…');
    try {
      const parentId = config?.drive?.jsonFolderId;
      if (!parentId) throw new Error('Aida’s approved private JSON folder is unavailable.');
      const folder = await oneChild(parentId, FOLDER, FOLDER_MIME);
      const manifestFile = await oneChild(folder.id, MANIFEST, JSON_MIME);
      const manifest = core.validateManifest(await readJson(manifestFile));
      const hits = [];
      let count = 0;
      for (let i = 0; i < manifest.shards.length; i++) {
        const definition = manifest.shards[i];
        const shardFile = await oneChild(folder.id, definition.file, JSON_MIME);
        const shard = core.validateShard(await readJson(shardFile, definition.sha256), definition);
        const searched = core.searchShard(shard, query, 100);
        count += searched.count;
        hits.push(...searched.hits);
        setStatus(`Verified ${i + 1} of ${manifest.shards.length} private catalog segments…`);
      }
      hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
      showHits(query, count, hits.slice(0, 25));
      setStatus(`Search complete: ${manifest.records.toLocaleString()} catalog records checked. Results stay in this page.`);
    } catch (error) {
      setStatus(`Search couldn't complete: ${String(error?.message || error)} No public search or Aida memory was used.`);
    } finally { setBusy(false); }
  }
  form.addEventListener('submit', event => { event.preventDefault(); runSearch(input.value.trim()); });
  window.snailGoogleLoaded = function () {
    if (!core?.validateManifest || !config?.google?.clientId || !window.google?.accounts?.oauth2?.initTokenClient) {
      authStatus.textContent = 'Google sign-in or Snail search is unavailable.';
      return;
    }
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: config.google.clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      include_granted_scopes: false,
      callback: response => {
        if (!response?.access_token) { authStatus.textContent = 'Sign-in was canceled.'; return; }
        token = response.access_token;
        authStatus.textContent = 'Connected · read-only Google Drive token';
        connect.textContent = 'Reconnect Drive';
        setBusy(false);
        setStatus('Ready. Search your private catalog.');
      },
      error_callback: error => {
        authStatus.textContent = `Google sign-in failed: ${String(error?.type || 'unknown')}.`;
        setBusy(false);
      }
    });
    connect.disabled = false;
    connect.textContent = 'Connect Google Drive';
    authStatus.textContent = 'Ready · no Drive data loaded';
  };
  window.snailGoogleFailed = function () { authStatus.textContent = 'Google sign-in script failed to load.'; };
  connect.addEventListener('click', () => {
    if (!tokenClient || busy) return;
    authStatus.textContent = 'Opening Google sign-in…';
    tokenClient.requestAccessToken({ prompt: '' });
  });
})();
