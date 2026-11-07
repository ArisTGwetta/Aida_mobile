(function(){'use strict';
const NS='aida-rpg-stage-20261029-v1',FOLDER='Aida RPG STAGING disposable 2026-10-29',NAME='rpg-stage-roundtrip.json';
const folderQuery="'root' in parents and name = '"+FOLDER+"' and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='rpg_staging' and value='"+NS+"' } and trashed = false";
const packet=()=>({namespace:NS,campaign_id:'rpg-staging:disposable:lantern',kind:'disposable_roundtrip',version:1,text:'Synthetic lantern-room test only. No personal or production memory.'});
const samePacket=p=>JSON.stringify(p)===JSON.stringify(packet());
function createController(nativeFetch,ui){
 const rt={tokens:{drive:{}},boot:{},drive:{folderId:null,fileIndex:{},files:{}}};
 const cfg={google:RPG_STAGE_GOOGLE,drive:{jsonFolderId:null}};
 let folder=null,file=null,busy=false,folderVerified=false,fileVerified=false;
 const emit=(text)=>ui(text);
 const folderMeta=()=>({name:FOLDER,mimeType:'application/vnd.google-apps.folder',parents:['root'],appProperties:{rpg_staging:NS}});
 async function guardedFetch(url,options={}){
  const u=new URL(url),method=options.method||'GET';
  if(u.origin!=='https://www.googleapis.com'||u.hash||u.username||u.password)throw Error('Non-Drive destination denied.');
  const auth=options.headers?.Authorization;
  if(!rt.tokens.drive.accessToken||auth!=='Bearer '+rt.tokens.drive.accessToken)throw Error('Google authorization required.');
  if(u.pathname==='/drive/v3/files'&&method==='GET'){
   const q=u.searchParams.get('q'),expected=folderVerified?"'"+folder+"' in parents and trashed = false":folderQuery;
   if(q!==expected)throw Error('Unscoped Drive query denied.');
   u.searchParams.set('fields','nextPageToken,files(id,name,mimeType,parents,appProperties)');
  }else if(u.pathname==='/drive/v3/files'&&method==='POST'){
   if(folderVerified||options.body!==JSON.stringify(folderMeta()))throw Error('Only the dedicated test folder may be created.');
  }else if(u.pathname==='/upload/drive/v3/files'&&method==='POST'){
   if(!folderVerified||fileVerified||u.searchParams.get('uploadType')!=='multipart')throw Error('Test record creation denied.');
   const raw=await options.body.text();
   const meta=JSON.stringify({name:NAME,mimeType:'application/json',parents:[folder]});
   const boundary=options.headers['Content-Type']?.match(/^multipart\/related; boundary=(aida_asset_\d+)$/)?.[1];
   const expected=boundary?`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(packet())}\r\n--${boundary}--\r\n`:null;
   if(raw!==expected)throw Error('Only the exact disposable test record may be uploaded.');
  }else if(u.pathname==='/drive/v3/files/'+file&&method==='GET'&&u.searchParams.get('alt')==='media'){
   if(!folderVerified||!fileVerified)throw Error('Unverified file read denied.');
  }else throw Error('Drive operation denied: no updates, deletion, production paths or fallback.');
  return nativeFetch(u.toString(),{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
 }
 const io=createStagingMobileIO({runtime:rt,config:cfg,fetch:guardedFetch,log:message=>{
  if(rt.boot.driveConnected)emit('Google authorization obtained in page memory only. Ready for disposable Drive test.');
  else if(String(message).includes('failed')||String(message).includes('cancel'))emit('Google sign-in failed or cancelled. No Drive write. Retry explicitly.');
 }});
 function authOptions(extra={}){return {...extra,headers:{Authorization:'Bearer '+rt.tokens.drive.accessToken,'Content-Type':'application/json'}};}
 function validateFolder(x){return typeof x?.id==='string'&&x.name===FOLDER&&x.mimeType==='application/vnd.google-apps.folder'&&x.appProperties?.rpg_staging===NS;}
 async function discover(create){
  // Reset all target capabilities before rediscovery; never retain a stale target.
  folder=null;file=null;folderVerified=false;fileVerified=false;rt.drive.folderId=null;rt.drive.fileIndex={};rt.drive.files={};
  rt.drive.folderId='staging-discovery-only';
  let matches=await io.listDriveFiles({query:folderQuery,readTimeoutMs:20000});
  if(matches.length>1||matches.some(x=>!validateFolder(x)))throw Error('Ambiguous or invalid staging folder. Stop; no repair.');
  if(!matches.length){
   if(!create)throw Error('No staging record found. No replacement will be created during reload verification.');
   const r=await guardedFetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,parents,appProperties',authOptions({method:'POST',body:JSON.stringify(folderMeta())}));
   if(!r.ok)throw Error('Test folder creation failed: HTTP '+r.status);const x=await r.json();if(!validateFolder(x))throw Error('Unexpected test folder result.');matches=[x];
  }
  folder=matches[0].id;folderVerified=true;rt.drive.folderId=folder;
  const files=await io.listDriveFiles({readTimeoutMs:20000});
  if(files.length>1||files.some(x=>typeof x.id!=='string'||x.name!==NAME||x.mimeType!=='application/json'||!x.parents?.includes(folder)))throw Error('Unexpected file in staging folder. No overwrite.');
  if(files.length){file=files[0].id;fileVerified=true;rt.drive.fileIndex[NAME]=files[0];}
 }
 async function run(create){
  if(busy)throw Error('A test is already running.');if(!rt.tokens.drive.accessToken)throw Error('Use Google sign-in first.');busy=true;
  try{
   await discover(create);
   if(!fileVerified){
    if(!create)throw Error('No staging record found.');
    // Avoid Mobile's unscoped indexing path. Sentinel is private to this page.
    rt.drive.fileIndex={staging_sentinel:{id:'never-used'}};
    const saved=await io.putFile(NAME,JSON.stringify(packet()),'application/json');
    if(!saved.id)throw Error('Upload returned no file ID.');
    await discover(false);if(!fileVerified||file!==saved.id)throw Error('Saved record could not be independently located.');
   }
   const data=await io.fetchJsonByName(NAME,'RPG staging round-trip only');
   if(!samePacket(data))throw Error('Content verification failed. No overwrite or fallback.');
   const result={status:'PASS',namespace:NS,folder_id:folder,file_id:file,content_verified:true,mode:create?'create-or-read':'reload-read-only',model_calls:0};
   emit(JSON.stringify(result,null,2));return result;
  }catch(e){emit('STOP: '+e.message+' No production fallback. Existing data retained.');throw e;}finally{busy=false;}
 }
 return Object.freeze({connect:()=>io.requestDriveToken(),prepare:()=>io.initTokenClient(),roundtrip:()=>run(true),verifyReload:()=>run(false)});
}
window.RPG_STAGING_FACTORY=createController;
if(document.getElementById('status')){
 const status=document.getElementById('status'),c=createController(window.fetch.bind(window),message=>{status.textContent=message;});
 c.prepare().catch(()=>{status.textContent='Google sign-in initialization failed. No Drive operation attempted.';});
 document.getElementById('connect').onclick=()=>c.connect();
 document.getElementById('roundtrip').onclick=()=>c.roundtrip().catch(()=>{});
 document.getElementById('verify').onclick=()=>c.verifyReload().catch(()=>{});
}
})();
