(function (root) {
  'use strict';
  const WORLD = 'rpg-lounge:lantern-room:v1';
  const PROJECT = 'local-demo:rpg-lounge';
  const KEY = 'aida.rpg-lounge.prototype.' + WORLD;
  const layerInfo = {
    in_game: {speaker:'MonAmour', audience:['Rias','Aida']},
    meta: {speaker:'Francisco', audience:['Aida']}
  };
  function validate(state) {
    if (!state || state.world_id!==WORLD || state.project_id!==PROJECT || state.version!==1 || !Number.isInteger(state.revision) || !Array.isArray(state.events) || state.events.length>200) throw Error('World data is unavailable or belongs to another scope. Nothing was overwritten.');
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
    function stage(text,layer) {
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
      return update(next=>{
        const p=next.pending,info=layerInfo[p.layer];next.pending=null;
        const sent=event(next,p.layer,info.speaker,info.audience,p.text);
        if(p.layer==='in_game') {
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
    return {snapshot,stage,reroute,cancel,confirm,correct,contextFor,transcript,live};
  }
  root.RPGLounge={create,validate,WORLD,PROJECT,KEY,layerInfo};
  if(typeof module!=='undefined')module.exports=root.RPGLounge;
})(typeof window!=='undefined'?window:globalThis);
