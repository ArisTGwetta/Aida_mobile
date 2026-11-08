/* Optional Snail private Google Drive INDEX probe, TEST GATE ONLY.
 * Requires snail_index_core.js and the existing Aida OAuth session.
 * Makes no boot, memory, router, or write changes. Never sends catalog to an LLM.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || new URLSearchParams(location.search).get('aida_file_index_test') !== '1') return;
  const CORE = window.AIDA_SNAIL_INDEX_CORE;
  if (!CORE) return;
  const PRIVATE_FOLDER_NAME = 'SNAIL_INDEX_PRIVATE';
  const MANIFEST_NAME = 'manifest_PRIVATE.json';
  const MIME_JSON = 'application/json';
  const MIME_FOLDER = 'application/vnd.google-apps.folder';
  const MAX_JSON_BYTES = 16 * 1024 * 1024;
  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
  let panel, status, input, results, trigger;
  function token() {
    const value=window.AIDA_RUNTIME?.tokens?.drive?.accessToken;
    if (!value) throw new Error('Aida Google OAuth is not connected.');
    return value;
  }
  function approvedParent() {
    const x = window.AIDA_CONFIG?.drive?.jsonFolderId;
    if (!x || !/^[a-zA-Z0-9_-]{12,}$/.test(x)) throw new Error('Aida approved JSON folder unavailable.');
    return x;
  }
  async function request(url, binary=false) {
    const res=await fetch(url, {headers:{Authorization:`Bearer ${token()}`},cache:'no-store'});
    if (!res.ok) throw new Error(`Google Drive read failed (${res.status}).`);
    if (binary) {
      const len=Number(res.headers.get('content-length')||0);
      if (len > MAX_JSON_BYTES) throw new Error('Private JSON file exceeds size guard.');
      const bytes=await res.arrayBuffer();
      if (bytes.byteLength > MAX_JSON_BYTES) throw new Error('Private JSON file exceeds size guard.');
      return bytes;
    }
    return res.json();
  }
  async function listChildren(parentId,name) {
    // User queries are never placed into Drive URLs; names are internal constants.
    const q=`'${parentId}' in parents and name = '${name}' and trashed = false`;
    const params=new URLSearchParams({q,fields:'nextPageToken,files(id,name,mimeType,parents,trashed,size)',pageSize:'100',spaces:'drive'});
    let url=`${DRIVE_API}?${params}`;
    const found=[];
    for(let n=0;n<5 && url;n++) {
      const data=await request(url);
      if (!Array.isArray(data.files)) throw new Error('Unexpected Drive listing.');
      found.push(...data.files);
      url=data.nextPageToken ? `${DRIVE_API}?${params}&pageToken=${encodeURIComponent(data.nextPageToken)}` : null;
      if(n===4 && url) throw new Error('Too many matching Drive items.');
    }
    return found.filter(x=>x.name===name && x.trashed===false && x.parents?.includes(parentId));
  }
  async function oneChild(parent,name,mime) {
    const matches=await listChildren(parent,name);
    if(matches.length!==1 || matches[0].mimeType!==mime) throw new Error(`Expected one authorized ${name}; found ${matches.length}.`);
    return matches[0];
  }
  function mediaUrl(id) { return `${DRIVE_API}/${encodeURIComponent(id)}?alt=media`; }
  async function readJson(item,hash) {
    const bytes=await request(mediaUrl(item.id),true);
    if(hash) {
      if (!crypto?.subtle) throw new Error('Browser integrity hashing is unavailable.');
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      const hex=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
      if(hex!==hash.toLowerCase()) throw new Error(`Checksum mismatch: ${item.name}.`);
    }
    try { return JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/,'')); }
    catch(_) { throw new Error(`Invalid JSON: ${item.name}.`); }
  }
  function line(parent,txt) { const p=document.createElement('p');p.textContent=txt;parent.append(p);return p; }
  function showMatches(query,number,hits) {
    results.replaceChildren();
    line(results,`${number.toLocaleString()} matches for “${query}”; showing ${hits.length}.`);
    if(!hits.length)line(results,'No catalog match. This does not prove the file never existed.');
    for(const hit of hits) {
      const sec=document.createElement('section');sec.style.cssText='border-top:1px solid #b8c3ce;padding:.4rem 0';
      const title=document.createElement('strong');title.textContent=hit.title;sec.append(title);
      for(const loc of hit.locations) {
        const note=loc.provider==='google_drive_mount' ? 'Sparks G: mount; not a phone link' :
          loc.provider==='windows' ? 'Sparks local path' : loc.provider==='web_bookmark' ? 'Unverified web bookmark' : loc.provider;
        line(sec,`${note} · ${loc.status}: ${loc.path || loc.url || '(no address)'}`);
      }
      results.append(sec);
    }
  }
  async function runSearch(q) {
    trigger.disabled=true; status.textContent='Authenticating and reading private Snail catalog…';results.replaceChildren();
    try {
      const root=approvedParent();
      const dir=await oneChild(root,PRIVATE_FOLDER_NAME,MIME_FOLDER);
      const manifestFile=await oneChild(dir.id,MANIFEST_NAME,MIME_JSON);
      const manifest=CORE.validateManifest(await readJson(manifestFile));
      let count=0;const hits=[];let checked=0;
      for(const definition of manifest.shards) {
        const item=await oneChild(dir.id,definition.file,MIME_JSON);
        const shard=CORE.validateShard(await readJson(item,definition.sha256),definition);
        const r=CORE.searchShard(shard,q,100);
        count+=r.count;hits.push(...r.hits);checked++;
        status.textContent=`Verified ${checked}/${manifest.shards.length} private segments…`;
      }
      hits.sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title));
      showMatches(q,count,hits.slice(0,20));
      status.textContent=`PASS: ${manifest.records.toLocaleString()} private records checked. Results stayed in this page.`;
    } catch(e) {
      status.textContent=`INDEX test failed: ${String(e?.message||e)}`;
      line(results,'No fallback to public search or Aida memory.');
    } finally { trigger.disabled=false; }
  }
  function mount() {
    panel=document.createElement('section');panel.id='snail-index-private-test';
    panel.style.cssText='position:fixed;left:1rem;bottom:5rem;z-index:10001;max-width:min(42rem,92vw);max-height:75vh;overflow:auto;background:#f6f8fc;color:#18212b;padding:.75rem;border:2px solid #687f9a;border-radius:10px;box-shadow:0 8px 30px #0004;font:13px/1.45 system-ui';
    const detail=document.createElement('details');
    const summary=document.createElement('summary');summary.textContent='Snail private INDEX test (OAuth)';detail.append(summary);
    const note=document.createElement('p');note.textContent='Explicit test only. Private Drive catalog is read on demand; nothing is added to Aida memory or sent to the LLM.';detail.append(note);
    input=document.createElement('input');input.value='Watson';input.setAttribute('aria-label','Snail catalog search');input.maxLength=180;
    trigger=document.createElement('button');trigger.type='button';trigger.textContent='Find in Snail';trigger.onclick=()=>{const q=input.value.trim();if(q)runSearch(q);};
    status=document.createElement('p');status.textContent='Ready. No data loaded.';
    results=document.createElement('div');detail.append(input,trigger,status,results);panel.append(detail);document.body.append(panel);
  }
  window.AIDA_SNAIL_TEST=Object.freeze({search:runSearch});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
