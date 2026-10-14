import { CALENDAR_COLORS, COLOR_NAMES, COLOR_VARS, isCalendarColor } from './calendar-layout.js';

/** Local, keyboard-accessible palette. The hidden value stays outside this container. */
export function renderColorPicker(container,value,onChange){
 const selected=isCalendarColor(value)?value:'blue';
 container.replaceChildren();
 for(const color of CALENDAR_COLORS){
  const button=document.createElement('button');button.type='button';
  button.className='color-swatch';button.dataset.color=color;
  button.style.setProperty('--swatch-color',`var(${COLOR_VARS[color]})`);
  button.setAttribute('aria-label',COLOR_NAMES[color]);button.title=COLOR_NAMES[color];
  button.setAttribute('aria-pressed',String(selected===color));
  button.textContent=selected===color?'✓':'';
  button.addEventListener('click',()=>onChange(color));container.append(button);
 }
 const label=document.createElement('label');label.className='color-custom';
 const input=document.createElement('input');input.type='color';input.id='plan-custom-color';
 input.value=selected.startsWith('#')?selected:'#007aff';input.setAttribute('aria-label','Elegir color personalizado');
 const preview=document.createElement('span');preview.className='custom-color-preview';preview.textContent=selected.startsWith('#')?'✓':'+';
 if(selected.startsWith('#')){label.classList.add('selected');preview.style.backgroundColor=selected;}
 const text=document.createElement('span');text.textContent='Personalizado';
 label.append(input,preview,text);container.append(label);
 // Keep the native picker open while dragging; repaint only once the user confirms.
 input.addEventListener('input',()=>{preview.style.backgroundColor=input.value;});
 input.addEventListener('change',()=>onChange(input.value.toLowerCase()));
}
