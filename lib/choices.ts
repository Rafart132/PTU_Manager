import {catalog,skills,skillLabel,skillRank,stats,byId,branchOptions,requirements,pickChecks,issues,type Trainer,type Entry,type Pick,type Check} from './ptu';

// When editing, release only the original choice's slot. Its identity and grants
// survive the replacement; other choices keep their own budget and prerequisites.
export function withoutChoice(t:Trainer, uid?:string):Trainer {
  return uid ? {...t,picks:t.picks.filter(p=>p.uid!==uid)} : t;
}

export function replaceChoice(t:Trainer, pick:Pick):Trainer {
  return {...t,picks:t.picks.some(p=>p.uid===pick.uid)
    ? t.picks.map(p=>p.uid===pick.uid?pick:p)
    : [...t.picks,pick]};
}

export function choiceChecks(t:Trainer,p:Pick):Check[] {
  const e=byId(p.id);
  if(!e)return [{text:'Esta elección no existe en el catálogo.',ok:false}];
  const base=withoutChoice(t,p.uid);
  return [...pickChecks(base,e,p),...configErrors(e,p,base).map(text=>({text,ok:false}))];
}

export function choiceImpact(before:Trainer,after:Trainer,changedUid:string) {
  const affected=after.picks.filter(p=>p.uid!==changedUid).flatMap(p=>{
    const previous=before.picks.find(q=>q.uid===p.uid);
    const old=new Set(previous?choiceChecks(before,previous).filter(c=>!c.ok).map(c=>c.text):[]);
    const reasons=[...new Set(choiceChecks(after,p).filter(c=>!c.ok&&!old.has(c.text)).map(c=>c.text))];
    return reasons.length?[{uid:p.uid,label:byId(p.id)?.label||p.id,reasons}]:[];
  });
  const oldIssues=new Set(issues(before));
  const newIssues=issues(after).filter(s=>!oldIssues.has(s));
  return {affected,newIssues};
}

export type ClassReadiness={entry:Entry;branch:string;checks:Check[];missing:Check[];context:Check[];owned:boolean;inSheet:boolean;status:'ready'|'near'|'context'|'later'|'owned'};

export function classReadiness(t:Trainer,e:Entry):ClassReadiness {
  const branches=branchOptions(e,t);
  const availableBranches=(branches.length?branches:['']).filter(branch=>
    !t.picks.some(p=>p.id===e.id&&p.branch===branch));
  const owned=!availableBranches.length;
  const candidates=(owned?(branches.length?branches:['']):availableBranches).map(branch=>{
    const p:Pick={uid:'planner-candidate',id:e.id,branch,source:'feature',config:{},confirmed:[]};
    const raw=requirements(t,e,p);
    const checks=[...new Map(raw.map(c=>[c.text,c])).values()];
    return {branch,checks,missing:checks.filter(c=>!c.ok&&!c.context),context:checks.filter(c=>!c.ok&&c.context)};
  }).sort((a,b)=>a.missing.length-b.missing.length||a.context.length-b.context.length);
  const best=candidates[0];
  const status=owned?'owned':best.missing.length===0?(best.context.length?'context':'ready'):
    best.missing.length===1&&!best.context.length?'near':'later';
  return {entry:e,...best,owned,inSheet:t.picks.some(p=>p.id===e.id),status};
}
export function configuration(e:Entry):{key:string;label:string;options:{value:string;label:string}[]}[]{let arr:{key:string;label:string;options:{value:string;label:string}[]}[]=[];const make=(key:string,label:string,options:string[])=>arr.push({key,label,options:options.map(value=>({value,label:skillLabel(value)}))});if(['Mentor','Fashionista'].includes(e.name)){let list=e.name==='Mentor'?['Charm','Intimidate','Intuition','Pokémon Education']:['Charm','Command','Guile','Intimidate','Intuition'];make('skill1','Primera habilidad de la clase',list);make('skill2','Segunda habilidad de la clase',list)}if(e.name==='Researcher')make('field2','Segundo campo de investigación',['General','Apothecary','Artificer','Botany','Chemistry','Climatology','Occultism','Paleontology','Pokémon Care']);if(e.name==='Martial Artist')make('ability','Estilo marcial',['Guts','Inner Focus','Iron Fist','Limber','Reckless','Technician']);if(e.name==='Dancer')make('ability','Habilidad',['Spinning Dance','Own Tempo']);if(e.name==='Hunter')make('ability','Habilidad',['Teamwork','Pack Hunt']);if(e.name==='Hex Maniac')make('ability','Habilidad',['Cursed Body','Omen']);if(e.name==='Chronicler')make('archive','Archivo inicial',['Profile Archive','Technique Archive','Travel Archive']);if(e.name==='Aura Guardian'){make('move1','Primer movimiento',['Detect','Vacuum Wave','Force Palm']);make('move2','Segundo movimiento',['Detect','Vacuum Wave','Force Palm'])}if(e.name==='Skill Enhancement'){make('skill1','Primera habilidad',skills.map(x=>x[0]));make('skill2','Segunda habilidad',skills.map(x=>x[0]))}if(e.name==='Categoric Inclination')make('category','Categoría',['Cuerpo','Mente','Espíritu']);if(e.name==='Virtuoso')make('skill','Habilidad maestra',skills.map(x=>x[0]));if(e.tags.match(/\[\+(?:Any|.* or )/))make('stat','Mejora de estadística',stats);return arr}
export function configErrors(e:Entry,p:Pick,t:Trainer){let errs:string[]=[];for(const c of configuration(e))if(!c.options.some(x=>x.value===p.config[c.key]))errs.push(c.label);if(p.config.skill1&&p.config.skill1===p.config.skill2)errs.push('Dos habilidades distintas');if(p.config.move1&&p.config.move1===p.config.move2)errs.push('Dos movimientos distintos');if(e.name==='Researcher'&&p.config.field2===p.branch)errs.push('Dos campos distintos');if(['Mentor','Fashionista'].includes(e.name))for(const k of ['skill1','skill2'])if(p.config[k]&&skillRank(t,p.config[k])<3)errs.push(skillLabel(p.config[k])+' debe ser Novato');if(e.name==='Virtuoso'&&skillRank(t,p.config.skill||'')<6)errs.push('La habilidad debe ser Maestra');if(e.name==='Skill Enhancement'&&t.picks.some(q=>q.id===e.id&&[q.config.skill1,q.config.skill2].some(x=>[p.config.skill1,p.config.skill2].includes(x))))errs.push('No repetir una habilidad ya mejorada');return errs}
