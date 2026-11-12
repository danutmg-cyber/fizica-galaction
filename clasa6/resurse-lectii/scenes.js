/* Desene și modele calitative pentru clasa a VI-a. Fără biblioteci externe. */
(()=>{'use strict';
const modes={
states:['Starea de agregare',['Solid','Lichid','Gaz'],'Cantitate reprezentată',3,8,5],phenomena:['Fenomen',['Mișcare','Topire','Deformare'],'Mărimea efectului',1,5,3],quantities:['Mărimea fizică',['Lungime','Masă','Durată'],'Valoare numerică',1,10,4],properties:['Criteriul de grupare',['Culoare','Formă','Mărime'],'Număr de corpuri',3,6,6],
ruler:['Poziția primului capăt',['La 0 cm','La 2 cm'],'Lungime (cm)',2,8,6],area:['Suprafața',['Dreptunghi','Formă neregulată'],'Mărime',2,6,4],volume:['Etapa',['Corp deasupra apei','Corp scufundat'],'Volumul corpului (cm³)',5,25,15],timer:['Momentul plecării',['0 s','12 s'],'Durata mișcării (s)',2,10,7],errors:['Poziția ochiului',['Perpendicular','Din lateral'],'Lungimea reală (cm)',3,8,6],average:['Seria de citiri',['10; 11; 12 cm','20; 21; 19 mm'],'A doua citire',9,13,11],dimensions:['Determinăm',['Aria','Volumul'],'Lungimea (cm)',2,6,4],
reference:['Reperul',['Șosea','Autobuz'],'Viteza vehiculului (m/s)',1,5,2],trajectory:['Traiectoria',['Dreaptă','Circulară','Curbată'],'Ritmul animației',1,3,1],distance:['Traseul',['Dus','Dus și întors'],'Lungimea la dus (m)',2,10,5],speed:['Comparație',['Două mobile'],'Viteza mobilului B (m/s)',1,5,3],uniform:['Grafic',['Distanță–timp'],'Viteza (m/s)',1,4,2],acceleration:['Mișcarea',['Accelerată','Încetinită'],'Intensitatea schimbării',1,3,2],inertia:['Situația',['Frânare','Pornire'],'Schimbarea mișcării',1,3,2],mass:['Căruciorul B',['Masă mai mare'],'Masa B (kg)',2,6,4],balance:['Etaloane',['Talerul drept'],'Masa etaloanelor (g)',50,250,100],density:['Material',['Material A','Material B'],'Volumul (cm³)',10,40,20],interaction:['Interacțiunea',['Minge lovită','Burete apăsat','Magnet și fier'],'Intensitatea efectului',1,4,2],force:['Sensul',['Spre dreapta','Spre stânga'],'Forța (N)',1,5,3],forces:['Forța studiată',['Greutatea','Frecarea','Forța elastică'],'Mărimea efectului',1,4,2],dynamometer:['Instrument',['Dinamometru 0–5 N'],'Forța (N)',0,5,2],weight:['Locul',['Pământ','Lună'],'Masa (kg)',1,5,2],
equilibrium:['Contactul',['Fără contact','În contact'],'Temperatura corpului cald (°C)',40,80,60],thermometer:['Scara',['Celsius și kelvin'],'Temperatura (°C)',0,100,25],heat:['Transmiterea',['Conducție','Convecție','Radiație'],'Intensitatea sursei',1,3,2],dilation:['Procesul',['Încălzire','Răcire'],'Variația temperaturii',1,5,3],phase:['Transformarea',['Topire','Solidificare','Evaporare','Condensare'],'Cantitate reprezentată',3,8,5],water:['Starea apei',['Lichidă','Înghețare'],'Temperatura apei lichide (°C)',0,20,4],
magnet:['Polii față în față',['N–S','N–N'],'Depărtarea inițială',1,4,2],compass:['Vecinătatea',['Fără magnet apropiat','Cu magnet apropiat'],'Rotirea carcasei (°)',0,180,45],atom:['Bilanțul',['Atom neutru','A pierdut un electron','A primit un electron'],'Sarcini pozitive în model',2,6,3],charge:['Perechea',['+ și −','+ și +','− și −','Încărcat și neutru'],'Depărtarea inițială',1,4,2],current:['Întrerupătorul',['Închis','Deschis'],'Număr de marcaje',3,8,5],circuit:['Întrerupătorul',['Închis','Deschis'],'Număr de marcaje',3,8,5],conductor:['Materialul',['Cupru','Fier','Plastic uscat','Sticlă uscată'],'Număr de marcaje',3,8,5],symbols:['Întrerupătorul',['Închis','Deschis'],'Număr de marcaje',3,8,5],series:['Gruparea și starea',['Serie: toate intacte','Serie: un bec întrerupt','Paralel: toate intacte','Paralel: o ramură întreruptă'],'Număr de marcaje',3,8,5],safety:['Situația',['Cablu deteriorat','Accident electric','Furtună'],'Etapa explicației',1,3,1],
light:['Materialul',['Transparent','Translucid','Opac'],'Luminozitatea sursei',1,3,2],straightlight:['Placa din mijloc',['Aliniată','Deplasată'],'Poziția plăcii',2,5,3],shadow:['Sursa',['Sursă mică'],'Distanța sursă–obiect',100,340,220],eclipse:['Eclipsa',['De Soare','De Lună'],'Abaterea de la aliniere',0,100,0],rays:['Fenomenul',['Reflexie','Refracție aer–apă'],'Înclinarea față de normală (°)',10,65,35]
};
const C={ink:'#16394c',teal:'#007f80',blue:'#2483bf',red:'#c54d43',gold:'#f3b83f',white:'#fffdf7',light:'#d2e5eb'};
const line=(x,y,a,b,color=C.ink,w=3,dash='')=>`<line x1="${x}" y1="${y}" x2="${a}" y2="${b}" stroke="${color}" stroke-width="${w}" ${dash?'stroke-dasharray="'+dash+'"':''}/>`;
const rect=(x,y,w,h,fill=C.teal,rx=6)=>`<rect x="${x}" y="${y}" width="${Math.max(.1,w)}" height="${Math.max(.1,h)}" rx="${rx}" fill="${fill}"/>`;
const circle=(x,y,r,fill=C.teal)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const text=(x,y,s,size=20,color=C.ink)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-family="system-ui,sans-serif">${s}</text>`;
const arrow=(x,y,a,b,col=C.teal)=>{const z=Math.atan2(b-y,a-x),r=11;return line(x,y,a,b,col,4)+`<path d="M${a-r*Math.cos(z-.5)},${b-r*Math.sin(z-.5)} L${a},${b} L${a-r*Math.cos(z+.5)},${b-r*Math.sin(z+.5)}" fill="none" stroke="${col}" stroke-width="4"/>`;};
const path=(d,col=C.teal,w=3,fill='none')=>`<path d="${d}" stroke="${col}" stroke-width="${w}" fill="${fill}"/>`;
const car=(x,y,col=C.teal)=>rect(x,y,88,37,col)+rect(x+14,y-20,48,25,col)+circle(x+18,y+38,10,C.ink)+circle(x+70,y+38,10,C.ink);
const lamp=(x,y,on)=>circle(x,y,on?32:26,on?'#ffe8a2':C.light)+circle(x,y,23,on?C.gold:'#afc3ca')+line(x-13,y-13,x+13,y+13)+line(x+13,y-13,x-13,y+13);
const f=n=>Number(n.toFixed(1)).toLocaleString('ro-RO');
function draw(mode,k,v,p){let s='',read='',cap='';const t=p*6;
 if(['states','phase'].includes(mode)){
 let state=k;if(mode==='phase')state=k===0?(p<.5?0:1):k===1?(p<.5?1:0):k===2?(p<.5?1:2):(p<.5?2:1);
 s=path('M180 65 V280 H460 V65',C.ink,5);
 if(state===0)s+=rect(245,180,150,95,'#80bacf');if(state===1)s+=rect(185,210,270,65,'#7fbdd8',0);
 for(let i=0;i<v*4;i++){let x,y;if(state===0){x=260+i%5*27;y=195+Math.floor(i/5)*13;}else if(state===1){x=205+i%8*30;y=225+Math.floor(i/8)*12;}else{x=205+(i*63+p*130)%230;y=95+(i*37+p*85)%155;}s+=circle(x,y,4,state===0?C.ink:C.blue);}
 read=mode==='states'?['Solidul își păstrează forma proprie.','Lichidul ia forma părții ocupate din vas.','Gazul ocupă spațiul disponibil.'][state]:['Solid → lichid','Lichid → solid','Lichid → gaz','Gaz → lichid'][k];
 if(mode==='states'&&state===0)read='Solidul își păstrează forma proprie.';
 cap='Punctele sunt o reprezentare simplificată a particulelor; dimensiunile și distanțele nu sunt la scară.';
 }else if(mode==='phenomena'){
 if(k===0)s=car(80+p*370,200)+line(50,250,590,250);else if(k===1)s=rect(220,135,130*(1-p*.5),110*(1-p),'#8ec4d8')+rect(200,255-p*30,240,p*35+3,C.blue);else s=rect(220,150+p*30,140+p*v*12,100-p*40,C.gold)+arrow(290,70,290,140+p*30);
 read=['Poziția se schimbă.','Gheața se transformă în apă lichidă.','Forma corpului se schimbă.'][k];cap='Compară începutul și sfârșitul folosind cursorul „Evoluția”.';
 }else if(mode==='quantities'){
 s=text(70,75,['LUNGIME','MASĂ','DURATĂ'][k],26)+rect(75,115,490,110,'white')+text(220,185,`${v} ${['cm','kg','s'][k]}`,44)+text(90,275,['Instrument: riglă','Instrument: balanță','Instrument: cronometru'][k]);read=`Valoare numerică: ${v}; unitate: ${['cm','kg','s'][k]}.`;cap='Alegem o unitate de același fel cu mărimea măsurată.';
 }else if(mode==='properties'){
 for(let i=0;i<v;i++){const col=i%2?C.gold:C.teal,sz=18+(i%3)*9,x=80+i*91,y=165+(p-.5)*(k===0?(i%2?70:-70):k===1?(i%3?60:-60):(i%3-1)*70);s+=(i%3===0?circle(x,y,sz,col):rect(x-sz,y-sz,sz*2,sz*2,col))+text(x-16,290,String.fromCharCode(65+i));}read='Aceleași corpuri, grupate după '+['culoare','formă','mărime'][k]+'.';cap='La schimbarea criteriului, comparăm o altă proprietate a acelorași corpuri.';
 }else if(['ruler','errors'].includes(mode)){
 const start=mode==='ruler'?k*2:0,x=80+start*45,w=v*45;
 s=rect(65,210,515,55,'#f9e8a8')+rect(x,140,w,40,C.teal);
 for(let i=0;i<=10;i++)s+=line(80+i*45,210,80+i*45,235)+text(75+i*45,257,i,15);
 s+=line(x,130,x,215,C.red,2,'5 4')+line(x+w,130,x+w,215,C.red,2,'5 4');
 if(mode==='errors')s+=circle(k?x+w+75:x+w,65,12,C.ink)+line(k?x+w+75:x+w,80,x+w,210,C.blue,2,'4 4');
 read=mode==='ruler'?`Prima citire: ${start} cm; ultima: ${start+v} cm; lungime: ${v} cm.`:(k?'Privirea oblică poate deplasa citirea aparentă.':'Privirea perpendiculară: citire aliniată cu marcajul.');cap='Marcajul zero, alinierea riglei și poziția ochiului contează.';
 }else if(['area','dimensions'].includes(mode)){
 const cols=v,rows=3,sz=35;let count=0;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){if(mode==='area'&&k===1&&x===cols-1&&y===0)continue;count++;s+=rect(140+x*sz,110+y*sz,sz-2,sz-2,count/(cols*rows)<=p?C.gold:'#b6d8d7',1);}
 if(mode==='dimensions'&&k===1){s+=path(`M140 105 l45 -35 h${cols*sz} v${rows*sz} l-45 35 M${140+cols*sz} 110 l45 -35`,C.teal,3);s+=text(190,285,`V = ${v} × 3 × 2 = ${v*6} cm³`);read=`Două straturi de câte ${v*3} cuburi: ${v*6} cm³.`;}else{s+=text(170,285,`A = ${count} cm²`);read=`Suprafața acoperă ${count} pătrate de 1 cm².`;}cap='Fiecare pătrat are latura 1 cm. Pentru volum, fiecare cub are muchia 1 cm.';
 }else if(mode==='volume'){
 const sub=k===1?p:0,level=40+v*sub,y=285-level*2.3;
 s=rect(190,y,240,285-y,'#9acde2',0)+path('M185 45 V285 H435 V45',C.ink,4);
 for(let i=10;i<=90;i+=10)s+=line(420,285-i*2.3,450,285-i*2.3)+text(455,291-i*2.3,i,17);
 s+=circle(305,70+sub*160,17+v*.35,'#818b91')+line(175,193,435,193,C.blue,2,'6 5');read=`V₁ = 40 mL; indicație curentă ≈ ${f(level)} mL.${sub>=.99?' Volumul corpului: '+v+' cm³.':''}`;cap='Alege „Corp scufundat” și du evoluția la final pentru a citi V₂. Diferența este volumul corpului.';
 }else if(mode==='timer'){
 s=car(60+p*420,220)+line(55,265,585,265)+circle(310,100,62,'white')+text(260,111,f((k?12:0)+v*p)+' s',30);read=`Plecare: ${k?12:0} s; acum: ${f((k?12:0)+v*p)} s; durată scursă: ${f(v*p)} s.`;cap='Momentele și intervalele se exprimă în aceleași unități, dar sunt noțiuni diferite.';
 }else if(mode==='average'){
 const vals=k?[20,v+10,19]:[10,v,12],avg=vals.reduce((a,b)=>a+b)/3,mi=k?18:8,scale=k?75:65;
 s=line(70,220,570,220);vals.forEach((a,i)=>{const x=90+(a-mi)*scale;s+=circle(x,130+i*23,9,C.teal)+line(x,140+i*23,x,220,C.teal,2,'3 4');});const x=90+(avg-mi)*scale;s+=arrow(x,280,x,223,C.red)+text(80,60,vals.join(' ; ')+(k?' mm':' cm'),28);read=`Media = ${f(avg)} ${k?'mm':'cm'}.`;cap='Marcajul roșu arată media. Schimbă a doua citire în seria de centimetri.';
 }else if(mode==='reference'){
 const offset=p*v*65,busX=k?180:80+offset,treeX=k?500-offset:520;
 s=rect(busX,145,150,80,C.teal)+circle(busX+30,230,13,C.ink)+circle(busX+120,230,13,C.ink)+circle(busX+75,162,12,C.gold)+rect(busX+65,177,20,33,C.gold)+rect(treeX,130,12,100,'#836d54')+circle(treeX+6,107,44,'#7cae83')+line(30,247,610,247);read=k?'Față de autobuz: călătorul rămâne pe loc; copacul își schimbă poziția.':'Față de șosea: autobuzul și călătorul își schimbă poziția.';cap='Schimbarea reperului schimbă descrierea mișcării, nu situația fizică.';
 }else if(mode==='trajectory'){
 let x,y;if(k===0){s=line(70,190,560,190,C.blue,3,'7 5');x=70+p*490;y=190;}else if(k===1){s=`<circle cx="320" cy="175" r="105" fill="none" stroke="${C.blue}" stroke-dasharray="7 5" stroke-width="3"/>`;x=320+105*Math.cos(p*Math.PI*2);y=175+105*Math.sin(p*Math.PI*2);}else{s=path('M70 230 Q320 -20 570 230',C.blue);x=70+500*p;y=230-500*p*(1-p);}s+=circle(x,y,16,C.gold);read=['Traiectorie rectilinie','Traiectorie circulară','Traiectorie curbilinie'][k];cap='Punctul colorat este mobilul; linia reprezintă traiectoria în reperul desenului.';
 }else if(mode==='distance'){
 const pos=k?(p<=.5?p*2:2-p*2):p;s=line(80,210,560,210,C.blue,5)+car(70+pos*430,160);s+=text(65,275,'Plecare')+text(485,275,'Capăt');read=`Distanță parcursă: ${f(v*p*(k?2:1))} m; durată în model: ${f(t)} s.`;cap='La întoarcere, distanța parcursă continuă să crească, chiar dacă mobilul revine spre plecare.';
 }else if(['speed','uniform','acceleration','mass','inertia'].includes(mode)){
 if(mode==='uniform'){
 s=line(65,250,340,250)+car(65+p*v*45,200)+arrow(400,265,610,265)+arrow(400,265,400,55)+text(565,318,'t (s)',19)+text(350,40,'d (m)',19);for(let j=0;j<=2;j++){s+=line(400+j*95,265,400+j*95,275)+text(394+j*95,296,j*3,18);s+=line(394,265-j*84,590,265-j*84,C.light,1)+text(365,270-j*84,j*12,17);}for(let j=0;j<=6;j++)s+=circle(65+j*v*7.5,265,4,C.blue);s+=path(`M400 265 L${400+p*190} ${265-p*v*42}`,C.teal,4)+circle(400+p*190,265-p*v*42,6,C.gold);read=`t = ${f(t)} s; d = ${f(v*t)} m; v = ${v} m/s.`;cap='La stânga: drumul drept. La dreapta: graficul distanță–timp, nu forma drumului.';
 }else if(mode==='acceleration'){
 const power=1+v*.3,fn=q=>k?1-Math.pow(1-q,power):Math.pow(q,power);
 s=line(60,245,580,245);for(let i=0;i<=6;i++)s+=circle(60+fn(i/6)*490,260,5,C.blue);s+=car(60+fn(p)*440,190);read=k?'Viteza scade: distanțele între marcaje succesive se micșorează.':'Viteza crește: distanțele între marcaje succesive se măresc.';cap='Toate marcajele corespund unor intervale de timp egale.';
 }else if(mode==='inertia'){
 const x=100+(k?p*p:2*p-p*p)*290,delta=Math.sin(Math.PI*p)*v*12*(k?-1:1);
 s=car(x,210)+circle(x+45+delta,130,14,C.gold)+line(x+45+delta,144,x+45,193,C.gold,10)+arrow(x+45,100,x+100,100,C.blue);read=k?'La pornire, corpul tinde să păstreze repausul.':'La frânare, corpul tinde să păstreze mișcarea.';cap='Schemă calitativă a tendinței corpului. Nu reproduce acest comportament într-un vehicul; poartă centura.';
 }else{const x1=60+(mode==='mass'?p*p:p)*170,x2=60+(mode==='mass'?p*p:p)*(mode==='mass'?340/v:v*85);s=line(50,150,590,150)+line(50,280,590,280)+car(x1,100,C.teal)+car(x2,230,C.blue)+text(60,65,mode==='mass'?'A: 2 kg':'A: 2 m/s')+text(60,200,mode==='mass'?`B: ${v} kg`:`B: ${v} m/s`);if(mode==='mass')s+=rect(x2+18,185,48,24+v*3,C.gold);read=mode==='mass'?`Aceeași acțiune, același timp: la ${v} kg, schimbarea vitezei este ${v>2?'mai mică':'egală'} față de corpul de 2 kg.`:`În ${f(t)} s: A parcurge ${f(2*t)} m, B parcurge ${f(v*t)} m.`;cap=mode==='mass'?'Model fără frecare: comparăm schimbarea mișcării produsă de aceeași forță, nu viteze alese independent.':'Mobilele pornesc simultan; distanțele sunt comparate în același interval.';}
 }else if(mode==='balance'){
 const tilt=(v-150)*.12;s=path('M270 290 L320 145 L370 290 Z',C.teal,2,C.teal)+line(140,145-tilt,500,145+tilt,C.ink,7)+line(160,145-tilt,160,240-tilt)+line(480,145+tilt,480,240+tilt)+rect(105,240-tilt,110,12,C.gold)+rect(425,240+tilt,110,12,C.gold)+rect(130,200-tilt,60,40,C.blue)+rect(450,205+tilt,60,35,C.ink)+text(420,95,`${v} g`);read=v===150?'Echilibru: masa corpului este 150 g.':v<150?'Corpul este mai greu decât etaloanele alese.':'Etaloanele alese sunt mai grele decât corpul.';cap='Balanță ideală cu brațe egale. Reglajul de zero este presupus corect.';
 }else if(mode==='density'){
 const rho=k?4:1,sz=160*Math.cbrt(v/20),left=320-sz/2,count=Math.round(v*rho*.3),cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols);s=rect(left,90,sz,sz*.9,C.light)+path(`M${left} 90 l35 -25 h${sz} v${sz*.9} l-35 25 M${left+sz} 90 l35 -25`,C.teal,3);for(let i=0;i<count;i++)s+=circle(left+18+(i%cols)*(sz-30)/cols,110+Math.floor(i/cols)*(sz*.9-30)/rows,4,C.teal);read=`V = ${v} cm³; m = ${rho*v} g; ρ = ${rho} g/cm³.`;cap='Materialele A și B sunt exemple cu densități convenționale de 1 și 4 g/cm³. Punctele codifică masa.';
 }else if(['interaction','force','forces','dynamometer','weight'].includes(mode)){
 if(mode==='weight'){
 const g=k?1.6:10;s=circle(320,280,160,k?'#b3bdc1':'#77aba7')+rect(290,95,60,60,C.gold)+arrow(320,160,320,160+Math.min(100,v*g*2),C.red)+text(80,55,k?'LUNĂ':'PĂMÂNT');read=`m = ${v} kg; g ≈ ${g} N/kg; G ≈ ${f(v*g)} N.`;cap='Comparație folosind valori aproximative ale lui g. Masa corpului rămâne aceeași.';
 }else if(mode==='dynamometer'){
 s=rect(250,45,125,200,'white')+line(310,45,310,75)+path(`M310 75 ${Array.from({length:12},(_,i)=>`L${i%2?325:295} ${80+i*(5+v)}`).join(' ')} L310 ${155+v*11}`,C.teal,3)+rect(285,160+v*11,50,38,C.gold);for(let i=0;i<=5;i++)s+=line(350,80+i*25,375,80+i*25)+text(385,87+i*25,i+' N',17);s+=arrow(335,80+v*25,355,80+v*25,C.red);read=`Indicația dinamometrului: ${v} N; domeniu: 0–5 N.`;cap='Alungirea resortului este asociată unei forțe. Nu depășim limita instrumentului.';
 }else if(mode==='force'){
 s=rect(250,150,100,80,C.gold)+arrow(300,190,300+(k?-1:1)*v*40,190,C.teal)+text(80,80,'Punct de aplicare • direcție • sens • mărime',21);read=`F = ${v} N, orizontal, spre ${k?'stânga':'dreapta'}.`;cap='La aceeași scară de desen, creșterea forței mărește lungimea săgeții.';
 }else{const chosen=mode==='interaction'?k:(k===0?3:k===1?0:1);
 if(chosen===0){s=circle(180+p*260,200,35,C.gold)+arrow(80,200,165,200);read='Mișcarea se schimbă: efect dinamic.';if(mode==='forces'){s+=arrow(240+p*180,260,150+p*180,260,C.red);read='Frecarea se opune alunecării spre dreapta.';}}
 else if(chosen===1){s=rect(270,140+p*20,110+p*20,100-p*35,C.gold)+arrow(320,60,320,130+p*20);if(mode==='forces'){s=path('M100 160 '+Array.from({length:12},(_,i)=>`L${115+i*(12+p*5)} ${i%2?175:145}`).join(' '),C.teal,4)+rect(270+p*55,130,70,70,C.gold)+arrow(270+p*55,230,190+p*55,230,C.red);}read=mode==='forces'?'Forța elastică tinde să readucă resortul la forma inițială.':'Forma se schimbă: efect static.';}
 else if(chosen===2){s=rect(130,150,120,60,C.red)+rect(250,150,120,60,C.blue)+circle(500-p*90,180,24,'#88989c')+arrow(470,230,400,230);read='Magnetul atrage corpul de fier de la distanță.';}
 else{s=circle(320,70+p*150,25,C.gold)+arrow(320,110+p*150,320,170+p*150,C.red);read='Greutatea acționează vertical în jos.';}cap='Este evidențiat numai efectul sau forța studiată; nu toate interacțiunile dintr-o situație reală.';}
 }else if(['equilibrium','thermometer','heat','dilation','water'].includes(mode)){
 if(mode==='equilibrium'){
 const q=k?p:0,hot=v-(v-20)/2*q,cold=20+(v-20)/2*q;s=rect(90,115,150,140,C.red)+rect(400,115,150,140,C.blue)+text(110,195,f(hot)+' °C',30,'white')+text(420,195,f(cold)+' °C',30,'white');if(k)s+=arrow(255,185,385,185,C.gold);read=`Corp A: ${f(hot)} °C; corp B: ${f(cold)} °C.`;cap='Două corpuri identice, izolate de exterior. Fără contact, în acest model, temperaturile nu se schimbă.';
 }else if(mode==='thermometer'){
 s=rect(250,40,45,230,'white')+rect(265,255-v*1.9,15,v*1.9+20,C.red)+circle(272,283,28,C.red);for(let i=0;i<=100;i+=20)s+=line(300,255-i*1.9,320,255-i*1.9)+text(330,262-i*1.9,i+' °C',18);read=`t = ${v} °C; T ≈ ${v+273} K.`;cap='Reprezentare a citirii, nu simulare a timpului necesar stabilizării termometrului.';
 }else if(mode==='dilation'){
 const q=k?1-p:p,w=300+q*v*15;s=rect(110,170,w,50,q>.5?C.red:C.blue)+line(110,235,410,235,C.ink,2,'5 4')+rect(510,145,30,100,C.ink);read=`${k?'Răcire: contracție':'Încălzire: dilatare'}. Modificarea dimensiunii este exagerată.`;cap='Linia punctată marchează lungimea de referință a barei reci.';
 }else if(mode==='water'){
 const vol=k?120+30*p:120+Math.abs(v-4)*(v<4?2:1);s=path('M230 60 V285 H410 V60',C.ink,4)+rect(235,280-vol,170,vol,k&&p>.6?'#c1e1eb':'#82bed6',0)+text(80,65,k?'La înghețare':'Aceeași masă de apă');read=k?'La înghețare volumul crește; gheața plutește pe apa lichidă.':`${v} °C: ${v===4?'volum minim și densitate maximă':v<4?'încălzirea spre 4 °C micșorează volumul':'peste 4 °C, volumul crește la încălzire'}.`;if(k&&p>.6)s+=rect(265,268-vol,110,60,'#d6eff7');cap='Efectul este mărit vizual; nu este o scară numerică a volumului.';
 }else{
 if(k===0){for(let i=0;i<12;i++)s+=rect(70+i*42,160,42,55,i/12<p?C.red:'#abc8d4',0);s+=arrow(90,270,530,270,C.gold);}
 else if(k===1){s=path('M190 65 V275 H450 V65',C.ink,4)+rect(195,100,250,170,'#b2d9e5',0);for(let i=0;i<6;i++){const a=i/6*2*Math.PI+p*2*Math.PI;s+=circle(320+80*Math.cos(a),185+65*Math.sin(a),7,i<3?C.red:C.blue);}s+=arrow(235,220,235,140,C.red)+arrow(405,145,405,225,C.blue);}
 else{s=circle(100,170,45,C.gold)+rect(500,110,50,130,C.blue);for(let i=0;i<5;i++)s+=arrow(170+p*40,105+i*30,450+p*20,105+i*30,C.gold);}
 read=['Conducție: transfer de energie de-a lungul barei.','Convecție: porțiuni de fluid se deplasează.','Radiație: energie transmisă și fără mediu material.'][k];cap='Culorile și săgețile sunt coduri pentru transferul de energie, nu o substanță nouă.';}
 }else if(['magnet','compass','atom','charge'].includes(mode)){
 if(mode==='compass'){
 const a=(k?65:0)*Math.PI/180;s=circle(320,175,115,'white');for(let i=0;i<4;i++){const z=i*Math.PI/2+v*Math.PI/180;s+=text(310+90*Math.sin(z),182-90*Math.cos(z),['N','E','S','V'][i],24);}
 s+=`<g transform="rotate(${k?65:0} 320 175)"><path d="M320 80 L307 175 L333 175 Z" fill="${C.red}"/><path d="M320 270 L307 175 L333 175 Z" fill="${C.blue}"/></g>`+text(70,45,'Nordul din desen ↑',20);read=k?'Magnetul apropiat perturbă orientarea acului.':'Carcasa se rotește; acul rămâne orientat aproximativ nord–sud.';cap='Desenul neglijează diferența locală dintre nordul magnetic și cel geografic.';
 }else if(mode==='atom'){
 s=circle(320,165,65,C.gold)+text(291,174,`${v} +`,28);const neg=v+(k===1?-1:k===2?1:0);for(let i=0;i<neg;i++){const a=i/neg*Math.PI*2;s+=circle(320+125*Math.cos(a),165+112*Math.sin(a),17,C.blue)+text(314+125*Math.cos(a),171+112*Math.sin(a),'−',22,'white');}read=`${v} sarcini pozitive, ${neg} electroni în model; sarcină totală ${k===0?'zero':k===1?'pozitivă':'negativă'}.`;cap='Model de numărare a sarcinilor. Punctele nu sunt electroni pe orbite planetare.';
 }else{
 const repel=mode==='magnet'?k===1:k===1||k===2,delta=(repel?1:-1)*p*40,sep=v*12;
 if(mode==='magnet'){s=rect(125-delta-sep,135,85,65,C.blue)+rect(210-delta-sep,135,85,65,C.red)+text(155-delta-sep,179,'S',25,'white')+text(240-delta-sep,179,'N',25,'white')+rect(365+delta+sep,135,85,65,k?C.red:C.blue)+rect(450+delta+sep,135,85,65,k?C.blue:C.red)+text(392+delta+sep,179,k?'N':'S',25,'white')+text(478+delta+sep,179,k?'S':'N',25,'white');}
 else{s=circle(210-delta-sep,165,50,C.red)+circle(430+delta+sep,165,50,C.blue)+text(198-delta-sep,175,k===2?'−':'+',32,'white')+text(414+delta+sep,175,k===0?'−':k===3?'0':k===1?'+':'−',32,'white');}
 s+=arrow(250,245,repel?180:300,245)+arrow(390,245,repel?460:340,245);read=repel?'Respingere: corpurile tind să se depărteze.':'Atracție: corpurile tind să se apropie.';cap=mode==='magnet'?'Compară numai polii aflați față în față, în spațiul dintre magneți.':'La corpul neutru, redistribuirea sarcinilor poate conduce la atracție.';}
 }else if(['current','circuit','conductor','symbols','series'].includes(mode)){
 const closed=mode==='conductor'?k<2:mode==='series'?true:k===0,parallel=mode==='series'&&k>=2,broken=mode==='series'&&k%2===1;
 if(mode==='series'){
 s=path(parallel?'M100 100 H530 V260 H100 Z M100 180 H530':'M100 100 H530 V260 H100 Z',C.ink,4);s+=lamp(300,100,!broken)+lamp(parallel?300:450,parallel?180:260,parallel||!broken);s+=rect(85,205,30,40,C.light)+line(75,220,125,220,C.red,5)+line(85,237,115,237,C.blue,4);if(broken)s+=rect(410,90,65,20,'#edf4f6',0)+line(410,100,470,72,C.red,4);read=parallel?(broken?'O ramură este întreruptă; celălalt bec rămâne aprins.':'Două ramuri închise; ambele becuri sunt aprinse.'):(broken?'O singură cale întreruptă: ambele becuri se sting.':'O singură cale închisă: ambele becuri sunt aprinse.');
 }else{
 s=path('M110 105 H270 M370 105 H530 V265 H110 V105',C.ink,4)+lamp(530,185,closed)+rect(94,173,32,34,'#edf4f6',0)+line(80,180,140,180,C.red,6)+line(90,202,130,202,C.blue,4);
 if(mode==='conductor')s+=rect(270,85,100,40,k<2?'#a98869':'#a2bdd3')+text(200,65,modes[mode][1][k],22);else s+=line(270,105,370,closed?105:65,C.ink,4)+circle(270,105,5,C.ink)+circle(370,105,5,C.ink);
 if(closed)for(let i=0;i<v;i++){const dist=((i/v+p)%1)*1160;let x,y;if(dist<420){x=110+dist;y=265;}else if(dist<580){x=530;y=265-(dist-420);}else if(dist<1000){x=530-(dist-580);y=105;}else{x=110;y=105+(dist-1000);}s+=circle(x,y,5,C.blue);}
 s+=text(65,310,'Baterie',18)+text(470,310,'Bec',18);
 if(mode==='current')s+=arrow(230,240,150,240,C.red)+text(190,220,'I',19,C.red);
 read=mode==='conductor'?(closed?'Becul se aprinde: materialul conduce în acest model.':'Becul rămâne stins: materialul izolează în acest model.'):(closed?'Circuit închis: becul este aprins.':'Circuit deschis: becul este stins.');if(read.startsWith('Le bec'))read='Becul se aprinde: materialul conduce în acest model.';
 }
 cap=mode==='current'?'Marcajele albastre reprezintă electroni; pe firul de jos se deplasează spre dreapta. Săgeata roșie I este sensul convențional opus.':mode==='series'?'Se studiază traseele închise, fără comparații numerice ale luminozității.':'Montaj didactic alimentat de baterie. Nu reproduce la priză; nu conecta direct bornele bateriei.';
 }else if(mode==='safety'){
 const labels=[['Nu folosi cablul.','Îndepărtează-te de pericol.','Anunță un adult.'],['Nu atinge persoana.','Cheamă imediat un adult.','Solicită ajutor la 112.'],['Părăsește spațiul deschis.','Evită copacii izolați.','Adăpostește-te într-o clădire sigură.']][k];
 const idx=Math.min(2,Math.max(v-1,Math.floor(p*3)));s=rect(80,90,480,160,'white')+circle(145,170,35,C.gold)+text(135,181,String(idx+1),30)+text(200,178,['OPREȘTE-TE','CERE AJUTOR','ALEGE SIGUR'][k],25);read=labels[idx];cap='Nu reproduce situația. Într-un accident electric, nu atinge persoana cât timp poate fi în contact cu sursa.';
 }else if(['light','straightlight','shadow','eclipse','rays'].includes(mode)){
 if(mode==='light'){
 s=circle(85,170,30,C.gold)+rect(300,65,20,220,k===0?'#95c7d1':k===1?'#cad7db':C.ink)+rect(540,70,15,210,C.light);for(let i=0;i<5;i++){const y=115+i*27;s+=line(120,y,300,y,C.gold,3);if(k===0)s+=line(320,y,540,y,C.gold,3);if(k===1)s+=line(320,y,540,y+(i-2)*17,C.gold,2);}read=['Transparent: lumina trece ordonat.','Translucid: lumina trece și este împrăștiată.','Opac: lumina nu trece prin corp.'][k];cap='Reprezentare calitativă. Opac nu înseamnă invizibil: suprafața poate trimite lumină spre ochi.';
 }else if(mode==='straightlight'){
 s=circle(70,170,25,C.gold);for(let i=0;i<3;i++){const x=180+i*140,cy=170+(i===1&&k?45:0);s+=rect(x,70,14,200,C.ink)+rect(x-1,cy-12,16,24,'#edf4f6',0);}s+=arrow(100,170,k?320:600,170,C.gold);read=k?'Placa deplasată blochează raza.':'Orificiile aliniate permit trecerea luminii.';cap='Model pentru un fascicul îngust și orificii mici.';
 }else if(mode==='shadow'){
 const sx=65,ox=v+70,screen=575,h=24,scale=(screen-sx)/(ox-sx),upper=170-h*scale,lower=170+h*scale;
 s=path(`M${sx} 170 L${screen} ${upper} L${screen} ${lower} Z`,C.gold,1,'#fff2ba')+path(`M${ox} 146 L${screen} ${upper} L${screen} ${lower} L${ox} 194 Z`,'none',0,'#a5b8c1')+circle(sx,170,12,C.gold)+line(ox,146,ox,194,C.ink,10)+line(screen,30,screen,310,C.ink,8)+line(sx,170,screen,upper,C.gold,2)+line(sx,170,screen,lower,C.gold,2);read=`Distanță sursă–obiect: ${v} unități; umbra are înălțime relativă ${f(h*2*scale)}.`;cap='Sursă punctiformă idealizată. Numerele sunt unități ale desenului, nu o măsurare în centimetri.';
 }else if(mode==='eclipse'){
 const mid=k?'Pământ':'Lună',last=k?'Lună':'Pământ',r=k?35:20,ly=170-v*.7;
 s=path(`M315 ${170-r} L580 ${170-r*2} L580 ${170+r*2} L315 ${170+r} Z`,'none',0,'#afc0c9')+circle(80,170,50,C.gold)+circle(315,170,r,k?'#4c9697':'#bbc5ca')+circle(530,ly,k?20:40,k?(v<35?'#6e7d87':'#bbc5ca'):'#4c9697')+text(45,270,'Soare')+text(270,270,mid)+text(485,270,last);if(!k&&v<20)s+=circle(514,170,11,'#263b4a');read=v<10?`Aliniere: Soare – ${mid} – ${last}.`:'Corpul se află în afara alinierii centrale; umbra nu îl acoperă la fel.';cap='Schemă fără scară reală, care omite penumbra și geometria exactă a orbitelor.';
 }else{
 const a=v*Math.PI/180,ix=320-Math.sin(a)*210,iy=170-Math.cos(a)*210;
 s=(k?rect(0,170,640,170,'#b6dce9',0):'')+line(45,170,595,170,C.ink,4)+line(320,35,320,315,C.ink,2,'6 5')+arrow(ix,iy,320,170,C.gold);
 if(k){const b=Math.asin(Math.sin(a)/1.33);s+=arrow(320,170,320+Math.sin(b)*185,170+Math.cos(b)*150,C.teal)+text(60,65,'Aer')+text(60,290,'Apă');read='La intrarea oblică în apă, raza se apropie de perpendiculară.';}else{s+=arrow(320,170,320+Math.sin(a)*210,170-Math.cos(a)*210,C.teal)+text(55,285,'Oglindă');read='Reflexie: lumina se întoarce în mediul inițial.';}cap='Linia punctată este normala. Se studiază calitativ direcțiile; unghiurile nu necesită calcule trigonometrice.';
 }
 }
 return {svg:`<svg viewBox="0 0 640 340" role="img" aria-label="${read.replaceAll('"','')}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`,read,cap};
}
window.LessonScenes=Object.freeze({modes,draw});
})();
