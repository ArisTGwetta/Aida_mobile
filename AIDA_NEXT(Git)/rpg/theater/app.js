(function(){'use strict';
const E=()=>RPG_THEATER_ENGINE;
function create(store,capture=()=>{}){
 let current=null,busy=false;
 async function locked(fn){if(busy)throw Error('A turn is already running.');busy=true;try{return await fn();}finally{busy=false;}}
 function state(){return current?structuredClone(current):null;}
 async function mutate(action){return locked(async()=>{
  if(!current)throw Error('Open the campaign first.');if(store.pending(current.campaign_id))throw Error('A save is pending. Recover it before another turn.');
  const next=E().next(current.snapshot,action,crypto.randomUUID(),p=>{
   if(p.role==='Rias'&&p.source_ids.some(id=>current.snapshot.core.events.find(e=>e.id===id)?.layer==='meta'))throw Error('Private-source boundary violated. Stop.');capture(p);
  });
  const proposed=await E().envelope(next,current);current=await store.save(proposed);return state();
 });}
 return Object.freeze({state,busy:()=>busy,
  open:id=>locked(async()=>{current=await store.open(id);return state();}),
  reload:()=>locked(async()=>{if(!current)throw Error('Open the campaign first.');current=await store.load(current.campaign_id);return state();}),
  turn:(layer,text)=>mutate({type:'turn',layer,text}),publish:text=>mutate({type:'publish',text}),
  recover:id=>locked(async()=>{current=await store.recover(id);return state();})});
}
window.RPG_THEATER_APP=Object.freeze({create});
if(!document.getElementById('theater'))return;
const $=id=>document.getElementById(id);
try{localStorage.getItem(E().NS+'.capability');}catch{ $('status').textContent='RPG-only local recovery storage is unavailable. No model or Drive write will start.';return; }
const store=RPG_THEATER_STORE.create(window.fetch.bind(window),localStorage,message=>{$('status').textContent=message;});
let lastPrompt=null,layer='in_game',work=false;
const app=create(store,p=>{lastPrompt={recipient:p.role,source_count:p.source_ids.length,private_source_count:p.source_ids.filter(id=>app.state()?.snapshot.core.events.find(e=>e.id===id)?.layer==='meta').length};});
const campaignId=()=> $('campaign').value,draftKey=()=>E().NS+'.draft.'+campaignId()+'.'+layer;
for(const c of E().CAMPAIGNS){const o=document.createElement('option');o.value=c.id;o.textContent=c.title;$('campaign').appendChild(o);}
function render(){
 const e=app.state();$('timeline').textContent='';
 for(const event of e?.snapshot.core.events||[]){
  if($('view').value==='story'&&event.layer==='meta')continue;
  const item=document.createElement(event.layer==='meta'?'details':'article');if(event.layer==='meta'){item.open=true;const label=document.createElement('summary');label.textContent='PRIVATE META · '+event.speaker+' → '+event.audience.join(', ');item.appendChild(label);}else{const label=document.createElement('strong');label.textContent='#'+event.seq+' · '+event.speaker+' → '+event.audience.join(', ')+(event.kind==='world_event'?' · committed world event':'');item.appendChild(label);}
  const p=document.createElement('p');p.textContent=event.text;item.appendChild(p);$('timeline').appendChild(item);
 }
 const events=e?.snapshot.core.events||[];
 $('diagnostics').textContent=JSON.stringify({campaign_id:e?.campaign_id||null,revision:e?.revision??null,event_count:events.length,duplicate_event_ids:events.length-new Set(events.map(x=>x.id)).size,committed_operations:e?.snapshot.applied_ops.length||0,latest_hash:e?.hash||null,last_mock_prompt:lastPrompt,hosted_calls:0,hosted_spend_usd:0,pending_save:Boolean(store.pending(campaignId()))},null,2);
 $('identity').textContent=layer==='meta'?'Francisco → Aida only · PRIVATE META':'MonAmour → Rias · IN-GAME speech/action';
 $('meta').setAttribute('aria-pressed',String(layer==='meta'));$('game').setAttribute('aria-pressed',String(layer==='in_game'));
 for(const id of ['send','publish','rehearse','continue'])$(id).disabled=work||!e;
 $('recover').disabled=work||!store.pending(campaignId());$('open').disabled=work;$('connect').disabled=work;
 for(const id of ['game','meta','input','world','campaign'])$(id).disabled=work;
}
async function operate(fn){if(work)return;work=true;render();$('status').textContent='Saving / verifying RPG-only Drive records…';try{
 const task=()=>fn();if(navigator.locks)await navigator.locks.request(E().NS,{mode:'exclusive'},task);else await task();
 $('status').textContent='Saved and verified in RPG-only Drive storage. Mock replies; no model calls.';
}catch(e){$('status').textContent='STOP: '+e.message+' Draft and pending save retained. Use Recover pending save; no automatic retry.';}finally{work=false;render();}}
function switchLayer(next){localStorage.setItem(draftKey(),$('input').value);layer=next;$('input').value=localStorage.getItem(draftKey())||'';render();}
const META='Private rehearsal: MonAmour is considering confessing his feelings. BLUE-LANTERN-SECRET must stay between Francisco and Aida.';
$('connect').onclick=()=>store.connect();$('open').onclick=()=>operate(()=>app.open(campaignId()));
$('meta').onclick=()=>switchLayer('meta');$('game').onclick=()=>switchLayer('in_game');$('view').onchange=render;
$('input').oninput=()=>localStorage.setItem(draftKey(),$('input').value);
$('send').onclick=()=>operate(async()=>{await app.turn(layer,$('input').value);localStorage.removeItem(draftKey());$('input').value='';});
$('publish').onclick=()=>operate(async()=>{await app.publish($('world').value);$('world').value='';});
$('recover').onclick=()=>operate(async()=>{await app.recover(campaignId());const last=app.state()?.snapshot.core.events.filter(e=>['Francisco','MonAmour'].includes(e.speaker)).at(-1);if(last?.text===$('input').value){localStorage.removeItem(draftKey());$('input').value='';}});
$('rehearse').onclick=()=>operate(async()=>{
 if(app.state().snapshot.core.events.length!==1)throw Error('Rehearsal starts only from the fresh fixture. Existing story will not be overwritten.');
 await app.turn('meta',META);await app.turn('in_game','The sunset is beautiful.');await app.turn('in_game','MonAmour takes the chair beside the window.');
 if(app.state().snapshot.core.events.length!==7)throw Error('Unexpected rehearsal event count.');
});
$('continue').onclick=()=>operate(async()=>{
 await app.reload();const n=app.state().snapshot.core.events.length;
 if(n===9)return; // Repeat verification is read-only, not another story turn.
 if(n!==7)throw Error('Expected the seven-event rehearsal after reload. No automatic alteration.');
 await app.turn('in_game','MonAmour asks whether Rias likes the lantern.');await app.reload();if(app.state().snapshot.core.events.length!==9)throw Error('Continuation did not verify.');
});
$('input').value=localStorage.getItem(draftKey())||'';render();store.prepare().catch(()=>{$('status').textContent='Google initialization failed. Existing campaign untouched.';});
})();
