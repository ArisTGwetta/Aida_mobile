(function(){'use strict';
const NS='aida-rpg-portable-theater-v1';
const CAMPAIGNS=Object.freeze([{id:'portable:lavender-manor:fixture:v1',title:'Lavender Manor · disposable theater',seed:'Lavender Manor: a quiet sitting room with a lantern, a table and a window at sunset. Rias and MonAmour are present. No romance or hidden knowledge is established.'}]);
const cp=x=>JSON.parse(JSON.stringify(x));
function definition(id){const d=CAMPAIGNS.find(x=>x.id===id);if(!d)throw Error('Campaign not authorized in this prototype.');return d;}
function coreFor(id){definition(id);return RPGLounge.forCampaign({worldId:id,projectId:'rpg-only:'+id});}
function restore(s){const core=coreFor(s.campaign_id),data=new Map([[core.KEY,JSON.stringify(s.core)]]);return core.create({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});}
const roles=RPG_ROLE_FACTORY();
function validate(s){
 if(!s||s.namespace!==NS||s.version!==1||s.title!==definition(s.campaign_id).title||!Array.isArray(s.applied_ops)||!s.applied_ops.length||s.applied_ops.length>30||new Set(s.applied_ops).size!==s.applied_ops.length||s.applied_ops.some(x=>!/^[0-9a-f-]{36}$/.test(x))||!Array.isArray(s.diagnostics)||s.diagnostics.length>30)throw Error('Invalid RPG-only snapshot.');
 coreFor(s.campaign_id).validate(s.core);if(s.core.pending)throw Error('Uncommitted draft cannot masquerade as a saved story.');
 for(const e of s.core.events){
  if(!['speech','aside','world_event'].includes(e.kind))throw Error('Unexpected event type.');
  if(e.kind==='world_event'){if(e.speaker!=='Aida'||e.layer!=='in_game'||e.authority!=='world_director')throw Error('Invalid public world event.');}
  else if(e.layer==='meta'){if(!['Francisco','Aida'].includes(e.speaker)||e.audience.length!==1||e.audience[0]!== (e.speaker==='Francisco'?'Aida':'Francisco'))throw Error('Private audience mismatch.');}
  else if(e.speaker==='MonAmour'){if(JSON.stringify(e.audience)!==JSON.stringify(['Rias','Aida']))throw Error('Player audience mismatch.');}
  else if(e.speaker==='Rias'){if(JSON.stringify(e.audience)!==JSON.stringify(['MonAmour','Aida']))throw Error('Character audience mismatch.');}
  else throw Error('Unrecognized actor.');
 }
 roles.validate(s,s.core.events);return s;
}
function seed(id,op){
 const d=definition(id),c=coreFor(id).create({getItem:()=>null,setItem(){}});c.publishWorld(d.seed);
 const core=c.snapshot();core.campaign={...c.campaign(),title:d.title};
 return validate({namespace:NS,version:1,campaign_id:id,title:d.title,core,roles:roles.fresh(core.events),applied_ops:[op],diagnostics:[]});
}
function next(base,action,op,onPrompt=()=>{}){
 validate(base);if(base.applied_ops.includes(op))throw Error('Operation already committed; recover its saved snapshot instead of generating again.');
 const s=cp(base),c=restore(s);
 if(!action||typeof action.text!=='string'||!action.text.trim()||action.text.length>2000)throw Error('Enter 1–2000 characters.');
 if(action.type==='publish')c.publishWorld(action.text);
 else if(action.type==='turn'&&['meta','in_game'].includes(action.layer)){
  c.stage(action.text,action.layer);c.beginLocal(c.snapshot().pending.id,'scripted-mock');
  s.core=c.snapshot();for(const e of s.core.events.slice(base.core.events.length))e.execution={provider:'fixture',model:'scripted-mock'};
  // Re-open the existing core with corrected execution metadata; no original engine edits.
  const turnCore=restore(s);roles.sync(s,s.core.events);const role=action.layer==='meta'?'Aida':'Rias';
  const prepared=roles.prepare(s,s.core.events,role);onPrompt(cp({campaign_id:s.campaign_id,role,...prepared}));
  const n=s.core.events.filter(e=>e.speaker==='Rias').length;
  const line=role==='Aida'?'I’m here with you outside the scene. We can explore that idea privately; it becomes story knowledge only if you explicitly commit a public world event.':[
   'Rias turns toward the window, resting one hand on the chair. “The sunset makes this room feel quieter. Would you like to sit with me?”',
   'She settles into the neighboring chair and gives a small, thoughtful smile. “I like having a little time without a plan. What would you like to talk about?”',
   'Rias glances at the lantern, then back to MonAmour. “We can take our time.” She waits, leaving his answer and choices to him.'
  ][Math.min(n,2)];
  turnCore.replyLocal(action.layer,line,'scripted-mock');s.core=turnCore.snapshot();s.core.events.at(-1).execution={provider:'fixture',model:'scripted-mock'};
  s.diagnostics.push({operation_id:op,role,activity:role==='Aida'?'rpg_meta':'rpg_character',source_ids:prepared.source_ids,private_sources:prepared.source_ids.filter(id=>s.core.events.find(e=>e.id===id)?.layer==='meta').length,provider:'fixture',model:'scripted-mock',hosted_calls:0});
 }else throw Error('Explicit turn layer or public commit required.');
 if(action.type==='publish')s.core=c.snapshot();
 roles.sync(s,s.core.events);s.applied_ops.push(op);return validate(s);
}
async function hash(data){const bytes=new TextEncoder().encode(JSON.stringify(data));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
function payload(e){return {namespace:e.namespace,campaign_id:e.campaign_id,revision:e.revision,parent_hash:e.parent_hash,operation_id:e.operation_id,snapshot:e.snapshot};}
async function envelope(snapshot,parent=null){validate(snapshot);const e={namespace:NS,campaign_id:snapshot.campaign_id,revision:parent?parent.revision+1:0,parent_hash:parent?.hash||null,operation_id:snapshot.applied_ops.at(-1),snapshot:cp(snapshot)};e.hash=await hash(payload(e));return e;}
async function verify(e,id){if(!e||e.namespace!==NS||e.campaign_id!==id||!Number.isInteger(e.revision)||e.revision<0||e.revision>=30||e.snapshot?.campaign_id!==id||e.snapshot?.applied_ops?.length!==e.revision+1||e.operation_id!==e.snapshot.applied_ops.at(-1)||e.hash!==await hash(payload(e)))throw Error('Invalid or cross-campaign save.');validate(e.snapshot);return e;}
window.RPG_THEATER_ENGINE=Object.freeze({NS,CAMPAIGNS,definition,seed,next,validate,envelope,verify});
})();
