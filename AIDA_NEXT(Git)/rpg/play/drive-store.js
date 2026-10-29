(function(){'use strict';
const E=()=>RPG_THEATER_ENGINE,NS='aida-rpg-hosted-play-v1',ROOTNS='aida-rpg-stage-20261029-v1';
const ROOTNAME='Aida RPG STAGING disposable 2026-10-29',DIRNAME='Hosted Play disposable v1';
// Exact existing credential descriptor only. This is a read capability, never a write target.
const CREDENTIAL_PARENT='1s-VljHb0SCPLcXvNfQ-wRonIl43jwT7I',CREDENTIAL_NAME='llm_fragments.json';
const rootQuery="'root' in parents and name = '"+ROOTNAME+"' and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='rpg_staging' and value='"+ROOTNS+"' } and trashed = false";
const safeId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{4,160}$/.test(id);
function create(nativeFetch,pendingStorage,onStatus=()=>{}){
 const rt={tokens:{drive:{}},boot:{},drive:{folderId:'theater-discovery-only',fileIndex:{},files:{}}},cfg={google:RPG_STAGE_GOOGLE,drive:{jsonFolderId:null}};
 let root=null,folder=null,query=null,folderUpload=null,upload=null,metadataId=null,credentialReadId=null,busy=false,wasReady=false;
 const readable=new Set();
 const prefix=NS+'.pending.',folderKey=NS+'.folder-create';
 function jsonGet(key){const raw=pendingStorage.getItem(key);if(!raw)return null;try{return JSON.parse(raw);}catch{throw Error('RPG pending save is unreadable; retained without reset.');}}
 function jsonSet(key,x){pendingStorage.setItem(key,JSON.stringify(x));}
 function headers(extra={}){return {...extra,Authorization:'Bearer '+rt.tokens.drive.accessToken};}
 async function guarded(url,o={}){
  const u=new URL(url),m=o.method||'GET';if(u.origin!=='https://www.googleapis.com'||u.hash||u.username||u.password)throw Error('Only scoped Google Drive requests are permitted.');
  if(!rt.tokens.drive.accessToken||o.headers?.Authorization!=='Bearer '+rt.tokens.drive.accessToken)throw Error('Google authorization is required.');
  let body=o.body;
  if(u.pathname==='/drive/v3/files'&&m==='GET'){
   if(!query||u.searchParams.get('q')!==query)throw Error('Unscoped Drive listing denied.');u.searchParams.set('fields','nextPageToken,files(id,name,mimeType,parents,appProperties)');
  }else if(u.pathname==='/drive/v3/files/generateIds'&&m==='GET'){
   if(u.searchParams.get('count')!=='1'||u.searchParams.get('space')!=='drive')throw Error('Invalid ID allocation.');
  }else if(u.pathname==='/drive/v3/files'&&m==='POST'){
   if(!folderUpload||body!==JSON.stringify(folderUpload))throw Error('Only the new Theater subfolder may be created.');
  }else if(u.pathname==='/upload/drive/v3/files'&&m==='POST'){
   if(!folder||!upload||u.searchParams.get('uploadType')!=='multipart')throw Error('Snapshot upload not authorized.');
   const boundary=o.headers['Content-Type']?.match(/^multipart\/related; boundary=(aida_asset_\d+)$/)?.[1];
   const original={name:upload.name,mimeType:'application/json',parents:[folder]},text=JSON.stringify(upload.envelope);
   const expected=boundary?`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(original)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${boundary}--\r\n`:null;
   if(await body.text()!==expected)throw Error('Unexpected upload content or parent; no fallback.');
   const meta={...original,id:upload.id,appProperties:{rpg_namespace:NS,campaign:upload.envelope.campaign_id,rpg_hash:upload.envelope.hash}};
   body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${boundary}--\r\n`],{type:o.headers['Content-Type']});
  }else if(m==='GET'&&credentialReadId&&u.pathname==='/drive/v3/files/'+credentialReadId&&u.searchParams.get('alt')==='media'){
   // Only readCredentialFragments can install this temporary read-only capability.
  }else if(m==='GET'&&metadataId&&u.pathname==='/drive/v3/files/'+metadataId&&u.searchParams.get('fields')==='id,name,mimeType,parents,appProperties'){
   // Metadata only; content remains forbidden until namespace/parent validation.
  }else if(m==='GET'&&u.searchParams.get('alt')==='media'&&readable.has(u.pathname.slice('/drive/v3/files/'.length))&&u.pathname.startsWith('/drive/v3/files/')){
  }else throw Error('Drive operation denied: no updates, deletes, production files or provider calls.');
  return nativeFetch(u.toString(),{...o,body,redirect:'error',signal:AbortSignal.timeout(25000)});
 }
 const io=createStagingMobileIO({runtime:rt,config:cfg,fetch:guarded,log:message=>{
  if(rt.boot.driveConnected&&!wasReady){wasReady=true;onStatus('Google authorized. Open the disposable campaign.');}
  else if(String(message).includes('failed')||String(message).includes('cancel'))onStatus('Google sign-in failed or cancelled. No storage fallback.');
 }});
 function requireAuth(){if(!rt.tokens.drive.accessToken)throw Error('Use Google sign-in first.');}
 async function list(q){query=q;rt.drive.folderId=folder||'theater-discovery-only';try{const rows=await io.listDriveFiles({query:q,readTimeoutMs:25000});if(rows.length>1000)throw Error('Prototype file bound exceeded; no partial load.');return rows;}finally{query=null;}}
 async function allocate(){const r=await guarded('https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&fields=ids',{headers:headers()});if(!r.ok)throw Error('Drive ID allocation failed: HTTP '+r.status);const j=await r.json();if(j.ids?.length!==1||!safeId(j.ids[0]))throw Error('Invalid generated file ID.');return j.ids[0];}
 async function ensureFolder(createIfMissing){
  requireAuth();const roots=await list(rootQuery);
  if(roots.length!==1||!safeId(roots[0].id)||roots[0].name!==ROOTNAME||roots[0].mimeType!=='application/vnd.google-apps.folder'||roots[0].appProperties?.rpg_staging!==ROOTNS)throw Error('Verified RPG staging root unavailable/ambiguous. No root or production fallback.');
  root=roots[0].id;
  const q="'"+root+"' in parents and name = '"+DIRNAME+"' and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='rpg_namespace' and value='"+NS+"' } and trashed = false";
  let rows=await list(q);
  if(rows.length>1)throw Error('Multiple Theater folders: stop without selecting or merging.');
  if(!rows.length){
   if(!createIfMissing)throw Error('Theater folder not found; no automatic replacement.');
   let p=jsonGet(folderKey);
   if(p&&(p.namespace!==NS||p.parent!==root||!safeId(p.id)))throw Error('Folder retry belongs to another account/scope.');
   if(!p){p={namespace:NS,parent:root,id:await allocate()};jsonSet(folderKey,p);}
   folderUpload={id:p.id,name:DIRNAME,mimeType:'application/vnd.google-apps.folder',parents:[root],appProperties:{rpg_namespace:NS}};
   let r;try{r=await guarded('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,parents,appProperties',{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify(folderUpload)});}finally{folderUpload=null;}
   if(!r.ok&&r.status!==409)throw Error('Theater folder creation failed: HTTP '+r.status+'; retry ID retained.');
   rows=await list(q);if(rows.length!==1)throw Error('Created folder not independently verified; retry state retained.');
  }
  const f=rows[0];if(!safeId(f.id)||f.name!==DIRNAME||f.mimeType!=='application/vnd.google-apps.folder'||!f.parents?.includes(root)||f.appProperties?.rpg_namespace!==NS)throw Error('Invalid Theater folder metadata.');
  folder=f.id;rt.drive.folderId=folder;pendingStorage.removeItem(folderKey);return folder;
 }
 function validMeta(m,id){return safeId(m?.id)&&m.name?.match(/^save_\d{2,4}_[0-9a-f-]{36}\.json$/)&&m.mimeType==='application/json'&&m.parents?.length===1&&m.parents[0]===folder&&m.appProperties?.rpg_namespace===NS&&m.appProperties?.campaign===id&&/^[a-f0-9]{64}$/.test(m.appProperties?.rpg_hash||'');}
 async function read(m,id){
  if(!validMeta(m,id))throw Error('Foreign snapshot metadata denied.');readable.add(m.id);rt.drive.fileIndex={[m.name]:m};rt.drive.files={};
  const e=await io.fetchJsonByName(m.name,'RPG-only immutable snapshot');await E().verify(e,id);if(e.hash!==m.appProperties.rpg_hash)throw Error('Snapshot content/metadata hash mismatch.');return e;
 }
 async function loadUnlocked(id){
  E().definition(id);await ensureFolder(false);const files=await list("'"+folder+"' in parents and appProperties has { key='campaign' and value='"+id+"' } and trashed = false");
  const own=[];for(const m of files){if(m.appProperties?.rpg_namespace!==NS)throw Error('Unexpected record in Theater folder; no partial scan.');if(m.appProperties.campaign!==id)continue;if(!validMeta(m,id))throw Error('Invalid snapshot metadata.');own.push(m);}
  if(own.length>1000)throw Error('1000-save safety bound reached; no partial history.');
  const records=[];for(const m of own)records.push(await read(m,id));records.sort((a,b)=>a.revision-b.revision);
  let previous=null;
  for(let i=0;i<records.length;i++){
   const e=records[i];if(e.revision!==i||e.parent_hash!==(previous?.hash||null))throw Error('Conflicting or incomplete save chain. Stop; no automatic merge/rewrite.');
   if(previous&&(JSON.stringify(e.snapshot.core.events.slice(0,previous.snapshot.core.events.length))!==JSON.stringify(previous.snapshot.core.events)||JSON.stringify(e.snapshot.applied_ops.slice(0,-1))!==JSON.stringify(previous.snapshot.applied_ops)))throw Error('Saved history was rewritten.');
   previous=e;
  }
  return previous;
 }
 function pending(id){E().definition(id);const p=jsonGet(prefix+id);if(!p)return null;if(p.namespace!==NS||p.envelope?.campaign_id!==id||!safeId(p.folder)||p.file_id!==null&&!safeId(p.file_id))throw Error('Invalid pending save; retained.');return p;}
 async function finish(p){
  const e=p.envelope,id=e.campaign_id;await E().verify(e,id);await ensureFolder(false);if(p.folder!==folder)throw Error('Pending save belongs to another Drive account/folder.');
  const current=await loadUnlocked(id);
  if(current?.snapshot.applied_ops.includes(e.operation_id)){
   const files=await list("'"+folder+"' in parents and trashed = false"),match=files.find(m=>m.id===p.file_id);
   if(!match|| (await read(match,id)).hash!==e.hash)throw Error('Operation ID conflicts with existing save.');
   pendingStorage.removeItem(prefix+id);return current;
  }
  if(e.parent_hash!==(current?.hash||null)||e.revision!==(current?current.revision+1:0))throw Error('Another turn was committed; pending save retained. Reload; no silent rebase.');
  if(!p.file_id){p.file_id=await allocate();jsonSet(prefix+id,p);}
  const name='save_'+String(e.revision).padStart(2,'0')+'_'+e.operation_id+'.json';
  upload={id:p.file_id,name,envelope:e};rt.drive.fileIndex={theater_sentinel:{id:'never-used'}};
  try{await io.putFile(name,JSON.stringify(e),'application/json');}
  catch(error){
   // A timed-out upload may have committed. Check only this preallocated ID.
   metadataId=p.file_id;let r;try{r=await guarded('https://www.googleapis.com/drive/v3/files/'+p.file_id+'?fields=id,name,mimeType,parents,appProperties',{headers:headers()});}finally{metadataId=null;}
   if(!r.ok)throw Error('Save is unresolved; exact pending record and file ID retained. Use Recover pending save.');
   const saved=await read(await r.json(),id);if(saved.hash!==e.hash)throw Error('Preallocated ID returned conflicting content.');
  }finally{upload=null;}
  const saved=await loadUnlocked(id);if(!saved?.snapshot.applied_ops.includes(e.operation_id))throw Error('Save not fully verified; pending data retained.');
  pendingStorage.removeItem(prefix+id);return saved;
 }
 async function exclusive(fn){if(busy)throw Error('A Drive operation is already running.');busy=true;try{return await fn();}finally{busy=false;}}
 return Object.freeze({prepare:()=>io.initTokenClient(),connect:()=>io.requestDriveToken(),ready:()=>Boolean(rt.tokens.drive.accessToken),pending,
  readCredentialFragments:()=>exclusive(async()=>{
   requireAuth();
   const q="'"+CREDENTIAL_PARENT+"' in parents and name = '"+CREDENTIAL_NAME+"' and trashed = false";
   const files=await list(q);
   if(files.length!==1||!safeId(files[0].id)||files[0].name!==CREDENTIAL_NAME||files[0].parents?.length!==1||files[0].parents[0]!==CREDENTIAL_PARENT||files[0].mimeType?.startsWith('application/vnd.google-apps.'))throw Error('Designated credential descriptor is missing, ambiguous or outside its allowed parent.');
   credentialReadId=files[0].id;
   try{
    const r=await guarded('https://www.googleapis.com/drive/v3/files/'+credentialReadId+'?alt=media',{headers:headers()});
    if(!r.ok)throw Error('Credential descriptor read failed: HTTP '+r.status);
    const raw=await r.text();if(raw.length>131072)throw Error('Credential descriptor exceeds its bounded size.');
    try{return JSON.parse(raw.replace(/^\uFEFF/,''));}catch{throw Error('Credential descriptor is not valid JSON. No values logged.');}
   }finally{credentialReadId=null;}
  }),
  open:id=>exclusive(async()=>{E().definition(id);await ensureFolder(true);const existing=await loadUnlocked(id);if(existing)return existing;if(pending(id))throw Error('Recover pending save before opening an empty campaign.');const e=await E().envelope(E().seed(id,crypto.randomUUID()));const p={namespace:NS,folder,file_id:null,envelope:e};jsonSet(prefix+id,p);return finish(p);}),
  load:id=>exclusive(()=>loadUnlocked(id)),
  save:e=>exclusive(async()=>{E().definition(e.campaign_id);await E().verify(e,e.campaign_id);if(pending(e.campaign_id))throw Error('Recover the existing pending save first.');await ensureFolder(false);const p={namespace:NS,folder,file_id:null,envelope:e};jsonSet(prefix+e.campaign_id,p);return finish(p);}),
  recover:id=>exclusive(async()=>{const p=pending(id);if(!p)throw Error('No pending RPG save.');return finish(p);})});
}
window.RPG_THEATER_STORE=Object.freeze({create});
})();
