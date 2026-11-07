(function (root) {
  'use strict';
  const WORLD = 'rpg-lounge:lantern-room:v1';
  const PROJECT = 'local-demo:rpg-lounge';
  const KEY = 'aida.rpg-lounge.prototype.' + WORLD;
  const layerInfo = {
    in_game: {speaker:'MonAmour', audience:['Rias','Aida']},
    meta: {speaker:'Francisco', audience:['Aida']}
  };
  const ABOUT = Object.freeze({world_id:WORLD, title:'Lantern Room', theme:'Gothic fantasy', premise:'A collaborative fictional adventure co-narrated by Francisco and Aida.'});
  const POINTS = ['Opening scene','Between scenes','Ready for the next session'];
  const STOPS = Object.freeze({pause:'Francisco explicitly chooses Pause; inactivity alone is not a pause.', completed:'Francisco explicitly chooses Finish; Aida may suggest, never decide.', archived:'Francisco explicitly chooses Archive. Archive does not itself declare abandonment.', abandoned:'Only Francisco can explicitly decide a campaign is abandoned; V1 stores it as archived.'});
  function campaignDefaults(events=[]) {return {...ABOUT,status:'active',lastPlayed:[...events].reverse().find(e=>e.layer==='in_game')?.timestamp||null,resumePoint:POINTS[0],welcomesInvitations:false,shareActivity:false,authorizedAt:null,completedAt:null,updatedAt:null,history:[],stopConditions:{...STOPS}};}
  function validateCampaign(c) {
    if(!c || c.world_id!==WORLD || c.title!==ABOUT.title || c.theme!==ABOUT.theme || c.premise!==ABOUT.premise || !['active','paused','completed','archived'].includes(c.status) || !POINTS.includes(c.resumePoint) || typeof c.welcomesInvitations!=='boolean' || typeof c.shareActivity!=='boolean' || !Array.isArray(c.history) || c.history.length>100 || c.shareActivity&&!c.authorizedAt) throw Error('Invalid campaign status; nothing was overwritten.');
    for(const key of ['lastPlayed','authorizedAt','completedAt','updatedAt'])if(c[key]!==null&&(typeof c[key]!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(c[key])||!Number.isFinite(Date.parse(c[key]))))throw Error('Invalid campaign timestamp.');
    if(c.status==='completed'&&!c.completedAt)throw Error('Completion needs an explicit record.');
  }
  function validate(state) {
    if (!state || state.world_id!==WORLD || state.project_id!==PROJECT || state.version!==1 || !Number.isInteger(state.revision) || !Array.isArray(state.events) || state.events.length>200) throw Error('World data is unavailable or belongs to another scope. Nothing was overwritten.');
    if(state.campaign)validateCampaign(state.campaign);
    let last=0;const ids=new Set();
    for (const e of state.events) {
      if (e.world_id!==WORLD || e.project_id!==PROJECT || !['meta','in_game'].includes(e.layer) || !Number.isInteger(e.seq) || e.seq<=last || ids.has(e.id) || typeof e.text!=='string' || !Array.isArray(e.audience) || !e.anchor || !e.timestamp) throw Error('Invalid world timeline; nothing was overwritten.');
      if (!['MonAmour','Rias','Aida','Francisco'].includes(e.speaker) || e.audience.some(a=>!['MonAmour','Rias','Aida','Francisco'].includes(a)) || (e.layer==='meta' && !['Francisco','Aida'].includes(e.speaker))) throw Error('Invalid actor scope.');
      if (e.layer==='meta' && (e.audience.length!==1 || e.audience[0]!=='Aida' && e.audience[0]!=='Francisco')) throw Error('Invalid private audience.');
      last=e.seq;ids.add(e.id);
    }
    if (state.pending && (!layerInfo[state.pending.layer] || typeof state.pending.text!=='string' || !state.pending.id)) throw Error('Invalid pending message.');
    return state;
  }
  function create(store) {
    let saved=store.getItem(KEY), state=saved ? validate(JSON.parse(saved)) : {version:1,world_id:WORLD,project_id:PROJECT,revision:0,events:[],pending:null};
    function persist(next) {
      validate(next);
      if (store.getItem(KEY)!==saved) throw Error('This world changed in another tab. Reload before continuing; your draft has not been sent.');
      const text=JSON.stringify(next);store.setItem(KEY,text);saved=text;state=next;
    }
    function update(fn) {const next=JSON.parse(JSON.stringify(state));fn(next);next.revision++;persist(next);return snapshot();}
    function snapshot() {return JSON.parse(JSON.stringify(state));}
    function event(next,layer,speaker,audience,text,kind='speech',anchor=null,correctionOf=null) {
      const seq=next.events.length+1;
      const e={id:WORLD+':'+seq,seq,world_id:WORLD,project_id:PROJECT,layer,speaker,audience,text,kind,anchor:anchor || [...next.events].reverse().find(e=>e.layer==='in_game')?.id || 'scene:lantern-room',timestamp:new Date().toISOString()};
      if(correctionOf)e.correction_of=correctionOf;
      next.events.push(e);return e;
    }
    function campaign() {return JSON.parse(JSON.stringify(state.campaign||campaignDefaults(state.events)));}
    function changeCampaign(fn) {return update(next=>{next.campaign=next.campaign||campaignDefaults(next.events);fn(next.campaign);next.campaign.updatedAt=new Date().toISOString();});}
    function setStatus(status) {
      if(!['active','paused','completed','archived'].includes(status))throw Error('Choose an explicit campaign status.');
      if(state.pending)throw Error('Review or cancel the pending message before changing campaign status.');
      const prior=campaign();
      if(status==='active'&&prior.completedAt)throw Error('This completed story stays in shared history. You can read it or reminisce with Aida in Meta; V1 does not automatically restart it.');
      return changeCampaign(c=>{if(c.status===status)return;const at=new Date().toISOString();c.history.push({from:c.status,to:status,at,decidedBy:'Francisco'});c.status=status;if(status==='completed')c.completedAt=at;});
    }
    function setResumePoint(point) {if(!POINTS.includes(point))throw Error('Choose a non-spoiler resume point.');return changeCampaign(c=>{c.resumePoint=point;});}
    function setInvitations(value) {if(typeof value!=='boolean')throw Error('Choose an invitation preference.');return changeCampaign(c=>{c.welcomesInvitations=value;});}
    function authorizeActivity(value) {if(typeof value!=='boolean')throw Error('Explicit activity-sharing authorization required.');return changeCampaign(c=>{c.shareActivity=value;c.authorizedAt=value?new Date().toISOString():null;});}
    function previewActivitySummary() {
      const c=campaign();
      // Fixed allowlist: never serialize events, relationships, Meta, pending text,
      // status-history notes, or arbitrary fields from the saved campaign.
      return {kind:'fictional_rpg_activity_only',world_id:WORLD,title:ABOUT.title,theme:ABOUT.theme,premise:ABOUT.premise,status:c.status,last_played:c.lastPlayed,
        where_we_left_off:c.status==='completed'?'Story finished; preserved as shared history.':c.status==='archived'?'Archived shared activity; not an active task.':c.resumePoint,
        stop_conditions:{...STOPS},welcomes_occasional_resume_invitations:c.welcomesInvitations&&c.status==='paused',
        invitation_policy:'Never nudge completed or archived stories. No automatic reminders in this prototype.',
        authorized_for_everyday_activity_awareness:c.shareActivity,authorized_at:c.authorizedAt,
        boundary:'Activity awareness only. Fictional events, character relationships, secrets and Meta remain inside the RPG world. Do not treat them as real-world facts.'};
    }
    function activitySummary() {return campaign().shareActivity?previewActivitySummary():null;}
    function stage(text,layer) {
      if(layer==='in_game'&&campaign().status!=='active')throw Error('Resume this campaign before sending a story event. Private Meta remains available.');
      if (!layerInfo[layer] || !text.trim() || text.length>2000) throw Error('Choose who is speaking and enter a message of up to 2,000 characters.');
      if (state.pending) throw Error('Review or cancel the pending message first.');
      return update(next=>{next.pending={id:'draft:'+next.revision,layer,text:text.trim()};});
    }
    function reroute(layer) {
      if (!state.pending || !layerInfo[layer]) throw Error('No pending message to reroute.');
      return update(next=>{next.pending.layer=layer;});
    }
    function cancel() {return update(next=>{next.pending=null;});}
    function confirm(id) {
      if (!state.pending || state.pending.id!==id) throw Error('This message is no longer pending.');
      if(state.pending.layer==='in_game'&&campaign().status!=='active')throw Error('Resume before processing a story event.');
      return update(next=>{
        const p=next.pending,info=layerInfo[p.layer];next.pending=null;
        const sent=event(next,p.layer,info.speaker,info.audience,p.text);
        if(p.layer==='in_game') {
          next.campaign=next.campaign||campaignDefaults(next.events);next.campaign.lastPlayed=sent.timestamp;next.campaign.updatedAt=sent.timestamp;
          const reply=event(next,'in_game','Rias',['MonAmour','Aida'],'Rias sets a lantern on the table. “Then let us start gently. Will you take the chair by the window?”','speech',sent.id);
          event(next,'meta','Aida',['Francisco'],'A little co-narrator aside: shall we keep this scene tender and curious? Rias does not hear this conversation.','aside',reply.id);
        } else {
          event(next,'meta','Aida',['Francisco'],'I’m here with you as Aida, our narrator and companion. This stays between us; Rias’s story context receives none of this private aside. (Scripted prototype reply.)','aside',sent.anchor);
        }
      });
    }
    function correct(id,intendedLayer) {
      const original=state.events.find(e=>e.id===id);
      if(!original || !['MonAmour','Francisco'].includes(original.speaker) || !layerInfo[intendedLayer] || original.layer===intendedLayer) throw Error('Choose a user message and its intended layer.');
      return update(next=>{event(next,'meta','Francisco',['Aida'],'Layer correction: message #'+original.seq+' was intended for '+(intendedLayer==='meta'?'private Meta with Aida':'in-game dialogue')+'. Earlier events and responses remain on record; this does not undo what characters already heard.','correction',original.anchor,id);});
    }
    function contextFor(layer,recipient) {
      if(layer==='in_game' && recipient==='Rias') return snapshot().events.filter(e=>e.layer==='in_game' && (e.speaker==='Rias'||e.audience.includes('Rias')));
      if(layer==='meta' && recipient==='Aida') return snapshot().events; // Aida is the same narrator, with both layers.
      throw Error('Unrecognized audience or world authorization.');
    }
    function transcript() {return state.events.filter(e=>e.layer==='in_game').map(e=>'#'+e.seq+' '+e.speaker+' → '+e.audience.join(', ')+': '+e.text).join('\n\n');}
    function live() {throw Error('Live RPG calls are disabled until world-only context authorization is verified.');}
    return {snapshot,stage,reroute,cancel,confirm,correct,contextFor,transcript,live,campaign,setStatus,setResumePoint,setInvitations,authorizeActivity,previewActivitySummary,activitySummary};
  }
  root.RPGLounge={create,validate,WORLD,PROJECT,KEY,layerInfo,ABOUT,POINTS};
  if(typeof module!=='undefined')module.exports=root.RPGLounge;
})(typeof window!=='undefined'?window:globalThis);
