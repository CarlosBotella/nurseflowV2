/** Apple Calendar-inspired color palette (CSS variable names) */
export const CALENDAR_COLORS=['blue','purple','teal','orange','pink','green','indigo','red'];
export const COLORS=CALENDAR_COLORS;
export const COLOR_NAMES={blue:'Azul',purple:'Morado',teal:'Turquesa',orange:'Naranja',pink:'Rosa',green:'Verde',indigo:'Índigo',red:'Rojo'};
export function isCalendarColor(value){return CALENDAR_COLORS.includes(value)||typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);}
export const COLOR_VARS={blue:'--cal-blue',purple:'--cal-purple',teal:'--cal-teal',orange:'--cal-orange',pink:'--cal-pink',green:'--cal-green',indigo:'--cal-indigo',red:'--cal-red'};
export function colorKey(event){return event.subjectId||event.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
export function eventColor(event,preferences={}){const key=colorKey(event);if(isCalendarColor(preferences[key]))return preferences[key];let hash=0;for(const letter of key)hash=(hash*31+letter.charCodeAt(0))>>>0;return CALENDAR_COLORS[hash%CALENDAR_COLORS.length];}
export function applyEventColor(node,event,preferences={}){const color=eventColor(event,preferences);if(color.startsWith('#')){node.classList.add('event-color-custom');node.style.setProperty('--event-line',color);node.style.setProperty('--event-fg',color);node.style.setProperty('--event-bg',`color-mix(in srgb, ${color} 15%, var(--surface))`);}return node;}
export function visibleDays(selected,landscape){const date=new Date(selected+'T12:00:00Z'),offset=landscape?(date.getUTCDay()+6)%7:1;date.setUTCDate(date.getUTCDate()-offset);return Array.from({length:landscape?7:3},(_,i)=>{const d=new Date(date);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});}
const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
/** Assign lanes within each connected overlap group; adjacent appointments share a lane. */
export function layoutDay(events){const ordered=events.slice().sort((a,b)=>mins(a.start)-mins(b.start)||mins(b.end)-mins(a.end));const out=[];let cluster=[],ends=[],clusterEnd=-1;
 const flush=()=>{for(const event of cluster)out.push({...event,laneCount:ends.length});cluster=[];ends=[];};
 for(const row of ordered){const start=mins(row.start),end=mins(row.end);if(start>=clusterEnd){flush();clusterEnd=-1;}let lane=ends.findIndex(e=>e<=start);if(lane<0)lane=ends.length;ends[lane]=end;cluster.push({...row,lane});clusterEnd=Math.max(clusterEnd,end);}flush();return out;
}
