/* Private Snail INDEX v0.1: pure validation/search; no I/O or Aida dependencies. */
(function (root) {
  'use strict';
  function normalize(s) {
    return String(s || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function validateManifest(m) {
    if (!m || m.kind !== 'snail_private_aida_bridge_candidate' || m.schema_version !== 1 ||
        m.private !== true || !Number.isSafeInteger(m.records) || m.records < 1 || m.records > 250000 ||
        !Array.isArray(m.shards) || !m.shards.length || m.shards.length > 100) {
      throw new Error('Unexpected private Snail manifest.');
    }
    let sum = 0;
    const names = new Set();
    for (let i = 0; i < m.shards.length; i++) {
      const s = m.shards[i];
      const expected = `aida_shard_${String(i+1).padStart(4,'0')}.json`;
      if (!s || s.file !== expected || names.has(s.file) ||
          !Number.isSafeInteger(s.records) || s.records < 1 || s.records > 5000 ||
          typeof s.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(s.sha256)) {
        throw new Error('Invalid private Snail shard definition.');
      }
      names.add(s.file);
      sum += s.records;
    }
    if (sum !== m.records) throw new Error('Manifest record counts disagree.');
    return m;
  }
  function validateShard(s, definition) {
    if (!s || s.schema_version !== 1 || !Array.isArray(s.documents) || s.documents.length !== definition.records)
      throw new Error('Shard schema or count mismatch.');
    for (const d of s.documents) {
      if (!d || typeof d.id !== 'string' || !/^snail-\d+$/.test(d.id) ||
          typeof d.title !== 'string' || !Array.isArray(d.locations) || d.locations.length > 50)
        throw new Error('Invalid Snail record.');
      for (const l of d.locations) {
        if (!l || typeof l.provider !== 'string' || !['verified','stale','unverified'].includes(l.status) ||
            (l.path != null && typeof l.path !== 'string') ||
            (l.url != null && (typeof l.url !== 'string' || !/^https:\/\//.test(l.url)))) {
          throw new Error('Invalid Snail location.');
        }
      }
    }
    return s;
  }
  function searchShard(shard, terms, limit=100) {
    const tokens = normalize(terms).split(' ').filter(Boolean);
    if (!tokens.length || tokens.length > 12 || terms.length > 180) throw new Error('Search requires 1–180 characters and at most 12 words.');
    const hits = [];
    let matches = 0;
    for (const d of shard.documents) {
      const title = normalize(d.title);
      const aliases = normalize(Array.isArray(d.aliases) ? d.aliases.join(' ') : '');
      const text = title + ' ' + aliases;
      if (!tokens.every(x=>text.includes(x))) continue;
      matches++;
      const verified = d.locations.some(l=>l.status === 'verified');
      const score = tokens.reduce((n,t)=>n+(title.includes(t)?10:0)+(aliases.includes(t)?3:0),0)+(verified?2:0);
      hits.push({ id:d.id, title:d.title, locations:d.locations, score });
    }
    hits.sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title));
    return {count:matches,hits:hits.slice(0,limit)};
  }
  const api = Object.freeze({normalize,validateManifest,validateShard,searchShard});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && typeof root === 'object') root.AIDA_SNAIL_INDEX_CORE = api;
})(typeof window === 'object' ? window : null);
