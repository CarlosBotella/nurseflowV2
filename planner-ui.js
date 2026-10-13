import * as db from './db.js';
import { SUBJECTS, UCV_SOURCE, CATALOG_DATE } from './ucv-catalog.js';
import { validPlanner, occurrences, addDays, conflicts, calendarFile, minutes, closuresOn } from './planner-data.js';
import { initHolidays } from './holidays-ui.js';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;};
const pretty=day=>new Date(day+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Madrid'});
export function initPlanner({announce}) {
  let rows=[],focused=today(),month=focused.slice(0,7),generation=0,dirty=false;
  const dayDrafts=new Map();
  window.addEventListener('beforeunload',event=>{if(dirty||dayDrafts.size){event.preventDefault();event.returnValue='';}});
  const run=task=>Promise.resolve().then(task).catch(error=>announce(error.message));
  const button=(label,callback,cls='secondary')=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',()=>run(callback));return b;};
  const events=()=>rows.filter(row=>['event','rotation'].includes(row.type)&&!row.archived);
  const closures=()=>rows.filter(row=>row.type==='closure');
  const holidayUI=initHolidays({onChange:()=>refresh(),announce});
  const enrollments=()=>rows.filter(row=>row.type==='enrollment'&&row.year===$('study-year').value);
  async function refresh(){const version=++generation;const data=await db.listPlanner();if(version!==generation)return;rows=data;paintStudies();paintAgenda();paintRotations();paintTasks();holidayUI.render(rows);}
  async function put(row){await db.savePlanner(row);await refresh();}
  function paintStudies(){
    const list=$('study-subjects');list.replaceChildren();
    for(const subject of SUBJECTS.filter(row=>row.plan===$('study-plan').value&&row.course===Number($('study-course').value))){
      const saved=enrollments().find(row=>row.subjectId===subject.id);const item=el('div',undefined,'subject-row');
      const label=el('label',undefined,'confirmation-choice');const input=document.createElement('input');input.type='checkbox';input.checked=Boolean(saved);
      input.addEventListener('change',()=>run(async()=>{if(input.checked)await put({id:`enroll-${$('study-year').value}-${subject.id}`,type:'enrollment',year:$('study-year').value,subjectId:subject.id,title:subject.title,repeated:false});else{await db.deletePlanner(saved.id);await refresh();}}));
      label.append(input,el('span',`${subject.title} · ${subject.ects} ECTS`));item.append(label);list.append(item);
    }
    const selected=$('study-enrolled');selected.replaceChildren();
    if(!enrollments().length)selected.append(el('p','Marca solo las asignaturas que tienes matriculadas. Puedes recorrer varios cursos y planes.','muted'));
    for(const row of enrollments()){
      const item=el('div',undefined,'subject-row');item.append(el('strong',row.title));
      const label=el('label',undefined,'confirmation-choice');const input=document.createElement('input');input.type='checkbox';input.checked=row.repeated;
      input.addEventListener('change',()=>run(()=>put({...row,repeated:input.checked})));label.append(input,el('span','La estoy repitiendo'));item.append(label,button('Quitar de mi matrícula',async()=>{await db.deletePlanner(row.id);await refresh();},'quiet'));selected.append(item);
    }
    const source=$('study-source');source.href=UCV_SOURCE;source.textContent=`Catálogo oficial UCV · consultado ${CATALOG_DATE} ↗`;
  }
  function subjectOptions(){const select=$('plan-subject');select.replaceChildren(new Option('Sin asignatura asociada',''));
    for(const row of enrollments())select.append(new Option(`${row.title}${row.repeated?' · repetición':''}`,row.subjectId));
    for(const row of SUBJECTS.filter(row=>row.plan===$('study-plan').value&&row.kind==='PE'&&!enrollments().some(e=>e.subjectId===row.id)))select.append(new Option(row.title,row.id));
  }
  function openEvent(row=null,rotation=false){
    if(dirty&&!confirm('¿Descartar los cambios del formulario de agenda?'))return;
    $('plan-form').reset();subjectOptions();$('plan-id').value=row?.id||'';
    $('plan-kind').value=row?.type==='rotation'||rotation?'rotation':row?.category||'Clase';
    $('plan-title').value=row?.title||(rotation?'Practicum I':'');$('plan-subject').value=row?.subjectId||'';
    $('plan-start-date').value=row?.startDate||focused;$('plan-end-date').value=row?.endDate||focused;
    $('plan-start').value=row?.start||(rotation?'15:00':'09:00');$('plan-end').value=row?.end||(rotation?'22:00':'10:00');
    $('plan-place').value=row?.place||'';$('plan-tutor').value=row?.tutor||'';$('plan-repeat').checked=rotation||Boolean(row&&row.endDate!==row.startDate);
    document.querySelectorAll('[name="plan-weekday"]').forEach(input=>{input.checked=(row?.weekdays||[1,2,3,4,5]).includes(Number(input.value));});
    $('plan-excluded').value=(row?.excluded||[]).join(', ');$('plan-confirmed').checked=Boolean(row?.confirmed);
    $('plan-ignore-closures').checked=Boolean(row?.ignoreClosures);
    $('plan-status').textContent='';$('plan-form').hidden=false;dirty=false;location.hash='agenda';$('plan-title').focus();
  }
  function paintAgenda(){
    const grid=$('agenda-month');grid.replaceChildren();
    $('agenda-month-title').textContent=new Date(month+'-01T12:00:00Z').toLocaleDateString('es-ES',{month:'long',year:'numeric',timeZone:'Europe/Madrid'});
    for(const name of ['L','M','X','J','V','S','D'])grid.append(el('span',name,'calendar-weekday'));
    const first=month+'-01',offset=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;
    const all=events().flatMap(row=>occurrences(row,addDays(first,-offset),addDays(first,41-offset),closures()));
    for(let i=0;i<42;i++){const day=addDays(first,i-offset);const count=all.filter(row=>row.date===day).length;
      const closed=closuresOn(closures(),day);const b=button(`${Number(day.slice(8))}${count?' ·':''}`,()=>{focused=day;paintAgenda();},'calendar-day');b.setAttribute('aria-label',`${pretty(day)}${closed.length?', sin clase: '+closed.map(r=>r.title).join(', '):''}${count?`, ${count} eventos`:''}`);b.setAttribute('aria-pressed',String(day===focused));if(closed.length)b.classList.add('closed-day');if(day.slice(0,7)!==month)b.classList.add('outside-month');grid.append(b);
    }
    const list=$('agenda-days');list.replaceChildren();const collision=conflicts(events(),focused,addDays(focused,6),closures());
    const upcoming=events().flatMap(row=>occurrences(row,focused,addDays(focused,6),closures())).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
    $('agenda-range').textContent=`Desde ${pretty(focused)} · próximos 7 días`;
    for(let i=0;i<7;i++){const day=addDays(focused,i),closed=closuresOn(closures(),day);if(closed.length)list.append(el('p',`${pretty(day)} · ${closed.map(r=>r.title).join(' · ')} · Sin clase. Los turnos y prácticas se mantienen.`, 'privacy-note'));}
    if(focused.slice(0,4)<'2026'||addDays(focused,6).slice(0,4)>'2027')list.append(el('p','Los festivos oficiales precargados cubren Valencia 2026 y 2027. Para otros años o localidades, añade los días comprobados en Festivos y días sin clase.','privacy-note'));
    if(!upcoming.length)list.append(el('p','No hay eventos previstos en estos días. Añade clases, prácticas, turnos o entregas.','empty'));
    for(const row of upcoming){const item=el('article',undefined,'list-item');item.append(el('h3',row.title),el('p',`${pretty(row.date)} · ${row.start}–${row.end} · ${row.confirmed?'Horario confirmado por ti':'Provisional: revisa días y fechas'}`),el('p',row.place||row.category));
      if(collision.has(row.id))item.append(el('p','Hay otro evento que se solapa en este intervalo de 7 días.','privacy-note'));
      item.append(button('Editar horario',()=>openEvent(row)),button('Archivar',async()=>{if(confirm('¿Archivar este horario? Las anotaciones de asistencia se conservan.'))await put({...row,archived:true});},'quiet'));
      if(row.type==='rotation'){
        const saved=rows.find(day=>day.type==='day'&&day.eventId===row.id&&day.date===row.date);
        const key=`day-${row.id}-${row.date}`,draft=dayDrafts.get(key);
        const form=el('form',undefined,'day-log');const hours=document.createElement('input');hours.type='number';hours.min='0';hours.max='24';hours.step='.25';hours.value=draft?.hours??(saved?String(saved.actualMinutes/60):'');hours.required=true;
        const hlabel=el('label','Horas realmente realizadas');hlabel.append(hours);
        const registered=document.createElement('input');registered.type='checkbox';registered.checked=draft?.registered??Boolean(saved?.registered);const rlabel=el('label',undefined,'confirmation-choice');rlabel.append(registered,el('span','Ya lo he registrado en UCV Evalúa'));
        const note=document.createElement('textarea');note.rows=2;note.maxLength=10000;note.value=draft?.note??(saved?.note||'');note.placeholder='Aprendizaje breve, sin datos de pacientes';const nlabel=el('label','Diario de prácticas · opcional');nlabel.append(note);
        const submit=el('button','Guardar jornada','secondary');submit.type='submit';form.append(hlabel,rlabel,nlabel,submit);
        if(row.date>today()){form.hidden=true;item.append(el('p','Jornada prevista: no cuenta como asistencia realizada.','fine-print'));}
        form.addEventListener('submit',event=>{event.preventDefault();if(submit.disabled)return;submit.disabled=true;run(async()=>{try{await db.savePlanner({id:key,type:'day',eventId:row.id,date:row.date,actualMinutes:Number(hours.value)*60,registered:registered.checked,note:note.value});dayDrafts.delete(key);await refresh();announce('Jornada guardada localmente. El registro oficial se realiza en UCV Evalúa.');}finally{submit.disabled=false;}});});
        form.addEventListener('input',()=>{dayDrafts.set(key,{hours:hours.value,registered:registered.checked,note:note.value});});item.append(form);
      }list.append(item);
    }
  }
  function paintRotations(){const list=$('study-rotations');list.replaceChildren();
    for(const row of rows.filter(r=>r.type==='rotation')){const logs=rows.filter(r=>r.type==='day'&&r.eventId===row.id);const planned=occurrences(row).length*(minutes(row.end)-minutes(row.start))/60;const actual=logs.reduce((sum,r)=>sum+r.actualMinutes,0)/60;const item=el('article',undefined,'list-item');
      item.append(el('h3',row.title+(row.archived?' · Archivada':'')),el('p',`${row.startDate} → ${row.endDate} · ${row.start}–${row.end}`),el('p',`${planned} h previstas · ${actual} h anotadas como realizadas · ${logs.filter(r=>r.registered).length} jornadas marcadas como registradas`),el('p',[row.place,row.tutor].filter(Boolean).join(' · ')));
      item.append(button('Ver en agenda',()=>{focused=row.startDate;month=focused.slice(0,7);location.hash='agenda';paintAgenda();}),button(row.archived?'Restaurar horario':'Editar rotación',()=>row.archived?put({...row,archived:false}):openEvent(row)));
      if(logs.length){const details=el('details');details.append(el('summary','Diario y jornadas guardadas'));for(const log of logs.sort((a,b)=>a.date.localeCompare(b.date)))details.append(el('p',`${log.date} · ${log.actualMinutes/60} h · ${log.registered?'Marcado como registrado':'Registro oficial pendiente'}${log.note?' · '+log.note:''}`));item.append(details);}list.append(item);
    }
    if(!list.children.length)list.append(el('p','Añade la rotación que te hayan asignado. Los periodos y los festivos se revisan contigo.','muted'));
  }
  function paintTasks(){const list=$('study-tasks');list.replaceChildren();for(const row of rows.filter(r=>r.type==='task').sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'))){const item=el('div',undefined,'task-row');const label=el('label',undefined,'confirmation-choice');const input=document.createElement('input');input.type='checkbox';input.checked=row.done;input.addEventListener('change',()=>run(()=>put({...row,done:input.checked})));label.append(input,el('span',`${row.title}${row.due?' · '+row.due:''}`));item.append(label,button('Quitar',async()=>{await db.deletePlanner(row.id);await refresh();},'quiet'));list.append(item);} }
  for(const id of ['study-year','study-plan','study-course'])$(id).addEventListener('change',()=>run(async()=>{await db.setSetting('study-filters',{year:$('study-year').value,plan:$('study-plan').value,course:$('study-course').value});paintStudies();}));
  $('plan-subject').addEventListener('change',()=>{const row=SUBJECTS.find(row=>row.id===$('plan-subject').value);if(row){$('plan-title').value=row.title;dirty=true;}});
  $('plan-kind').addEventListener('change',()=>{if($('plan-kind').value==='rotation'){$('plan-start').value='15:00';$('plan-end').value='22:00';$('plan-repeat').checked=true;} });
  $('plan-form').addEventListener('input',()=>{dirty=true;});
  $('plan-form').addEventListener('submit',event=>{event.preventDefault();const submit=$('plan-form').querySelector('[type="submit"]');if(submit.disabled)return;submit.disabled=true;run(async()=>{try{
    const rotation=$('plan-kind').value==='rotation',repeat=$('plan-repeat').checked;
    const startDate=$('plan-start-date').value;const value=validPlanner({id:$('plan-id').value||crypto.randomUUID(),type:rotation?'rotation':'event',category:rotation?'Prácticas':$('plan-kind').value,title:$('plan-title').value,subjectId:$('plan-subject').value,startDate,endDate:repeat?$('plan-end-date').value:startDate,start:$('plan-start').value,end:$('plan-end').value,weekdays:repeat?[...document.querySelectorAll('[name="plan-weekday"]:checked')].map(input=>Number(input.value)):[new Date(startDate+'T12:00:00Z').getUTCDay()],excluded:$('plan-excluded').value.split(',').map(s=>s.trim()).filter(Boolean),confirmed:$('plan-confirmed').checked,place:$('plan-place').value,tutor:$('plan-tutor').value,ignoreClosures:$('plan-ignore-closures').checked});
    if(!occurrences(value).length)throw new Error('Ese periodo no contiene jornadas con los días seleccionados.');
    await put(value);dirty=false;$('plan-form').hidden=true;focused=startDate;month=startDate.slice(0,7);paintAgenda();announce('Horario guardado. Las jornadas previstas no cuentan como realizadas.');
  }catch(error){$('plan-status').textContent=error.message;throw error;}finally{submit.disabled=false;}});});
  $('plan-cancel').addEventListener('click',()=>{if(!dirty||confirm('¿Descartar cambios en este formulario?')){$('plan-form').hidden=true;dirty=false;}});
  $('plan-new').addEventListener('click',()=>openEvent());$('rotation-new').addEventListener('click',()=>openEvent(null,true));
  $('agenda-today').addEventListener('click',()=>{focused=today();month=focused.slice(0,7);paintAgenda();});
  for(const [id,delta] of [['agenda-prev',-1],['agenda-next',1]])$(id).addEventListener('click',()=>{const date=new Date(month+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+delta);month=date.toISOString().slice(0,7);paintAgenda();});
  $('task-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{await put({id:crypto.randomUUID(),type:'task',title:$('task-title').value,due:$('task-due').value,done:false});$('task-form').reset();});});
  $('task-preset').addEventListener('click',()=>run(async()=>{for(const title of ['Comprobar NUSS','Comprobar certificado electrónico','Superar capacitación UCV','Firmar anexos en UCV Evalúa','Entregar certificado solicitado','Confirmar acogida en el centro','Anotar tutoría de seguimiento','Preparar memoria'])if(!rows.some(row=>row.type==='task'&&row.title===title))await db.savePlanner({id:crypto.randomUUID(),type:'task',title,due:'',done:false});await refresh();}));
  $('agenda-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([calendarFile(events(),closures())],{type:'text/calendar;charset=utf-8'}));const a=el('a');a.href=url;a.download='NurseFlowV2-agenda.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
  const restore=async()=>{const settings=await db.getSetting('study-filters');if(settings?.value){for(const [id,key]of [['study-year','year'],['study-plan','plan'],['study-course','course']])if([...$(id).options].some(option=>option.value===settings.value[key]))$(id).value=settings.value[key];}await refresh();};
  run(async()=>{await holidayUI.ensure();await restore();});
  return {refresh:restore};
}
