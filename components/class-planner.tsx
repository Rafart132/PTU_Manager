'use client';

import {useMemo,useState} from 'react';
import {Check,Compass,Info,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {catalog,clean,stats,statLabels,types,typeLabels,type Trainer,type Entry} from '@/lib/ptu';
import {classReadiness} from '@/lib/choices';

const branchLabel=(s:string)=>types.includes(s)?typeLabels[types.indexOf(s)]:stats.includes(s)?statLabels[stats.indexOf(s)]:s;
const labels={ready:'Requisitos cumplidos',near:'A un requisito',context:'Por confirmar',later:'Otros requisitos',owned:'Ya en tu ficha'};

export function ClassPlanner({trainer,onInspect,onExplore}:{trainer:Trainer;onInspect:(e:Entry,branch?:string)=>void;onExplore:(name:string)=>void}) {
  const [filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const entries=useMemo(()=>catalog.filter(e=>e.kind==='class').map(e=>classReadiness(trainer,e)),[trainer]);
  const counts=(status:string)=>entries.filter(e=>status==='owned'?e.inSheet:e.status===status).length;
  const shown=entries.filter(x=>(filter==='all'||(filter==='owned'?x.inSheet:x.status===filter))&&clean(x.entry.name+' '+x.entry.label).includes(clean(query)))
    .sort((a,b)=>['ready','near','context','later','owned'].indexOf(a.status)-['ready','near','context','later','owned'].indexOf(b.status));
  return <section className="planner">
    <div className="section-title"><div><p className="eyebrow">TU SIGUIENTE CLASE</p><h2>¿Qué puedes elegir ahora?</h2></div><span className="counter">Tu nivel real: {trainer.level}</span></div>
    <p className="hint">Comparamos con tus habilidades y elecciones actuales. Al añadir se comprueban también los cupos, especializaciones y configuraciones.</p>
    <Tabs value={filter} onValueChange={setFilter}>
      <TabsList className="planner-filters" aria-label="Filtrar clases por requisitos">
        <TabsTrigger value="all">Todas</TabsTrigger>
        <TabsTrigger value="ready">Requisitos cumplidos · {counts('ready')}</TabsTrigger>
        <TabsTrigger value="near">A un requisito · {counts('near')}</TabsTrigger>
        <TabsTrigger value="context">Por confirmar · {counts('context')}</TabsTrigger>
        <TabsTrigger value="owned">Mis clases · {counts('owned')}</TabsTrigger>
      </TabsList>
    </Tabs>
    <div className="search-wrap planner-search"><Search size={18}/><Input aria-label="Buscar clases en el planificador" placeholder="Buscar una clase…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="option-grid future-options">{shown.map(x=><article key={x.entry.id} className={'option-card class-card planner-card '+x.status}>
      <div className="option-top"><span className="kind-label">CLASE</span><span className={'status '+(x.status==='ready'?'ready':'locked')}>{x.status==='ready'&&<Check size={14}/>} {labels[x.status]}</span></div>
      <h3>{x.entry.label}</h3><span className="original-name">{x.entry.name}</span>
      {x.inSheet&&!x.owned&&<span className="owned-label"><Check size={14}/>Ya en tu ficha · otras especializaciones disponibles</span>}
      <p className="option-summary">{x.entry.summary}</p>
      {x.branch&&<p className="hint">Ejemplo de especialización: <strong>{branchLabel(x.branch)}</strong>. Puedes elegir otra al abrir la clase.</p>}
      {!x.owned&&x.missing.length>0&&<div className="planner-requirements"><strong>{x.status==='near'?'Te falta:':'Requisitos pendientes:'}</strong><ul>{x.missing.map(c=><li key={c.text}>{c.text}</li>)}</ul></div>}
      {!x.owned&&x.context.length>0&&<div className="planner-requirements context"><strong><Info size={14}/> Confirma con tu mesa:</strong><ul>{x.context.map(c=><li key={c.text}>{c.text}</li>)}</ul></div>}
      <div className="choice-actions"><Button variant="outline" size="sm" onClick={()=>onExplore(x.entry.name)}><Compass size={15}/>Ver progresión</Button>{!x.owned&&<Button size="sm" onClick={()=>onInspect(x.entry,x.branch)}>Ver requisitos</Button>}</div>
    </article>)}</div>
    {!shown.length&&<div className="empty">No hay clases en este filtro. Prueba «Todas» o cambia la búsqueda.</div>}
  </section>;
}
