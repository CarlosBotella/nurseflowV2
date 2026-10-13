const txt = (value, max = 500) => { if (typeof value !== 'string' || value.length > max) throw new Error('Texto de agenda inválido.'); return value.trim(); };
export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || !Number.isFinite(Date.parse(value)) || new Date(value + 'T12:00:00Z').toISOString().slice(0,10) !== value) throw new Error('Fecha inválida.');
  return value;
}
export function minutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) throw new Error('Hora inválida.');
  return Number(time.slice(0,2)) * 60 + Number(time.slice(3));
}
export function validPlanner(value) {
  const row = { id:txt(value.id,150),type:value.type };
  if (!row.id) throw new Error('Identificador vacío.');
  if(value.type==='closure'){
    const title=txt(value.title),startDate=validDay(value.startDate),endDate=validDay(value.endDate||value.startDate);
    if(!title||endDate<startDate||(Date.parse(endDate)-Date.parse(startDate))/86400000>550)throw new Error('Periodo sin clase inválido.');
    const source=txt(value.source||'',2000);if(source){const url=new URL(source);if(url.protocol!=='https:')throw new Error('La fuente debe ser un enlace HTTPS.');}
    return {...row,title,startDate,endDate,source,kind:value.kind==='holiday'?'holiday':'academic',locality:txt(value.locality||'Valencia',100),active:value.active!==false,customized:Boolean(value.customized)};
  }
  if (value.type === 'enrollment') {
    if (!/^\d{4}-\d{4}$/.test(value.year || '') || Number(value.year.slice(5)) !== Number(value.year.slice(0,4))+1) throw new Error('Curso académico inválido.');
    return {...row,year:value.year,subjectId:txt(value.subjectId,60),title:txt(value.title),repeated:Boolean(value.repeated)};
  }
  if (['event','rotation'].includes(value.type)) {
    const startDate=validDay(value.startDate),endDate=validDay(value.endDate || value.startDate);
    if (endDate<startDate || (Date.parse(endDate)-Date.parse(startDate))/86400000>550) throw new Error('El periodo debe durar como máximo 550 días y finalizar después de empezar.');
    const start=minutes(value.start),end=minutes(value.end);
    if (end<=start) throw new Error('La hora final debe ser posterior a la inicial (eventos del mismo día).');
    if (!Array.isArray(value.weekdays) || !value.weekdays.length || value.weekdays.some(day=>!Number.isInteger(day)||day<0||day>6)) throw new Error('Selecciona los días de la semana.');
    const excluded=(value.excluded||[]).map(validDay);if(excluded.length>200)throw new Error('Demasiadas excepciones.');
    const title=txt(value.title);if(!title)throw new Error('El nombre es obligatorio.');
    return {...row,title,startDate,endDate,start:value.start,end:value.end,weekdays:[...new Set(value.weekdays)],excluded:[...new Set(excluded)],confirmed:Boolean(value.confirmed),archived:Boolean(value.archived),category:txt(value.category||'Otro',50),subjectId:txt(value.subjectId||'',60),place:txt(value.place||''),tutor:txt(value.tutor||''),ignoreClosures:Boolean(value.ignoreClosures)};
  }
  if (value.type==='day') {
    const actual=Number(value.actualMinutes);if(!Number.isFinite(actual)||actual<0||actual>1440)throw new Error('Horas realizadas inválidas.');
    return {...row,eventId:txt(value.eventId,150),date:validDay(value.date),actualMinutes:actual,registered:Boolean(value.registered),note:txt(value.note||'',10000)};
  }
  if(value.type==='task'){const title=txt(value.title);if(!title)throw new Error('El pendiente necesita un nombre.');return {...row,title,eventId:txt(value.eventId||'',150),due:value.due?validDay(value.due):'',done:Boolean(value.done)};}
  throw new Error('Registro de agenda no reconocido.');
}
export function addDays(value, delta) { const date=new Date(validDay(value)+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+delta);return date.toISOString().slice(0,10); }
export function closuresOn(closures, day){return closures.filter(row=>row.active!==false&&row.startDate<=day&&row.endDate>=day);}
export function occurrences(event, from=event.startDate, to=event.endDate, closures=[]) {
  const rows=[];let day=from>event.startDate?from:event.startDate;const last=to<event.endDate?to:event.endDate;
  for(let count=0;day<=last && count<551;count++,day=addDays(day,1))if(event.weekdays.includes(new Date(day+'T12:00:00Z').getUTCDay())&&!event.excluded.includes(day)&&!(event.category==='Clase'&&!event.ignoreClosures&&closuresOn(closures,day).length))rows.push({...event,date:day});
  return rows;
}
export function conflicts(events, from, to, closures=[]) {
  const rows=events.flatMap(event=>occurrences(event,from,to,closures));const ids=new Set();
  rows.forEach((a,i)=>rows.slice(i+1).forEach(b=>{if(a.date===b.date&&minutes(a.start)<minutes(b.end)&&minutes(b.start)<minutes(a.end)){ids.add(a.id);ids.add(b.id);}}));return ids;
}
function utcTime(day,time) {
  const naive=Date.parse(day+'T'+time+':00Z');let value=naive;
  for(let i=0;i<2;i++){
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    const local=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);value+=naive-local;
  }
  return new Date(value).toISOString().replace(/[-:]/g,'').replace('.000','');
}
export function calendarFile(events, closures=[]) {
  const escape=value=>String(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Turno//Agenda personal//ES'];
  for(const event of events)for(const row of occurrences(event,undefined,undefined,closures))lines.push('BEGIN:VEVENT',`UID:${escape(event.id)}-${row.date}@turno.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${utcTime(row.date,event.start)}`,`DTEND:${utcTime(row.date,event.end)}`,`SUMMARY:${escape(event.title+(event.confirmed?'':' (provisional)'))}`,`LOCATION:${escape(event.place)}`,'END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.map(line=>{let out='',chunk='',size=0;for(const character of line){const n=new TextEncoder().encode(character).length;if(size+n>73){out+=chunk+'\r\n ';chunk='';size=1;}chunk+=character;size+=n;}return out+chunk;}).join('\r\n')+'\r\n';
}
