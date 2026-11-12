(()=>{'use strict';
function pdfBlob(pages){const enc=new TextEncoder(),chunks=[],offsets=[0];let length=0;const put=x=>{const b=typeof x==='string'?enc.encode(x):x;chunks.push(b);length+=b.length;},objs=[];objs[1]='<< /Type /Catalog /Pages 2 0 R >>';objs[2]=`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`;pages.forEach((p,i)=>{const n=3+i*3,raw=atob(p.toDataURL('image/jpeg',.9).split(',')[1]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));objs[n]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${n+1} 0 R >> >> /Contents ${n+2} 0 R >>`;objs[n+1]={bytes,head:`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`};const stream='q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';objs[n+2]=`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;});put('%PDF-1.4\n');for(let i=1;i<objs.length;i++){offsets[i]=length;put(`${i} 0 obj\n`);if(typeof objs[i]==='string')put(objs[i]);else{put(objs[i].head+'\nstream\n');put(objs[i].bytes);put('\nendstream');}put('\nendobj\n');}const xref=length;put(`xref\n0 ${objs.length}\n0000000000 65535 f \n`);for(let i=1;i<objs.length;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');put(`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(chunks,{type:'application/pdf'});}
function make(data,identity,answers){
 const pages=[],M=80,W=1240,H=1754;let ctx,y;
 function page(){const c=document.createElement('canvas');c.width=W;c.height=H;ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.fillStyle='#10384b';ctx.fillRect(0,0,W,110);ctx.fillStyle='white';ctx.font='bold 32px Arial';ctx.fillText('Fizica Gimnaziu · Clasa a VII-a',M,65);pages.push(c);y=155;}
 function room(h){if(y+h>H-110)page();}
 function text(raw,size=25,bold=false){
  const clean=String(raw).replaceAll('&#124;','|');
  const parts=clean.match(/\[\[frac\|[^|]*\|[^|]*\]\]|[^\s]+|\n/g)||[''];ctx.font=`${bold?'bold ':''}${size}px Arial`;
  let row=[],width=0,height=size*1.5;
  function write(){room(height+10);ctx.fillStyle='#17384c';let x=M;for(const item of row){if(item.frac){const {a,b,w}=item;ctx.font=`${bold?'bold ':''}${size*.8}px Arial`;ctx.textAlign='center';ctx.fillText(a,x+w/2,y+size*.2);ctx.fillText(b,x+w/2,y+size*1.35);ctx.textAlign='left';ctx.strokeStyle='#17384c';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(x+3,y+size*.48);ctx.lineTo(x+w-3,y+size*.48);ctx.stroke();x+=w+10;}else{ctx.font=`${bold?'bold ':''}${size}px Arial`;ctx.fillText(item.t,x,y+size*.8);x+=item.w+8;}}y+=height+9;row=[];width=0;height=size*1.5;}
  for(let part of parts){if(part==='\n'){write();continue;}const match=part.match(/^\[\[frac\|([^|]*)\|([^|]*)\]\]$/);let item;if(match){ctx.font=`${size*.8}px Arial`;item={frac:true,a:match[1],b:match[2],w:Math.max(ctx.measureText(match[1]).width,ctx.measureText(match[2]).width)+16};height=Math.max(height,size*1.8);}else{ctx.font=`${bold?'bold ':''}${size}px Arial`;if(ctx.measureText(part).width>W-2*M){const chars=[...part];let buffer='';for(const c of chars){if(ctx.measureText(buffer+c).width>W-2*M){if(row.length)write();row=[{t:buffer,w:ctx.measureText(buffer).width}];write();buffer=c;}else buffer+=c;}part=buffer;}item={t:part,w:ctx.measureText(part).width};}
   if(width+item.w+10>W-2*M&&row.length)write();row.push(item);width+=item.w+10;if(item.frac)height=Math.max(height,size*1.8);
  }if(row.length)write();y+=8;
 }
 page();text(data.title,33,true);text('Fișă de lucru · Tema pentru acasă',24,true);text(`Nume: ${identity.surname||'________________'}    Prenume: ${identity.given||'________________'}`);text(`Clasa: ${identity.className||'________'}    Data: ${identity.date||'____________'}`);text(`Capitolul ${data.ch} · Lecția ${data.n}`,22);y+=20;
 data.tasks.forEach((task,i)=>{room(150);text(`${i+1}. ${task.q}`,25,true);const a=answers[i]||'';if(a.trim())text('Răspuns: '+a,24);else{room(100);ctx.strokeStyle='#b5c4ca';for(let j=0;j<2;j++){ctx.beginPath();ctx.moveTo(M,y+25);ctx.lineTo(W-M,y+25);ctx.stroke();y+=35;}}y+=15;});
 pages.forEach((p,i)=>{const c=p.getContext('2d');c.font='19px Arial';c.fillStyle='#526575';c.fillText(`${identity.surname||''} ${identity.given||''} · ${identity.className||''} · Pagina ${i+1}/${pages.length}`,M,H-50);});return pdfBlob(pages);
}
async function save(blob,name){
 let file=null;try{if(typeof File==='function'&&navigator.share&&navigator.canShare){const f=new File([blob],name,{type:'application/pdf'});if(navigator.canShare({files:[f]}))file=f;}}catch{}
 if(file&&(/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))){try{await navigator.share({files:[file],title:'Fișă de lucru · Fizica Gimnaziu'});return 'shared';}catch(e){if(e.name==='AbortError')return 'cancelled';}}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'downloaded';
}
window.WorksheetPdf=Object.freeze({make,save});
})();
