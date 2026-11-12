(()=>{'use strict';
const node=document.getElementById('lesson-data');if(!node)return;const d=JSON.parse(node.textContent);
if(document.body.classList.contains('worksheet')){initWorksheet(d);return;}
const $=id=>document.getElementById(id),cfg=LessonScenes.modes[d.scene];
let p=0,playing=false,frame=0,last=0;
const choose=$('scene-choice'),value=$('scene-value'),progress=$('scene-progress'),play=$('scene-play'),reset=$('scene-reset');
$('choice-label').textContent=cfg[0];cfg[1].forEach((name,i)=>{const o=document.createElement('option');o.value=i;o.textContent=name;choose.append(o);});
if(cfg[1].length===1)$('choice-group').hidden=true;
const hiddenKnob=new Set(['trajectory','interaction','forces','heat','light','straightlight','series']);
$('value-label').textContent=cfg[2];value.min=cfg[3];value.max=cfg[4];value.value=cfg[5];
if(hiddenKnob.has(d.scene))$('value-group').hidden=true;
const staticScenes=new Set(['quantities','ruler','errors','average','density','force','dynamometer','weight','compass','atom','thermometer','light','straightlight','rays','series']);
if(staticScenes.has(d.scene))$('scene-transport').hidden=true;
function render(){const result=LessonScenes.draw(d.scene,+choose.value,+value.value,p);$('scene-diagram').innerHTML=result.svg;$('scene-readout').innerHTML=PhysicsInput.format(result.read);$('scene-caption').textContent=result.cap;$('value-output').textContent=value.value;progress.value=Math.round(p*100);$('progress-output').textContent=Math.round(p*100)+'%';}
function stop(){playing=false;cancelAnimationFrame(frame);play.textContent='Pornește animația';play.setAttribute('aria-pressed','false');}
function tick(now){if(!playing)return;if(!last)last=now;const delta=Math.min((now-last)/1000,.1);last=now;p=Math.min(1,p+delta/7);render();if(p>=1)stop();else frame=requestAnimationFrame(tick);}
play.addEventListener('click',()=>{if(playing){stop();return;}if(p>=1)p=0;playing=true;last=0;play.textContent='Pauză';play.setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);});
reset.addEventListener('click',()=>{stop();p=0;render();});
progress.addEventListener('input',()=>{stop();p=+progress.value/100;render();});
choose.addEventListener('change',()=>{stop();p=0;render();});value.addEventListener('input',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
const motion=matchMedia('(prefers-reduced-motion: reduce)');if(motion.addEventListener)motion.addEventListener('change',stop);else motion.addListener(stop);
$('print-notes').addEventListener('click',()=>{document.body.classList.add('print-notes');window.print();});window.addEventListener('afterprint',()=>document.body.classList.remove('print-notes'));
const form=$('quiz');
form.addEventListener('submit',e=>{e.preventDefault();let score=0,missing=null;d.assess.forEach((q,i)=>{
 const field=$('answer-'+i),u=$('answer-'+i+'-unit'),feedback=$('feedback-'+i);let ok=false,message='';
 if(!field.value.trim()||(u&&!u.value.trim())){message='Completează '+(!field.value.trim()?'răspunsul':'unitatea')+'.';missing=missing||(!field.value.trim()?field:u);}
 else if(q.kind==='word'){ok=q.answer.some(a=>PhysicsInput.word(a)===PhysicsInput.word(field.value));message=ok?'Ai folosit corect noțiunea.':q.why;}
 else{try{const value=PhysicsInput.numeric(field.value),numberOk=Math.abs(value-q.answer)<=Math.max(1e-12,Math.abs(q.answer)*1e-6),unitOk=PhysicsInput.unit(u.value)===PhysicsInput.unit(q.unit);ok=numberOk&&unitOk;message=ok?'Valoarea și unitatea sunt corecte.':!numberOk?q.why:'Verifică unitatea SI. Unitatea potrivită: '+q.unit+'.';}catch(error){message=error.message;}}
 if(ok)score++;feedback.hidden=false;feedback.className='feedback '+(ok?'correct':'incorrect');feedback.innerHTML=PhysicsInput.format(message);
 });$('quiz-score').textContent=`Ai rezolvat corect ${score} din ${d.assess.length} cerințe. `+(missing?'Completează căsuțele rămase.':score===d.assess.length?'Folosește acum noțiunile într-o explicație proprie.':'Citește explicațiile și corectează răspunsurile.');missing?.focus();
});
$('quiz-retry').addEventListener('click',()=>{form.reset();d.assess.forEach((_,i)=>$('feedback-'+i).hidden=true);$('quiz-score').textContent='';$('answer-0').focus();});
window.addEventListener('pagehide',stop);render();

function initWorksheet(d){
 const get=id=>document.getElementById(id),names=['surname','given','className','date'],fields=names.map(x=>get('student-'+x)),answers=[...document.querySelectorAll('[data-home-answer]')],key=`fizica-gimnaziu-fisa-v2:${d.ch}:${d.n}`;
 let old=null;try{old=JSON.parse(localStorage.getItem(key)||'null');if(!old){const legacy=JSON.parse(localStorage.getItem(`galaction-tema-v1:${d.ch}:${d.n}`)||'null');if(Array.isArray(legacy))old={identity:{},answers:legacy};}}catch{}
 const now=new Date(),localDate=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 fields.forEach((x,i)=>x.value=old?.identity?.[names[i]]||(names[i]==='date'?localDate:''));answers.forEach((x,i)=>x.value=old?.answers?.[i]||'');
 function record(){return {version:2,identity:Object.fromEntries(fields.map((x,i)=>[names[i],x.value])),answers:answers.map(x=>x.value),updatedAt:new Date().toISOString()};}
 function persist(){try{localStorage.setItem(key,JSON.stringify(record()));get('save-status').textContent='Datele și răspunsurile sunt salvate.';}catch{get('save-status').textContent='Salvarea în browser nu este disponibilă. Folosește „Salvează PDF” pentru a păstra fișa.';}}
 [...fields,...answers].forEach(x=>x.addEventListener('input',persist));persist();
 get('save-pdf').addEventListener('click',async()=>{persist();const r=record(),button=get('save-pdf');button.disabled=true;try{const blob=WorksheetPdf.make(d,r.identity,r.answers),name=`fisa-VI-${d.ch}-${d.n}-${r.identity.surname||'elev'}-${r.identity.given||''}-${r.identity.className||''}.pdf`.replace(/[\\/:*?"<>|]/g,'_');const status=await WorksheetPdf.save(blob,name);get('pdf-status').textContent=status==='cancelled'?'Salvarea PDF a fost anulată.':'PDF-ul este pregătit pentru salvare.';}catch{get('pdf-status').textContent='PDF-ul nu a putut fi creat. Încearcă din nou sau folosește tipărirea.';}finally{button.disabled=false;}});
 get('print-sheet').addEventListener('click',()=>window.print());
}
})();
