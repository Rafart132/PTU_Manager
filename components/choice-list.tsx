'use client';

import {AlertCircle,BookOpen,Pencil,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {byId,skillLabel,translatedReq,type Trainer,type Pick} from '@/lib/ptu';
import {choiceChecks} from '@/lib/choices';

export function ChoiceList({trainer,onEdit,onRemove,onSource,compact=false,filterId}:{
  trainer:Trainer;onEdit:(p:Pick)=>void;onRemove:(p:Pick)=>void;onSource:(page:number)=>void;compact?:boolean;filterId?:string;
}) {
  const picks=trainer.picks.filter(p=>!filterId||p.id===filterId);
  if(filterId&&!picks.length)return null;
  if(!picks.length)return <div className="empty">Tus clases, ventajas y rasgos aparecerán aquí. Podrás editarlos o quitarlos cuando quieras.</div>;
  return <div className={'choice-list '+(compact?'compact':'')}>{picks.map(p=>{
    const e=byId(p.id);
    const errors=[...new Set(choiceChecks(trainer,p).filter(c=>!c.ok).map(c=>c.text))];
    return <article className={'selected-card '+(errors.length?'needs-review':'')} key={p.uid}>
      <div className="section-title">
        <div><h3>{e.label}{p.branch?' · '+skillLabel(p.branch):''}</h3><small>{e.kind==='class'?'Clase':e.kind==='edge'?'Ventaja':e.kind==='reference'?'Técnica':'Rasgo'} · {p.source==='feature'?'Presupuesto de rasgos':p.source==='edge'?'Presupuesto de ventajas':p.source==='general'?'Hito de nivel':'Concedido'} · {e.name}</small></div>
        <div className="choice-actions">
          <Button variant="outline" size="sm" aria-label={'Editar '+e.label} onClick={()=>onEdit(p)}><Pencil size={15}/>Editar</Button>
          <Button variant="outline" size="sm" className="remove-choice" aria-label={'Quitar '+e.label} onClick={()=>onRemove(p)}><Trash2 size={15}/>Quitar</Button>
        </div>
      </div>
      {Object.entries(p.config).map(([key,value])=><span className="config-chip" key={key}>{skillLabel(value)}</span>)}
      {errors.length>0&&<div className="choice-warning"><strong><AlertCircle size={15}/>Revisar esta elección</strong><ul>{errors.map(s=><li key={s}>{s}</li>)}</ul></div>}
      {!compact&&<><p>{e.summary}</p><details><summary>Requisitos y efecto completo</summary><p>{translatedReq(e.requirements)}</p><p className="hint">{e.usage}</p><p className="original-text">{e.effect}</p></details><Button variant="ghost" size="sm" onClick={()=>onSource(e.page)}><BookOpen size={14}/>Core · p. {e.page}</Button></>}
    </article>;
  })}</div>;
}
