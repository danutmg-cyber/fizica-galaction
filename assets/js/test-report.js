/* Fizica Galaction: monitorizare si PDF tabelar. Incarcati DUPA test-engine.js.
   Nu modifica punctajul. Pentru evaluare: questionsPerPage: 1.
   Foloseste API-ul public FizicaGalaction.testEngine, nu variabilele testului standalone. */
(function (window, document) {
  "use strict";
  const APP = window.FizicaGalaction = window.FizicaGalaction || {};
  if (APP.testReport) return;
  const widths = [200, 105, 60, 55, 95], left = 40, bottom = 45, font = 8.5, line = 11;
  let enabled = true, records = {}, open = null, pending = false, key = "", panel = null, previewUrl = "";
  const engine = () => APP.testEngine || window.TestEngine;
  const state = () => engine()?.getState?.() || {};
  const data = () => engine()?.getData?.() || {};
  const active = () => { const s = state(); return enabled && s.started && !s.submitted; };
  const ascii = value => String(value ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/→/g, "->").replace(/[—–]/g, "-").replace(/×/g, "x")
    .replace(/[^\x20-\x7e\n]/g, "?");
  const plain = value => {
    const node = document.createElement("div");
    node.innerHTML = String(value ?? "");
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  };
  const escape = value => ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const number = value => Number(value || 0).toFixed(2).replace(".", ",");
  const stamp = value => new Date(value).toLocaleString("ro-RO", {timeZone:"Europe/Bucharest"});
  function wrap(value, width) {
    const output = [];
    for (const paragraph of ascii(value).split("\n")) {
      let row = "";
      for (let word of paragraph.split(/\s+/).filter(Boolean)) {
        if (row && row.length + word.length + 1 > width) { output.push(row); row = ""; }
        while (word.length > width) {
          if (row) { output.push(row); row = ""; }
          output.push(word.slice(0, width)); word = word.slice(width);
        }
        if (word) row += (row ? " " : "") + word;
      }
      output.push(row);
    }
    return output;
  }
  function formatAnswer(question, answer) {
    const options = question?.options || [];
    const option = value => {
      const index = options.findIndex(o => String(o.value) === String(value));
      if (index >= 0) return String.fromCharCode(97 + index) + ") " + plain(options[index].label);
      if (String(value) === "true") return "Adevarat";
      if (String(value) === "false") return "Fals";
      return plain(value);
    };
    if (answer === undefined || answer === null || answer === "") return "Fara raspuns";
    if (Array.isArray(answer)) return answer.map(option).join("; ");
    if (typeof answer === "object") return Object.entries(answer)
      .map(([a,b]) => plain(a) + " -> " + option(b)).join("\n");
    const result = option(answer);
    return result + (question?.unit ? " " + plain(question.unit) : "");
  }
  function pdfText(x, y, text, red = false) {
    return (red ? "0.72 0.08 0.08 rg" : "0 0 0 rg") +
      "\nBT /F1 " + font + " Tf " + x + " " + y + " Td (" + escape(text) + ") Tj ET";
  }
  function questionText(row, question, i) {
    let text = (i+1) + ". " + plain(row.prompt);
    if (question?.instruction) text += "\n" + plain(question.instruction);
    if (question?.image) text += "\nImagine: " + question.image;
    if (question?.options?.length) text += "\n" + question.options.map((o,j) =>
      String.fromCharCode(97+j) + ") " + plain(o.label)).join("; ");
    if (question?.pairs?.length) {
      const a = question.pairs.map((p,j) => plain(p.left ?? p.stanga ?? p[0] ?? j));
      const b = question.pairs.map(p => plain(p.right ?? p.dreapta ?? p[1] ?? ""));
      text += "\nColoana A: " + a.join("; ") + "\nColoana B: " + b.join("; ");
    }
    return text;
  }
  function buildPdf(result, testData, log = records, monitored = enabled) {
    const pages = [], questions = testData.questions || [];
    let commands = [], y = 0, tableTopY = 0;
    const cell = (text, i) => wrap(text, Math.floor((widths[i]-10)/(font*0.6)));
    function row(columns, red, continued = false) {
      const height = Math.max(...columns.map(c => c.length), 1) * line + 10;
      let x = left;
      columns.forEach((lines, i) => {
        commands.push("0.65 0.7 0.75 RG 0.5 w " + x + " " + (y-height) + " " + widths[i] + " " + height + " re S");
        lines.forEach((text,j) => commands.push(pdfText(x+5,y-13-j*line,text,red&&(i===1||i===2))));
        x += widths[i];
      });
      y -= height;
    }
    function newPage() {
      if (commands.length) pages.push(commands);
      commands = []; y = 798;
      const profile = testData.studentFields?.length
        ? testData.studentFields.map(f => plain(f.label) + ": " + plain(result.student?.[f.id] || "-")).join(" | ")
        : Object.entries(result.student || {}).map(([a,b]) => plain(a) + ": " + plain(b)).join(" | ");
      const header = [
        plain(testData.title || "Test de fizica"),
        profile || "Elev: necompletat",
        "Finalizat: " + stamp(result.submittedAt || Date.now()),
        "Punctaj: " + number(result.score) + "/" + number(result.maxScore) + " | Nota calculata: " + number(result.grade),
        monitored ? "Monitorizare activata. Rosu = parasire la acel item." : "Monitorizare dezactivata: absentele nu au fost inregistrate.",
        "Punctajul nu este penalizat automat. Profesorul decide.",
        "Ore in fusul Europe/Bucharest. Durate in secunde."
      ];
      for (const text of header) for (const piece of wrap(text,95)) {
        commands.push(pdfText(left,y,piece)); y -= line;
      }
      y -= 8;
      row(["Enuntul itemului","Raspunsul elevului","Punctaj","A parasit pagina?","Moment si durata absentei"].map(cell),false);
      tableTopY = y;
    }
    newPage();
    (result.review || []).forEach((review, index) => {
      const question = questions.find(q => String(q.id) === String(review.id));
      const events = log[review.id] || [];
      const absence = !monitored ? "Neînregistrat" : !events.length ? "0 secunde" :
        events.map((event,i) => "Iesire " + (i+1) + "\n" + stamp(event.start) +
          "\nAbsent: " + number(Math.max(0,(event.end-event.start)/1000)) + " s\n" +
          (event.reasons || []).join("; ")).join("\n\n");
      const cols = [
        questionText(review,question,index),
        formatAnswer(question,review.answer),
        number(review.points)+"/"+number(review.maxPoints),
        monitored ? events.length ? "DA" : "NU" : "Oprit",
        absence
      ].map(cell);
      const count = Math.max(...cols.map(c=>c.length));
      let offset = 0;
      const wholeHeight = count * line + 10;
      if (wholeHeight <= tableTopY - bottom && wholeHeight > y - bottom) newPage();
      while (offset < count) {
        const continued = offset > 0;
        const available = Math.floor((y-bottom-10)/line)-(continued?1:0);
        if (available < 1) {newPage();continue;}
        const take = Math.min(available,count-offset);
        const segment = cols.map(c=>c.slice(offset,offset+take));
        if (continued) {
          segment[0].unshift("Item "+(index+1)+" (continuare)");
          for(let i=1;i<5;i++)segment[i].unshift("");
        }
        row(segment,events.length>0);
        offset += take;
        if(offset<count)newPage();
      }
    });
    if(commands.length)pages.push(commands);
    const objects = ["","","<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"], kids=[];
    const add = text => (objects.push(text),objects.length);
    pages.forEach((page,i)=>{
      const stream = page.join("\n")+"\n"+pdfText(left,25,"Pagina "+(i+1)+"/"+pages.length);
      const content = add("<< /Length "+stream.length+" >>\nstream\n"+stream+"\nendstream");
      kids.push(add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents "+content+" 0 R >>")+" 0 R");
    });
    objects[0]="<< /Type /Catalog /Pages 2 0 R >>";
    objects[1]="<< /Type /Pages /Count "+kids.length+" /Kids ["+kids.join(" ")+"] >>";
    let pdf="%PDF-1.4\n";const offsets=[];
    objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+" 0 obj\n"+o+"\nendobj\n";});
    const xref=pdf.length;
    pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
    offsets.forEach(n=>pdf+=String(n).padStart(10,"0")+" 00000 n \n");
    pdf+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";
    return new Blob([pdf],{type:"application/pdf"});
  }
  function mount() { return document.querySelector("#testApp, [data-test-engine]"); }
  function save() {
    if(!key)return;
    try {sessionStorage.setItem(key,JSON.stringify({enabled,records,open,pending}));}catch(_){}
  }
  function showWarning() {
    const host=mount();if(!host)return;
    if(!panel){
      panel=document.createElement("aside");panel.setAttribute("role","alert");
      panel.style.cssText="padding:16px;background:#fff0ed;border:2px solid #b42318;border-radius:12px;color:#8b1e16;margin:12px 0";
      panel.innerHTML='<p data-report-warning></p><button type="button" data-report-ack>Am inteles</button>';
      host.before(panel);
      panel.querySelector("button").onclick=()=>{
        if(document.hidden||!document.hasFocus()||open)return;
        pending=false;panel.hidden=true;save();
      };
    }
    panel.hidden=false;
    panel.querySelector("[data-report-warning]").textContent=open
      ? "Ai parasit pagina testului. Itemul afisat, ora iesirii si durata vor fi inregistrate in PDF."
      : "Ai revenit in test. Raspunsul si punctajul itemului afectat vor fi rosii in PDF. Confirma pentru a continua.";
    panel.querySelector("button").disabled=Boolean(open);
  }
  function endAbsence() {
    if(!open)return;
    const end=Date.now();
    for(const id of open.ids){
      const event=(records[id]||[]).find(e=>e.start===open.start&&e.end===null);
      if(event)event.end=Math.max(event.start,end);
    }
    open=null;save();
  }
  function leave(reason) {
    if(!active())return;
    if(open){
      for(const id of open.ids){const event=records[id]?.find(e=>e.start===open.start&&e.end===null);
        if(event&&!event.reasons.includes(reason))event.reasons.push(reason);}
      save();return;
    }
    const s=state(),d=data(),count=Math.max(1,Number(d.config?.questionsPerPage)||1);
    const start=Math.floor(s.currentIndex/count)*count;
    const shown=(d.questions||[]).slice(start,start+count);
    if(!shown.length)return;
    open={start:Date.now(),ids:shown.map(q=>q.id)};
    for(const id of open.ids)(records[id]??=[]).push({start:open.start,end:null,reasons:[reason]});
    pending=true;save();showWarning();
  }
  function returnToTest() {
    if(!active()||document.hidden||!document.hasFocus())return;
    endAbsence();if(pending)showWarning();
  }
  function setup(fresh=false) {
    const s=state(),d=data(); if(!s.started)return;
    key="fg-test-report:"+d.id+":"+s.startedAt;
    if(fresh){records={};open=null;pending=false;}
    else {
      try{
        const cached=JSON.parse(sessionStorage.getItem(key)||"null");
        if(cached){records=cached.records||{};open=cached.open||null;pending=Boolean(cached.pending);enabled=cached.enabled!==false;}
      }catch(_){}
    }
    endAbsence();save();
    if(pending)showWarning();else if(panel)panel.hidden=true;
  }
  function download() {
    const result=engine()?.getResult?.();if(!result)return;
    const blob=buildPdf(result,data());
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    previewUrl=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=previewUrl;a.download="test-fizica-"+String(result.testId||"rezultat").replace(/[^a-z0-9_-]/gi,"-")+".pdf";
    document.body.appendChild(a);a.click();a.remove();
    const preview=mount()?.querySelector("[data-report-preview]");
    if(preview){preview.href=previewUrl;preview.hidden=false;}
  }
  function enhance() {
    const host=mount();if(!host||!engine())return;
    const d=data();
    const intro=host.querySelector('[data-screen="intro"]');
    if(intro&&!intro.querySelector("[data-report-setting]")){
      enabled=d.config?.integrityMonitoring!==false;
      const label=document.createElement("label");
      label.setAttribute("data-report-setting","");
      label.style.cssText="display:block;padding:12px";
      const input=document.createElement("input");input.type="checkbox";input.checked=enabled;
      input.onchange=()=>{enabled=input.checked;};
      label.append(input,document.createTextNode(" Anticopiere: inregistreaza parasirea paginii in PDF. Nu scade automat punctajul."));
      intro.prepend(label);
    }
    const result=host.querySelector('[data-screen="result"]');
    if(!result||result.querySelector("[data-report-download]"))return;
    const box=document.createElement("div");box.className="fg-test__buttons";
    box.innerHTML='<button type="button" class="fg-test__button" data-report-download>Descarca PDF tabelar</button> '+
      '<a data-report-preview target="_blank" rel="noopener" hidden>Deschide PDF pentru salvare</a>'+
      '<p>Salveaza PDF-ul in telefon, apoi ataseaza-l la tema din Google Classroom.</p>';
    box.querySelector("button").onclick=download;result.append(box);
  }
  document.addEventListener("fizica:test-start",()=>{setup(true);enhance();});
  document.addEventListener("fizica:test-resume",()=>{setup(false);enhance();});
  document.addEventListener("fizica:test-init",()=>{if(state().started&&!state().submitted)setup(false);enhance();});
  document.addEventListener("fizica:test-complete",()=>{
    endAbsence();pending=false;if(panel)panel.hidden=true;save();enhance();
  });
  window.addEventListener("blur",()=>leave("Fereastra inactiva"));
  window.addEventListener("focus",returnToTest);
  window.addEventListener("pagehide",()=>leave("Pagina inchisa sau reincarcata"));
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden)leave("Pagina ascunsa");else returnToTest();
  });
  document.addEventListener("click",event=>{
    if(active()&&pending&&mount()?.contains(event.target)&&event.target.closest("[data-action]")){
      event.preventDefault();event.stopImmediatePropagation();showWarning();
    }
  },true);
  document.addEventListener("keydown",event=>{
    if(active()&&pending&&["ArrowLeft","ArrowRight","PageUp","PageDown"].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();showWarning();
    }
  },true);
  ["copy","cut","paste","contextmenu"].forEach(name=>{
    document.addEventListener(name,event=>{
      if(active()&&mount()?.contains(event.target))event.preventDefault();
    },true);
  });
  APP.testReport=Object.freeze({buildPdf,formatAnswer,download,getLog:()=>JSON.parse(JSON.stringify(records))});
  function boot() {
    const host=mount();if(!host)return;
    if(state().started&&!state().submitted)setup(false);
    enhance();
    new MutationObserver(enhance).observe(host,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window,document);

