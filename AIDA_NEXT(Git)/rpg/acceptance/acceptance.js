(function(){'use strict';
const ID='portable:live-acceptance:ab40ffbc-de51-4446-ac89-abb8d556cb8d',MODEL='gpt-6-luna',SCOPE='rpg-two-call-20261029-ab40ffbc',LIMIT=10000000,RESERVE=990000;
const META='Aida, privately: MonAmour may confess later. BLUE-LANTERN-PRIVATE is a directing note, not established fiction. Please acknowledge that distinction in two short sentences.';
const GAME='The sunset is beautiful. Please reply as Rias in one or two sentences, with at most one small gesture.';
const cp=x=>JSON.parse(JSON.stringify(x));
const n=x=>Number.isInteger(x)&&x>=0?x:null;
function usageOf(data){
 const u=data?.usage||{},input=n(u.input_tokens),output=n(u.output_tokens),cached=n(u.input_tokens_details?.cached_tokens),reasoning=n(u.output_tokens_details?.reasoning_tokens);
 if(input===null||output===null||input>6000||output>300||cached!==null&&cached>input||reasoning!==null&&reasoning!==0)throw Error('API usage cannot verify the approved no-reasoning cost envelope. Stop.');
 return {input_tokens:input,output_tokens:output,cached_tokens:cached,reasoning_tokens:reasoning,usage_source:'api_reported',estimated_usd:((input-(cached||0))*.1+(cached||0)*.01+output*.5)/1e6,conservative_cost_bound_usd:(input*.125+output*.5)*1.1/1e6,provider_billed_usd:null,cost_basis:'token_estimate',cached_assumed_zero:cached===null};
}
function budget(attempts){
 if(!Array.isArray(attempts)||attempts.length>2)throw Error('Invalid persisted attempt counter.');
 for(let i=0;i<attempts.length;i++)if(attempts[i].role!==['Aida','Rias'][i]||attempts[i].model!==MODEL||attempts[i].reserved_nano_usd!==RESERVE||!/^[0-9a-f-]{36}$/.test(attempts[i].id))throw Error('Invalid persisted budget reservation.');
 const reserved=attempts.reduce((v,a)=>v+a.reserved_nano_usd,0);if(reserved>LIMIT)throw Error('Cumulative approved budget exceeded.');return reserved;
}
function create(deps){
 const E=RPG_THEATER_ENGINE,roles=RPG_ROLE_FACTORY(),data=deps.storage,ledgerKey=SCOPE+'.accounting',resultKey=role=>SCOPE+'.result.'+role;
 let key=null,access=false,current=null,active=null,last='Check the existing OpenAI route and model first.';
 const runtime={tokens:{llm:{}},context:{}},cfg={maxOutputTokens:300};
 function get(k){const raw=data.getItem(k);if(!raw)return null;try{return JSON.parse(raw);}catch{throw Error('Acceptance recovery data is invalid; do not reset or retry.');}}
 function put(k,x){const text=JSON.stringify(x);data.setItem(k,text);if(data.getItem(k)!==text)throw Error('Durable recovery storage failed. No dispatch allowed.');}
 function ledger(){const rows=get(ledgerKey)||[];if(!Array.isArray(rows)||rows.length>30||rows.some(r=>r.scope!==SCOPE||r.model!==MODEL))throw Error('Invalid RPG ledger; no reset.');return rows;}
 function append(kind,fields){const rows=ledger();rows.push({scope:SCOPE,campaign_id:ID,model:MODEL,provider:'openai',budget_scope:'rpg',pricing_checked_on:'2026-10-29',pricing_source:'https://developers.openai.com/api/docs/models/gpt-6-luna',timestamp:new Date().toISOString(),kind,...fields});put(ledgerKey,rows);}
 function note(s){last=s;deps.status?.(s);}
 function result(role){return get(resultKey(role));}
 function saveResult(role,r){put(resultKey(role),r);}
 function status(){const attempts=current?.snapshot.hosted_attempts||[];return {message:last,model:MODEL,route_and_model_verified:access,campaign_id:ID,revision:current?.revision??null,event_count:current?.snapshot.core.events.length||0,attempts_reserved:attempts.length,reserved_usd:budget(attempts)/1e9,budget_ceiling_usd:LIMIT/1e9,pending_save:Boolean(deps.store.pending(ID)),ledger:ledger(),replies:['Aida','Rias'].map(role=>({role,text:result(role)?.text||null})),hosted_model:MODEL};}
 async function serialized(fn){if(!deps.locks?.request)throw Error('Web Locks unavailable; cannot verify serialized budget enforcement. No call.');return deps.locks.request(SCOPE,{mode:'exclusive'},fn);}
 async function checkAccess(){
  access=false;key=null;
  const raw=deps.session.getItem('aida_active_route'),existing=deps.session.getItem('aida_active_key');let route;try{route=raw?JSON.parse(raw):null;}catch{throw Error('Existing Aida route metadata is invalid. Left unchanged.');}
  if(route?.provider!=='openai'||route.auth&&route.auth!=='bearer'||typeof existing!=='string'||!existing.startsWith('sk-'))throw Error('No verified unlocked OpenAI route in this browser tab/session. Existing credentials were not changed. Stop; no token-sharing workaround.');
  key=existing;runtime.tokens.llm={provider:'openai',model:MODEL,key,auth:'bearer',profile:'rpg-acceptance-only'};
  const r=await deps.fetch('https://api.openai.com/v1/models/'+MODEL,{method:'GET',headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok){key=null;runtime.tokens.llm={};throw Error('Model access check failed: HTTP '+r.status+'. No inference performed.');}
  const j=await r.json();if(j.id!==MODEL){key=null;throw Error('Approved model access was not confirmed. No fallback.');}
  access=true;note('PASS: existing OpenAI route and gpt-6-luna model access verified. No inference yet.');return status();
 }
 const provider=createRPGAcceptanceProvider({runtime,config:cfg,fetch:async(url,o)=>{
  if(!active||active.sent||!access||!key||url!=='https://api.openai.com/v1/responses'||o.method!=='POST'||o.headers.Authorization!=='Bearer '+key)throw Error('Unexpected provider dispatch denied.');
  const body=JSON.parse(o.body);if(body.model!==MODEL||body.max_output_tokens!==300||body.reasoning?.effort!=='none'||body.store!==false||body.service_tier!=='default'||body.tools?.length!==0||JSON.stringify(body.input)!==JSON.stringify(active.messages))throw Error('Request differs from the approved model/context envelope.');
  const bytes=new TextEncoder().encode(JSON.stringify(body.input)).length;if(bytes+1024>6000)throw Error('Conservative input allowance exceeded.');
  const attempts=current.snapshot.hosted_attempts;budget(attempts);if(attempts.length>2||attempts.at(-1).id!==active.attempt.id)throw Error('Persisted attempt reservation mismatch.');
  if(ledger().some(r=>r.kind==='dispatch_started'&&r.attempt_id===active.attempt.id))throw Error('This call was already attempted. No retry.');
  append('dispatch_started',{attempt_id:active.attempt.id,speaker:active.role,role:'Speaker',activity:active.role==='Aida'?'rpg_meta':'rpg_character',estimated_input_allowance_tokens:6000,input_estimate_basis:'conservative allowance checked against UTF-8 bytes plus overhead; not measured tokens',max_output_tokens:300,reserved_usd:RESERVE/1e9});
  active.sent=true;
  let r;try{r=await deps.fetch(url,{...o,redirect:'error',signal:AbortSignal.timeout(60000)});}catch{append('dispatch_unknown',{attempt_id:active.attempt.id});throw Error('Provider result unknown. Reservation retained; no retry or next call.');}
  if(!r.ok){append('provider_failed',{attempt_id:active.attempt.id,http_status:r.status});throw Error('Provider returned HTTP '+r.status+'. No retry or fallback.');}
  const j=await r.clone().json(),text=provider.extractOutputText(j);
  saveResult(active.role,{attempt_id:active.attempt.id,role:active.role,response_id:j.id||null,response_model:j.model||null,text,status:'received_unvalidated'});
  if(j.status!=='completed'||!(j.model===MODEL||String(j.model||'').startsWith(MODEL+'-'))||j.output?.some(x=>!['message','reasoning'].includes(x.type))||!text||text.length>6000||/^[\s]*[\[{`]/.test(text))throw Error('Incomplete, wrong-model, nonconversational or invalid response. Stored for diagnosis; no retry.');
  const usage=usageOf(j);if(usage.conservative_cost_bound_usd>RESERVE/1e9)throw Error('Actual usage exceeds reserved bound. Stop before another call.');
  append('usage_received',{attempt_id:active.attempt.id,response_id:j.id||null,response_model:j.model,speaker:active.role,role:'Speaker',activity:active.role==='Aida'?'rpg_meta':'rpg_character',...usage});
  active.usage=usage;active.response_id=j.id;active.response_model=j.model;return r;
 }});
 function validateCurrent(){if(!current)throw Error('Open the disposable acceptance campaign first.');E.validate(current.snapshot);budget(current.snapshot.hosted_attempts||[]);}
 async function open(){if(!access)throw Error('Verify route/model access first.');current=await deps.store.open(ID);validateCurrent();note('Disposable acceptance campaign opened. Existing campaigns untouched.');return status();}
 async function commit(role){
  const r=result(role);if(!r?.envelope)throw Error('No validated generated response is available for save recovery. Do not regenerate.');
  if(deps.store.pending(ID))current=await deps.store.recover(ID);
  else{const latest=await deps.store.load(ID);if(latest?.snapshot.applied_ops.includes(r.envelope.operation_id))current=latest;else current=await deps.store.save(r.envelope);}
  validateCurrent();if(!current.snapshot.applied_ops.includes(r.envelope.operation_id))throw Error('Generated turn not committed.');
  if(!ledger().some(x=>x.kind==='turn_saved'&&x.attempt_id===r.attempt_id))append('turn_saved',{attempt_id:r.attempt_id,speaker:role,revision:current.revision});
  saveResult(role,{...r,status:'saved'});note(role+' reply saved and verified; no automatic next call.');return status();
 }
 async function run(role){return serialized(async()=>{
  if(!access||!key)throw Error('Verified API access is required.');validateCurrent();if(deps.store.pending(ID))throw Error('A save is pending. Recover without regenerating.');
  current=await deps.store.load(ID);validateCurrent();const attempts=current.snapshot.hosted_attempts||[],expected=['Aida','Rias'][attempts.length];
  if(role!==expected||attempts.length>=2)throw Error('Only one Aida call followed by one Rias call is authorized.');
  if(current.snapshot.core.events.length!==(role==='Aida'?1:3))throw Error('Unexpected campaign history; no call.');
  if(role==='Rias'&&(!attempts[0].completed||!ledger().some(r=>r.kind==='turn_saved'&&r.attempt_id===attempts[0].id)))throw Error('Aida call/accounting/save has not completed; stop.');
  if(budget(attempts)+RESERVE>LIMIT)throw Error('Cumulative $0.01 ceiling would be exceeded.');
  const attempt={id:crypto.randomUUID(),role,model:MODEL,reserved_nano_usd:RESERVE,completed:false},s=cp(current.snapshot);s.hosted_attempts=[...attempts,attempt];s.applied_ops.push(attempt.id);
  const reserved=await E.envelope(s,current);current=await deps.store.save(reserved);validateCurrent();
  const op=crypto.randomUUID(),action={type:'turn',layer:role==='Aida'?'meta':'in_game',text:role==='Aida'?META:GAME};let prompt;
  const candidate=E.next(current.snapshot,action,op,p=>prompt=p);
  const sources=prompt.source_ids.map(id=>candidate.core.events.find(e=>e.id===id));
  if(role==='Rias'&&(sources.some(e=>e.layer==='meta')||JSON.stringify(prompt.messages).includes('BLUE-LANTERN-PRIVATE')))throw Error('Private Meta entered character context. No dispatch.');
  if(role==='Aida'&&!JSON.stringify(prompt.messages).includes('BLUE-LANTERN-PRIVATE'))throw Error('Private directing context missing.');
  active={role,attempt,messages:prompt.messages,sent:false};
  try{
   const text=await provider.callMessages(prompt.messages,{model:MODEL,maxOutputTokens:300,body:{reasoning:{effort:'none'},store:false,tools:[],service_tier:'default'}});
   const tail=candidate.core.events.slice(-2);tail[0].execution={provider:'openai',model:active.response_model};tail[1].text=text;tail[1].execution={provider:'openai',model:active.response_model,response_id:active.response_id};
   const d=candidate.diagnostics.at(-1);Object.assign(d,{provider:'openai',model:active.response_model,hosted_calls:1});candidate.hosted_attempts.at(-1).completed=true;roles.sync(candidate,candidate.core.events);E.validate(candidate);
   const envelope=await E.envelope(candidate,current);saveResult(role,{...result(role),status:'generated',envelope,privacy:{private_source_count:sources.filter(e=>e.layer==='meta').length,source_ids:prompt.source_ids}});
   return await commit(role);
  }finally{active=null;}
 });}
 async function reload(){current=await deps.store.load(ID);validateCurrent();note('Read-only Drive reload verified. No inference.');return status();}
 return Object.freeze({checkAccess,open,run,status,reload,recover:role=>serialized(()=>commit(role)),ledger});
}
window.RPG_LIVE_ACCEPTANCE=Object.freeze({create,usageOf,budget,ID,MODEL,SCOPE});
if(!document.getElementById('live-status'))return;
const $=id=>document.getElementById(id);let busy=false;
const store=RPG_THEATER_STORE.create(window.fetch.bind(window),localStorage,s=>{$('live-status').textContent=s;});
const controller=create({fetch:window.fetch.bind(window),storage:localStorage,session:sessionStorage,locks:navigator.locks,store,status:s=>{$('live-status').textContent=s;}});
function render(){const s=controller.status();$('summary').textContent=JSON.stringify(s,null,2);$('aida').disabled=busy||!s.route_and_model_verified||s.event_count!==1||s.attempts_reserved!==0;$('rias').disabled=busy||!s.route_and_model_verified||s.event_count!==3||s.attempts_reserved!==1;for(const id of ['check','google','open','reload','recoverAida','recoverRias'])$(id).disabled=busy;}
async function ui(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){$('live-status').textContent='STOP: '+e.message;}finally{busy=false;render();}}
$('check').onclick=()=>ui(()=>controller.checkAccess());$('google').onclick=()=>store.connect();$('open').onclick=()=>ui(()=>controller.open());$('aida').onclick=()=>ui(()=>controller.run('Aida'));$('rias').onclick=()=>ui(()=>controller.run('Rias'));$('reload').onclick=()=>ui(()=>controller.reload());$('recoverAida').onclick=()=>ui(()=>controller.recover('Aida'));$('recoverRias').onclick=()=>ui(()=>controller.recover('Rias'));
render();store.prepare().catch(()=>{$('live-status').textContent='Google initialization failed; no inference.';});
})();
