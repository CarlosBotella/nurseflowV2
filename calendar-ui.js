import { occurrences, closuresOn, addDays } from './planner-data.js';
import { applyEventColor, eventColor, colorKey, visibleDays, layoutDay } from './calendar-layout.js';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const pretty=day=>new Date(day+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Madrid'});
const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
export function paintCalendar({events,closures,focused,month,colors,onSelect,onEvent}){
 const grid=$('agenda-month');grid.replaceChildren();$('agenda-month-title').textContent=new Date(month+'-01T12:00:00Z').toLocaleDateString('es-ES',{month:'long',year:'numeric'});
 for(const name of ['L','M','X','J','V','S','D'])grid.append(el('span',name,'calendar-weekday'));
 const first=month+'-01',offset=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7,all=events.flatMap(r=>occurrences(r,addDays(first,-offset),addDays(first,41-offset),closures));
 for(let i=0;i<42;i++){
  const day=addDays(first,i-offset),appointments=all.filter(r=>r.date===day).sort((a,b)=>a.start.localeCompare(b.start)),closed=closuresOn(closures,day);
  const button=el('button',undefined,'calendar-day');button.type='button';button.setAttribute('aria-pressed',String(day===focused));button.setAttribute('aria-label',`${pretty(day)}${closed.length?', sin clase: '+closed.map(r=>r.title).join(', '):''}${appointments.length?', '+appointments.map(r=>r.start+' '+r.title).join(', '):', sin eventos'}`);
  button.append(el('span',String(Number(day.slice(8))),'month-day-number'));
  for(const r of appointments.slice(0,2)){const chip=el('span',undefined,'month-event event-color-'+eventColor(r,colors));applyEventColor(chip,r,colors);chip.title=r.start+' '+r.title;chip.append(el('span',r.start+' '+r.title,'month-event-full'));const words=r.title.split(/\s+/).filter(w=>!['de','del','la','las','los','el','y','en','a'].includes(w.toLowerCase()));const short=words.length>1?words.slice(0,2).map(w=>w.slice(0,3)).join(' '):r.title.slice(0,6);chip.append(el('span',short,'month-event-short'));button.append(chip);}
  if(appointments.length>2)button.append(el('span','+'+(appointments.length-2)+' más','month-more'));
  if(closed.length){button.classList.add('closed-day');button.append(el('span','Sin clase','month-closed'));}
  if(day.slice(0,7)!==month)button.classList.add('outside-month');button.addEventListener('click',()=>onSelect(day,true));grid.append(button);
 }
 const landscape=window.matchMedia('(orientation: landscape)').matches,days=visibleDays(focused,landscape);
 $('agenda-range').textContent=(landscape?'Semana':'Tres días')+' · '+pretty(days[0])+' – '+pretty(days.at(-1));
 const legend=$('agenda-legend');legend.replaceChildren();const seen=new Set();for(const row of events){const key=colorKey(row);if(seen.has(key))continue;seen.add(key);legend.append(applyEventColor(el('span',row.title,'calendar-legend-item event-color-'+eventColor(row,colors)),row,colors));}
 const old=$('agenda-timeline').querySelector('.timeline-scroll'),scroll=old?.dataset.initialized==='true'?old.scrollTop:undefined;
 const root=$('agenda-timeline');root.replaceChildren();root.style.setProperty('--visible-days',days.length);
 const head=el('div',undefined,'timeline-head');head.append(el('span','Hora','timeline-hour-heading'));
 for(const day of days){const b=el('button',new Date(day+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',timeZone:'Europe/Madrid'}),'timeline-day-heading'+(day===focused?' selected-column':''));b.type='button';b.setAttribute('aria-pressed',String(day===focused));b.addEventListener('click',()=>onSelect(day));const closed=closuresOn(closures,day);if(closed.length)b.append(el('span','Sin clase','timeline-closed'));head.append(b);}root.append(head);
 const scroller=el('div',undefined,'timeline-scroll');const body=el('div',undefined,'timeline-body');const hours=el('div',undefined,'timeline-hours');for(let h=0;h<24;h++)hours.append(el('span',String(h).padStart(2,'0')+':00'));body.append(hours);
 const rows=events.flatMap(r=>occurrences(r,days[0],days.at(-1),closures));
 for(const day of days){const col=el('div',undefined,'timeline-column'+(day===focused?' selected-column':''));col.setAttribute('aria-label',pretty(day));
  for(const row of layoutDay(rows.filter(r=>r.date===day))){const b=el('button',undefined,'timeline-event event-color-'+eventColor(row,colors));applyEventColor(b,row,colors);b.type='button';b.append(el('strong',row.title),el('span',row.start+'–'+row.end));b.setAttribute('aria-label',`${row.title}, ${pretty(day)}, ${row.start} a ${row.end}`);
   b.style.top=(mins(row.start)*.8)+'px';b.style.height=Math.max(22,(mins(row.end)-mins(row.start))*.8)+'px';b.style.left=`calc(${100*row.lane/row.laneCount}% + 3px)`;b.style.width=`calc(${100/row.laneCount}% - 6px)`;b.addEventListener('click',()=>onEvent(row));col.append(b);
  }body.append(col);
 }scroller.append(body);root.append(scroller);
 scroller.dataset.initialized=String(root.getBoundingClientRect().height>0);
 scroller.scrollTop=scroll??Math.max(0,Math.min(8*48,(rows.length?Math.min(...rows.map(r=>mins(r.start)))*.8:8*48))-16);
 return {days,rows};
}
