(()=>{'use strict';
const word=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim().replace(/[.!?]$/,'');
const unit=v=>String(v).trim().replace(/\s+/g,'').replace(/\^?2|²/g,'²').replace(/\^?3|³/g,'³');
function arithmetic(raw){
 let s=String(raw).replace(/\s/g,'').replace(/,/g,'.').replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/[÷:]/g,'/').replace(/²/g,'^2').replace(/³/g,'^3');
 if(!s||s.length>180||/[^0-9.+\-*/^()]/.test(s))throw Error('Scrie un număr sau un calcul cu numere.');
 const tokens=s.match(/\d+(?:\.\d*)?|\.\d+|[+\-*/^()]/g)||[];if(tokens.join('')!==s)throw Error('Verifică numerele și separatorul zecimal.');let i=0;
 function atom(){let t=tokens[i++];if(t==='('){let a=add();if(tokens[i++]!==')')throw Error('Închide paranteza.');return a;}if(!t||!/^\d|^\./.test(t))throw Error('Completează calculul.');return Number(t);}
 function power(){let a=atom();if(tokens[i]==='^'){i++;const e=unary();if(!Number.isInteger(e)||Math.abs(e)>12)throw Error('Verifică exponentul.');a=Math.pow(a,e);}return a;}
 function unary(){if(tokens[i]==='+'){i++;return unary();}if(tokens[i]==='-'){i++;return -unary();}return power();}
 function mul(){let a=unary();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],b=unary();if(op==='/'&&b===0)throw Error('Nu împărțim la zero.');a=op==='*'?a*b:a/b;}return a;}
 function add(){let a=mul();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],b=mul();a=op==='+'?a+b:a-b;}return a;}
 const result=add();if(i!==tokens.length||!Number.isFinite(result))throw Error('Verifică scrierea calculului.');return result;
}
function numeric(raw){const pieces=String(raw).split('=');if(pieces.some(x=>!x.trim()))throw Error('Completează fiecare parte a egalității.');const values=pieces.map(arithmetic);if(values.some(x=>Math.abs(x-values[0])>Math.max(1e-10,Math.abs(values[0])*1e-7)))throw Error('Părțile egalității nu au aceeași valoare.');return values.at(-1);}
let active=null,selection=[0,0];const panel=document.querySelector('[data-math-keyboard]');
if(panel){
 let virtualField=null,oldMode='';
 function reveal(){if(!active||panel.hidden)return;requestAnimationFrame(()=>{const bottom=active.getBoundingClientRect().bottom,top=panel.getBoundingClientRect().top;if(bottom>top-18)window.scrollBy({top:bottom-top+18,behavior:'instant'});});}
 function restoreMode(){if(virtualField){virtualField.inputMode=oldMode;virtualField=null;}}
 document.addEventListener('selectionchange',()=>{if(active&&document.activeElement===active)selection=[active.selectionStart||0,active.selectionEnd||0];});
 document.addEventListener('focusin',e=>{if(e.target.matches('input[data-answer],input[data-unit],textarea')){active=e.target;selection=[active.selectionStart||0,active.selectionEnd||0];reveal();}});
 document.addEventListener('click',e=>{const open=e.target.closest('[data-open-keyboard]');if(open){const target=document.getElementById(open.dataset.openKeyboard);restoreMode();if(target){active=target;virtualField=target;oldMode=target.inputMode;target.inputMode='none';active.focus();selection=[active.selectionStart||0,active.selectionEnd||0];}panel.hidden=false;document.body.classList.add('keyboard-open');reveal();}});
 panel.addEventListener('pointerdown',e=>{if(e.target.closest('button[data-key]')){if(active&&document.activeElement===active)selection=[active.selectionStart||0,active.selectionEnd||0];e.preventDefault();}});
 panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-close-keyboard')){panel.hidden=true;document.body.classList.remove('keyboard-open');restoreMode();active?.focus();return;}if(!b.hasAttribute('data-key')||!active)return;
 const k=b.dataset.key;let [start,end]=selection;start=Math.min(start,active.value.length);end=Math.min(end,active.value.length);if(k==='backspace'){if(start===end&&start>0)start--;active.setRangeText('',start,end,'end');}else active.setRangeText(k,start,end,'end');active.dispatchEvent(new Event('input',{bubbles:true}));selection=[active.selectionStart,active.selectionEnd];active.focus({preventScroll:true});active.setSelectionRange(...selection);
 });
}
function format(text){let s=String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return s.replace(/kg\/m³|g\/cm³|m\/s²|m\/s|km\/h|N\/kg|N\/m/g,x=>{const[a,b]=x.split('/');return `<span class="frac" role="math" aria-label="${a} supra ${b}"><span class="num">${a}</span><span class="den">${b}</span></span>`;});}
window.PhysicsInput=Object.freeze({word,unit,numeric,format});
})();
