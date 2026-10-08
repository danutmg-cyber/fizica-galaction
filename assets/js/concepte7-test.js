/* Generator si pagina pentru clasa VII. Dependente: test-engine.js, test-report.js. */
(function(window,document){
"use strict";
const APP=window.FizicaGalaction=window.FizicaGalaction||{};
const contexts=["laborator","atelier","bibliotecă","sală","curte","grădină","parc","teren","magazie","garaj","hol","muzeu","seră","bucătărie","depozit","cabinet","piscină","stadion","sală de sport","fabrică","port","stație","piață","pădure","livadă","campus","observator","studio","aeroport","șantier"];
const fmt=n=>Number(Number(n).toPrecision(12)).toString().replace(".",",");
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mix(values,r){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildVariant(catalog){
 if(!Number.isInteger(catalog)||catalog<1||catalog>30)throw Error("Numărul din catalog trebuie să fie între 1 și 30.");
 const v=catalog,r=random(v*104729),where=contexts[v-1],items=[];
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
 conversion(0,"În "+where+", un fir pentru un experiment are "+fmt(x)+" cm. Exprimă lungimea în metri.",x/100,"m");
 x=(38765+137*v)/10;
 conversion(1,"În "+where+", masa unui corp este "+fmt(x)+" g. Exprimă masa în kilograme.",x/1000,"kg");
 const minutes=12+v,seconds=17+v;
 conversion(2,"În "+where+", înregistrarea datelor durează "+minutes+" minute și "+seconds+" secunde. Exprimă durata totală în secunde.",minutes*60+seconds,"s");
 x=(43217+113*v)/10;
 dual(3,"În "+where+", "+fmt(x)+" mm reprezintă "+fmt(x/(v%2?1000:100))+" m.",Boolean(v%2));
 x=(8731+97*v)/10;
 dual(4,"În "+where+", "+fmt(x)+" cm² reprezintă "+fmt(x/(v%2?100:10000))+" m².",!Boolean(v%2));
 pairing(5,"Asociază lungimile măsurate în "+where+" cu valorile lor în SI (m).",[
  [fmt((2467+31*v)/10)+" cm",fmt((2467+31*v)/1000)],
  [fmt((58731+127*v)/10)+" mm",fmt((58731+127*v)/10000)],
  [fmt((173+11*v)/100)+" km",fmt((173+11*v)*10)]]);
 pairing(6,"Asociază duratele din experimentul realizat în "+where+" cu valorile în SI (s).",[
  [fmt((173+13*v)/10)+" min",fmt((173+13*v)*6)],
  [fmt((127+7*v)/100)+" h",fmt((127+7*v)*36)],
  [fmt((4371+53*v)/10)+" ms",fmt((4371+53*v)/10000)]]);
 x=(176543+211*v)/10;
 numeric(7,"În "+where+", volumul unui corp este "+fmt(x)+" cm³. Exprimă volumul în m³.",x/1e6,"m³");
 x=(3871+43*v)/100;
 numeric(8,"În "+where+", o suprafață măsurată are "+fmt(x)+" dm². Exprimă aria în m².",x/100,"m²");
 x=(276543+317*v)/10;
 numeric(9,"În "+where+", masa unui eșantion este "+fmt(x)+" mg. Exprimă masa în kg.",x/1e6,"kg");
 single(10,"După "+(12+v)+" măsurări făcute în "+where+", pe ce trebuie să se bazeze concluzia experimentului?","Rezultatele măsurate și analizate",
 ["Rezultatele măsurate și analizate","Părerea unui coleg","Numai ipoteza inițială","Aspectul instrumentelor"]);
 single(11,"În "+where+", se notează masa m = "+fmt((235+17*v)/100)+" kg. Ce fel de mărime fizică este masa?","Scalară",["Scalară","Vectorială","O direcție","Un sens"]);
 single(12,"În "+where+", o forță are valoarea "+(17+3*v)+" N. Ce trebuie precizat, în plus față de valoare și unitate, pentru a o descrie ca vector?","Direcția și sensul",
 ["Direcția și sensul","Numai simbolul","Numai numele instrumentului","Numărul de măsurări"]);
 dual(13,"În experimentul cu "+(8+v)+" măsurări din "+where+", pentru a studia efectul lungimii firului, elevul "+
 (v%2?"modifică numai lungimea și păstrează ceilalți factori constanți":"modifică simultan lungimea, masa și metoda de măsurare")+
 ". Procedura este potrivită pentru izolarea efectului lungimii.",Boolean(v%2));
 const k=7+v;
 dual(14,"Un triunghi dreptunghic măsurat în "+where+" are catetele "+(3*k)+" cm și "+(4*k)+" cm. Ipotenuza este "+(v%2?5*k:7*k)+" cm.",Boolean(v%2));
 pairing(15,"În "+where+", triunghiul ABC, dreptunghic în A, are AB = "+(3*k)+" cm și AC = "+(4*k)+" cm; AD este perpendiculară pe BC. Asociază elementele.",
 [["AB și AC","Catete"],["BC","Ipotenuză"],["AD","Înălțime pe ipotenuză"]]);
 pairing(16,"În "+where+", un corp de "+fmt((17+v)/10)+" kg este reprezentat într-o schiță. Asociază descrierile cu noțiunile.",
 [["Masa corpului: "+fmt((17+v)/10)+" kg","Mărime scalară"],["Dreapta orizontală a unei săgeți","Direcția vectorului"],["Săgeata orientată spre est","Sensul vectorului"]]);
 const scale=(37+v)/10;
 numeric(17,"În "+where+", un triunghi dreptunghic are catetele "+fmt(5*scale)+" cm și "+fmt(12*scale)+" cm. Calculează ipotenuza folosind teorema lui Pitagora.",13*scale,"cm");
 const strength=13+v,arrow=(27+v)/10;
 numeric(18,"La reprezentarea unui vector în "+where+", scara este 1 cm pentru "+strength+" N. Săgeata are lungimea "+fmt(arrow)+" cm. Calculează valoarea forței reprezentate.",strength*arrow,"N");
 add(19,"text","Înaintea celor "+(9+v)+" măsurări din "+where+", elevul formulează o presupunere care va fi verificată experimental. Completează denumirea acestei etape/noțiuni.",["ipoteză","ipoteza"],
 {instruction:"Scrie un singur cuvânt.",placeholder:"Denumirea noțiunii"});
 const base=mix(Array.from({length:20},(_,i)=>i),random(20261008));
 return base.map((_,position)=>items.find(q=>q.family===base[(position+(v-1)*7)%20]));
}
const testConfig={
 questionsPerPage:1,shuffleQuestions:false,shuffleOptions:false,allowBack:false,
 keyboard:false,updateHash:false,requireAllAnswers:true,immediateFeedback:false,
 lockAfterCheck:true,showCorrectAnswers:false,showExplanations:false,
 persistStudentProfile:false,saveProgress:false,restoreProgress:false,
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
   if(!window.TestEngine.start({student})){host.hidden=true;error.textContent="Testul nu a putut fi pornit.";return;}
   started=true;document.getElementById("registration").hidden=true;decorate();
  }catch(cause){host.hidden=true;error.textContent="Testul nu poate fi pornit. Anunță profesorul.";console.error(cause);}
 });
 window.addEventListener("beforeunload",event=>{
  const s=window.TestEngine?.getState?.();if(started&&!s?.submitted){event.preventDefault();event.returnValue="";}
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window,document);
