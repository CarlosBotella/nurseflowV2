import * as db from './db.js';
import { validPlanner } from './planner-data.js';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function initHolidays({onChange,announce}){
 function render(rows){const list=$('holiday-list');list.replaceChildren();
  for(const row of rows.filter(row=>row.type==='closure').sort((a,b)=>a.startDate.localeCompare(b.startDate))){const item=el('div',undefined,'subject-row');const label=el('label',undefined,'confirmation-choice');const input=document.createElement('input');input.type='checkbox';input.checked=row.active;
   input.addEventListener('change',async()=>{input.disabled=true;try{await db.savePlanner({...row,active:input.checked,customized:true});await onChange();}catch(error){announce(error.message);input.checked=row.active;}finally{input.disabled=false;}});
   label.append(input,el('span',`${row.startDate}${row.endDate!==row.startDate?' → '+row.endDate:''} · ${row.title}`));item.append(label);
   const p=el('p',row.kind==='holiday'?'Festivo · '+row.locality:'Día sin clase añadido por ti','field-help');item.append(p);
   if(row.source){const a=el('a','Consultar fuente ↗');a.href=row.source;a.target='_blank';a.rel='noopener noreferrer';item.append(a);}list.append(item);
  }
 }
 $('holiday-form').addEventListener('submit',async event=>{event.preventDefault();const submit=$('holiday-form').querySelector('button');if(submit.disabled)return;submit.disabled=true;
  try{const row=validPlanner({id:'closure-'+crypto.randomUUID(),type:'closure',title:$('holiday-title').value,startDate:$('holiday-from').value,endDate:$('holiday-to').value||$('holiday-from').value,kind:'academic',locality:'Valencia',source:$('holiday-source').value,active:true,customized:true});await db.savePlanner(row);$('holiday-form').reset();await onChange();$('holiday-status').textContent='Días sin clase guardados. No modifican prácticas, NurseFlowV2s ni asistencia.';}catch(error){$('holiday-status').textContent=error.message;}finally{submit.disabled=false;}
 });
 async function ensure(){try{const response=await fetch('./holidays-valencia.json');if(!response.ok)throw new Error('No se pudo cargar el calendario oficial.');const data=await response.json();if(data.locality!=='Valencia'||!Array.isArray(data.holidays)||data.holidays.length!==28)throw new Error('Calendario oficial no reconocido.');await db.seedPlanner(data.holidays);}catch(error){$('holiday-status').textContent=error.message+' Los periodos guardados se conservan.';}}
 return {render,ensure};
}
