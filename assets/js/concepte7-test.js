/* Generator si pagina pentru clasa VII. Dependente: test-engine.js, test-report.js. */
(function(window,document){
"use strict";
const APP=window.FizicaGalaction=window.FizicaGalaction||{};
const fmt=n=>Number(Number(n).toPrecision(12)).toString().replace(".",",");
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mix(values,r){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildVariant(catalog){
 if(!Number.isInteger(catalog)||catalog<1||catalog>30)throw Error("Numărul din catalog trebuie să fie între 1 și 30.");
 const v=catalog,r=random(v*104729),items=[];
 const add=(family,type,prompt,correctAnswer,extra={})=>{
  items.push({id:"v"+String(v).padStart(2,"0")+"-q"+String(family+1).padStart(2,"0"),family,type,prompt,correctAnswer,points:1,si:family<10,...extra});
 };
 function single(family,prompt,answer,values,unit=""){
  const options=mix(values,r).map((value,i)=>({value:String.fromCharCode(97+i),label:String(value)}));
  const correct=options.find(o=>o.label===String(answer));if(!correct)throw Error("Lipsește varianta corectă.");
  add(family,"single",prompt,correct.value,{options,unit});
 }
 function conversion(family,prompt,value,unit){single(family,prompt,fmt(value),[value,value*10,value*100,value/10].map(fmt),unit);}
 function dual(family,prompt,correct){add(family,"boolean",prompt,String(correct),{options:[{value:"true",label:"Adevărat"},{value:"false",label:"Fals"}]});}
 function pairing(family,prompt,rows){
  add(family,"matching",prompt,Object.fromEntries(rows),{pairs:rows.map(([left,right])=>({left,right})),instruction:"Asociază fiecare element din stânga cu elementul potrivit din dreapta."});
 }
 function numeric(family,prompt,value,unit){
  add(family,"numeric",prompt,Number(Number(value).toPrecision(12)),{unit,tolerance:Math.max(1e-12,Math.abs(value)*1e-9),instruction:"Scrie numai valoarea numerică. Poți folosi virgulă sau punct zecimal.",placeholder:"Valoarea calculată"});
 }
 let x=(1743+37*v)/10;
 conversion(0,"O panglică pentru împachetarea unui cadou are "+fmt(x)+" cm. Exprimă lungimea în metri.",x/100,"m");
 x=(38765+137*v)/10;
 conversion(1,"Masa unui pepene este "+fmt(x)+" g. Exprimă masa în kilograme.",x/1000,"kg");
 const minutes=12+v,seconds=17+v;
 conversion(2,"Drumul până la școală durează "+minutes+" minute și "+seconds+" secunde. Exprimă durata totală în secunde.",minutes*60+seconds,"s");
 x=(43217+113*v)/10;
 dual(3,"Un cablu are lungimea de "+fmt(x)+" mm. Un elev afirmă că aceasta reprezintă "+fmt(x/(v%2?1000:100))+" m.",Boolean(v%2));
 x=(8731+97*v)/10;
 dual(4,"Aria unei fotografii este "+fmt(x)+" cm². Un elev afirmă că aceasta reprezintă "+fmt(x/(v%2?100:10000))+" m².",!Boolean(v%2));
 x=(2467+31*v)/100;
 pairing(5,"Transformă lungimile în metri. Asociază fiecare valoare cu rezultatul corect.",[
 [fmt(x)+" mm",fmt(x/1000)],[fmt(x)+" cm",fmt(x/100)],[fmt(x)+" dm",fmt(x/10)]]);
 x=(173+13*v)/100;
 pairing(6,"Transformă masele în kilograme. Asociază fiecare valoare cu rezultatul corect.",[
 [fmt(x)+" mg",fmt(x/1e6)],[fmt(x)+" g",fmt(x/1000)],[fmt(x)+" t",fmt(x*1000)]]);
 x=(176543+211*v)/10;
 numeric(7,"Un recipient pentru apa de ploaie are volumul de "+fmt(x)+" cm³. Exprimă volumul în m³.",x/1e6,"m³");
 x=(3871+43*v)/100;
 numeric(8,"Suprafața unui raft este "+fmt(x)+" dm². Exprimă aria în m².",x/100,"m²");
 x=(276543+317*v)/10;
 numeric(9,"Masa unei porții de condimente este "+fmt(x)+" mg. Exprimă masa în kg.",x/1e6,"kg");
 const phenomena=[
 ["Pe exteriorul unui pahar rece apar picături de apă. Ce fenomen explică formarea lor?","Condensarea",["Condensarea","Evaporarea","Topirea","Solidificarea"]],
 ["Un cub de gheață lăsat pe masă devine apă. Ce fenomen are loc?","Topirea",["Topirea","Condensarea","Evaporarea","Solidificarea"]],
 ["Rufele ude se usucă la aer. Ce fenomen explică dispariția apei din țesătură?","Evaporarea",["Evaporarea","Condensarea","Topirea","Solidificarea"]]
 ];
 const ph=phenomena[(v-1)%3];single(10,ph[0],ph[1],ph[2]);
 single(11,"Un rucsac are masa de "+fmt((235+17*v)/100)+" kg. Care grup conține numai mărimi fizice scalare?","Masă, durată, temperatură",["Masă, durată, temperatură","Forță, masă, temperatură","Deplasare, durată, masă","Forță, deplasare, temperatură"]);
 single(12,"Un copil trage o sanie cu o forță de "+(17+3*v)+" N. Ce informații mai sunt necesare pentru a descrie vectorul forță?","Direcția și sensul",["Direcția și sensul","Durata și temperatura","Masa și volumul saniei","Distanța și durata"]);
 dual(13,v%2?"Când o minge cade, își schimbă poziția față de sol. Acesta este un fenomen mecanic.":"Când un cub de gheață se topește, fenomenul observat este mecanic.",Boolean(v%2));
 dual(14,v%2?"Două forțe cu aceeași valoare, pe aceeași direcție, dar cu sensuri opuse sunt vectori diferiți.":"Două forțe cu aceeași valoare, pe aceeași direcție, dar cu sensuri opuse sunt același vector.",Boolean(v%2));
 pairing(15,"Asociază fiecare mărime fizică folosită în viața cotidiană cu unitatea sa în SI.",[["Durata drumului până la școală","s"],["Masa rucsacului","kg"],["Temperatura aerului","K"]]);
 pairing(16,"Un colet de "+fmt((17+v)/10)+" kg este transportat spre est. Asociază descrierile cu noțiunile.",[["Masa coletului","Mărime scalară"],["Dreapta orizontală a săgeții","Direcția vectorului"],["Orientarea săgeții spre est","Sensul vectorului"]]);
 // Diferențele orizontală și verticală formează un triunghi 3-4-5.
 const k=1+v/10,east=10,north=23+v,west=10+3*k,south=north-4*k;
 const distance=east+north+west+south,displacement=5*k;
 pairing(17,"Te deplasezi "+fmt(east)+" m spre est, apoi "+fmt(north)+" m spre nord, apoi "+fmt(west)+" m spre vest și "+fmt(south)+" m spre sud. Desenează pe ciornă o schemă cu săgeți; marchează punctul de plecare și punctul de sosire. Calculează distanța totală parcursă și modulul deplasării față de punctul de plecare. Precizează și orientarea deplasării. Asociază rezultatele.",[
 ["Distanța totală parcursă",fmt(distance)+" m"],
 ["Modulul deplasării",fmt(displacement)+" m"],
 ["Orientarea deplasării","Nord-vest"]]);
 const strength=13+v,arrow=(27+v)/10;
 numeric(18,"Forța cu care un copil trage un cărucior este reprezentată la scara de 1 cm pentru "+strength+" N. Săgeata are lungimea de "+fmt(arrow)+" cm. Calculează valoarea forței.",strength*arrow,"N");
 add(19,"text","Pentru a comunica rezultatul măsurării lungimii unei mese, scrii o valoare numerică și o ... de măsură. Completează cuvântul lipsă.","unitate",{instruction:"Scrie un singur cuvânt."});
 const base=mix(Array.from({length:20},(_,i)=>i),random(20261008));
 return base.map((_,position)=>items.find(q=>q.family===base[(position+(v-1)*7)%20]));
}
const testConfig={
 questionsPerPage:1,shuffleQuestions:false,shuffleOptions:false,allowBack:false,
 keyboard:false,updateHash:false,requireAllAnswers:true,immediateFeedback:false,
 lockAfterCheck:true,showCorrectAnswers:false,showExplanations:false,
 persistStudentProfile:false,saveProgress:true,restoreProgress:true,
 confirmBeforeSubmit:false,allowRestart:false,allowPrint:false,
 integrityMonitoring:true,startImmediately:false,showTimer:false
};
function createData(v,student){
 return {id:"concepte7-v"+String(v).padStart(2,"0"),title:"Concepte de bază în fizică",
 subtitle:"",className:"a VII-a",chapter:"Concepte de bază în fizică",
 instructions:["Folosește ciorna pentru calcule.","După confirmarea răspunsului nu mai poți reveni la item."],
 studentFields:[{id:"nume",label:"Elev",required:true},{id:"catalog",label:"Număr în catalog",required:true}],
 questions:buildVariant(v),config:{...testConfig},
 progression:{groupId:"concepte7-evaluare",level:1,totalLevels:1,autoAdvance:false,unlockNextOnComplete:false},links:{},student};
}
APP.concepte7Test=Object.freeze({buildVariant,createData});
function boot(){
 const form=document.getElementById("variant-form"),host=document.getElementById("testApp");
 if(!form||!host)return;
 const error=document.getElementById("variant-error");
 let started=false,lastQuestionId="";
 const profileKey="concepte7-evaluare-20261008-r6:"+location.pathname;
 function remember(student,completed=null){
  try{localStorage.setItem(profileKey,JSON.stringify({student,completed}));}catch(_){}
 }
 document.addEventListener("fizica:test-complete",()=>{
  const state=window.TestEngine.getState();
  remember(state.student,{status:"running",student:state.student,answers:state.answers,checked:state.checked,
   currentIndex:state.currentIndex,startedAt:state.startedAt,remainingSeconds:state.remainingSeconds});
 });
 function decorate(){
  const q=window.TestEngine?.getCurrentQuestion?.(),s=window.TestEngine?.getState?.();
  const card=host.querySelector("[data-question-id]");
  if(card&&q&&q.type==="single"){
   card.querySelectorAll(".fg-test__option span").forEach((span,i)=>{
    const text=span.textContent.trim();if(!/^[a-d]\)\s/.test(text))span.textContent=String.fromCharCode(97+i)+") "+text;
   });
  }
  const next=host.querySelector('[data-action="next"]');
  if(next&&next.textContent.trim()!=="Confirmă răspunsul și continuă")next.textContent="Confirmă răspunsul și continuă";
  const submit=host.querySelector('[data-action="submit"]');
  if(submit&&submit.textContent.trim()!=="Finalizează și pregătește PDF")submit.textContent="Finalizează și pregătește PDF";
  host.querySelectorAll('[data-action="prev"],[data-action="restart"]').forEach(node=>{node.hidden=true;});
  if(card&&q?.id!==lastQuestionId){
   lastQuestionId=q.id;const prompt=card.querySelector(".fg-test__prompt");
   if(prompt){prompt.tabIndex=-1;prompt.focus({preventScroll:true});}
  }
  const status=document.getElementById("session-status");
  const text=s?.submitted?"Încarcă PDF-ul în Google Classroom.":"";
  if(status.textContent!==text)status.textContent=text;
 }
 new MutationObserver(decorate).observe(host,{subtree:true,childList:true});
 host.addEventListener("click",event=>{
  const action=event.target.closest("[data-action]")?.dataset.action;
  if(!["next","submit"].includes(action))return;
  const q=window.TestEngine.getCurrentQuestion(),s=window.TestEngine.getState(),answer=s.answers[q?.id];
  if(q?.type==="numeric"&&answer!==undefined){
   const value=String(answer).trim().replace(",",".");
   if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)||!Number.isFinite(Number(value))){
    event.preventDefault();event.stopImmediatePropagation();
    const message=host.querySelector("[data-question-message]");
    if(message)message.textContent="Introdu numai un număr valid, fără unitate.";
   }
  }
 },true);
 form.addEventListener("submit",event=>{
  event.preventDefault();if(started)return;error.textContent="";
  const v=Number(document.getElementById("catalog-number").value);
  const name=document.getElementById("student-name").value.trim();
  if(!name||name.length>80){error.textContent="Completează numele și prenumele.";return;}
  if(!Number.isInteger(v)||v<1||v>30){error.textContent="Numărul din catalog trebuie să fie un întreg între 1 și 30.";return;}
  if(!window.TestEngine||!APP.testReport){error.textContent="Testul nu poate fi pornit. Anunță profesorul.";return;}
  const student={nume:name,catalog:String(v)};
  window.TEST_DATA=createData(v,student);
  window.TEST_DATA.config.integrityMonitoring=true;
  try{
   host.hidden=false;window.initTestEngine({mount:host});
   if(!window.TestEngine.getState().started&&!window.TestEngine.start({student})){host.hidden=true;error.textContent="Testul nu a putut fi pornit.";return;}
   started=true;remember(student);document.getElementById("registration").hidden=true;decorate();
  }catch(cause){host.hidden=true;error.textContent="Testul nu poate fi pornit. Anunță profesorul.";console.error(cause);}
 });
 // Reîncarcă mai întâi varianta, apoi lasă motorul să restaureze sesiunea.
 try{
  const saved=JSON.parse(localStorage.getItem(profileKey)||"null");
  const student=saved?.student,v=Number(student?.catalog);
  if(student?.nume&&Number.isInteger(v)&&v>=1&&v<=30&&window.TestEngine&&APP.testStorage){
   document.getElementById("student-name").value=student.nume;
   document.getElementById("catalog-number").value=v;
   window.TEST_DATA=createData(v,student);
   if(saved.completed)APP.testStorage.saveSession(window.TEST_DATA.id,saved.completed);
   host.hidden=false;window.initTestEngine({mount:host});
   if(window.TestEngine.getState().started){
    started=true;document.getElementById("registration").hidden=true;
    if(saved.completed)window.TestEngine.submit();
    decorate();
   }else host.hidden=true;
  }
 }catch(cause){console.error(cause);}
 window.addEventListener("pagehide",()=>window.TestEngine?.save?.());
 window.addEventListener("beforeunload",event=>{
  const s=window.TestEngine?.getState?.();if(started&&!s?.submitted){event.preventDefault();event.returnValue="";}
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window,document);
