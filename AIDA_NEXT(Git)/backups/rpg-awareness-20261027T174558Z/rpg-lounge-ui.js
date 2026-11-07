(() => {
 'use strict';
 const $=id=>document.getElementById(id);let engine, storyOnly=false;
 function tell(message){$('notice').textContent=message;}
 try{engine=RPGLounge.create(localStorage);}catch(e){tell(e.message);$('stage').disabled=true;return;}
 $('scope').textContent='World: '+RPGLounge.WORLD+' · Project: '+RPGLounge.PROJECT;
 function layer(){return document.querySelector('input[name=layer]:checked').value;}
 function identity(){const meta=layer()==='meta';document.body.classList.toggle('meta-mode',meta);$('composer-label').textContent=meta?'Francisco → Aida only (private Meta)':'MonAmour → Rias (in game)';$('message').placeholder=meta?'Discuss the scene privately with Aida…':'Say or do something in the Lantern Room…';}
 function act(fn){try{fn();tell('');render();}catch(e){tell(e.message);}}
 function render(){
  const s=engine.snapshot();$('timeline').replaceChildren();
  if(!s.events.length){const welcome=document.createElement('p');welcome.textContent='The Lantern Room is quiet. Start as MonAmour, or ask Aida privately about the scene. Replies in this prototype are scripted demonstrations.';$('timeline').append(welcome);}
  for(const e of s.events){
   if(storyOnly&&e.layer!=='in_game')continue;
   const card=document.createElement(e.layer==='meta'?'details':'article');card.className='event'+(e.layer==='meta'?' aside':'');card.dataset.eventId=e.id;
   const heading=document.createElement(e.layer==='meta'?'summary':'strong');heading.textContent='#'+e.seq+' · '+(e.layer==='meta'?'PRIVATE META · ':'')+e.speaker+' → '+e.audience.join(', ')+(e.layer==='meta'?' · expand':'');card.append(heading);
   const text=document.createElement('p');text.textContent=e.text;card.append(text);
   const anchor=document.createElement('small'),linked=s.events.find(x=>x.id===e.anchor);anchor.textContent=new Date(e.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · '+(linked?'after story #'+linked.seq:'scene start');card.append(anchor);
   if(s.events.some(x=>x.correction_of===e.id)){const note=document.createElement('p');note.className='correction';note.textContent='A later layer correction is recorded. Original history retained.';card.append(note);}
   if(['MonAmour','Francisco'].includes(e.speaker)&&e.kind==='speech'){
    const correct=document.createElement('button');correct.type='button';correct.textContent='Wrong layer? Record correction';correct.onclick=()=>act(()=>engine.correct(e.id,e.layer==='meta'?'in_game':'meta'));card.append(document.createElement('br'),correct);
   }
   $('timeline').append(card);
  }
  const p=s.pending;$('review').hidden=!p;$('stage').disabled=!!p;$('message').readOnly=!!p;document.querySelectorAll('input[name=layer]').forEach(r=>{r.disabled=!!p;if(p)r.checked=r.value===p.layer;});identity();
  if(p){const info=RPGLounge.layerInfo[p.layer];$('review-label').textContent='NOT SENT — '+info.speaker+' → '+info.audience.join(', ')+' · '+(p.layer==='meta'?'PRIVATE META':'IN GAME');$('review-text').textContent=p.text;}
  $('all').setAttribute('aria-pressed',String(!storyOnly));$('story').setAttribute('aria-pressed',String(storyOnly));
  $('timeline').scrollTop=$('timeline').scrollHeight;
 }
 document.querySelectorAll('input[name=layer]').forEach(r=>r.addEventListener('change',identity));
 $('composer').addEventListener('submit',e=>{e.preventDefault();act(()=>engine.stage($('message').value,layer()));});
 $('confirm').onclick=()=>act(()=>{const p=engine.snapshot().pending;engine.confirm(p.id);$('message').value='';});
 $('reroute').onclick=()=>act(()=>engine.reroute(engine.snapshot().pending.layer==='meta'?'in_game':'meta'));
 $('cancel').onclick=()=>act(()=>engine.cancel());
 $('all').onclick=()=>{storyOnly=false;render();};$('story').onclick=()=>{storyOnly=true;render();};
 $('export').onclick=()=>{const blob=new Blob([engine.transcript()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lantern-room-in-game.txt';a.click();URL.revokeObjectURL(url);};
 addEventListener('storage',e=>{if(e.key===RPGLounge.KEY){tell('This world changed in another tab. Reload before continuing; drafts have not been sent.');$('stage').disabled=true;$('confirm').disabled=true;}});
 identity();render();
})();
