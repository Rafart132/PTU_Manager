'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, UserRound, Compass, Check, Lock, Plus, Minus, Save, Download, Search, ChevronRight, FileText, Info, RotateCcw, AlertCircle, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { catalog, skills, ranks, stats, statLabels, types, typeLabels, fresh, clean, byId, skillLabel, skillRank, skillBonus, baseRank, cap, has, budgets, statValues, derived, branchOptions, requirements, translatedReq, pickChecks, grants, allocation, issues, canSource, type Trainer, type Entry, type Pick } from '@/lib/ptu';
import { trainerSchema } from '@/lib/validation';
import { listTrainers, saveTrainer, STORAGE_PREFIX, type SavedTrainer } from '@/lib/storage';
import { StarterPanel } from '@/components/starter-panel';
import sources from '@/data/sources.json';
import referenceSources from '@/data/reference-pages.json';
import { configuration, configErrors, choiceImpact, withoutChoice, replaceChoice } from '@/lib/choices';
import { ClassPlanner } from '@/components/class-planner';
import { QuickReference } from '@/components/quick-reference';
import { ChoiceList } from '@/components/choice-list';
const skillOptions = skills.map(s => ({ value: s[0], label: s[1] }));
function Choice({ value, onChange, options, label, placeholder = 'Seleccionar…' }: {
    value: string;
    onChange: (v: string) => void;
    options: {
        value: string;
        label: string;
    }[];
    label: string;
    placeholder?: string;
}) { return <Select value={value || undefined} onValueChange={onChange}><SelectTrigger aria-label={label} className="choice"><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>; }
const numberOptions = (max: number, min = 0) => Array.from({ length: max - min + 1 }, (_, i) => ({ value: String(i + min), label: String(i + min) }));
const classList = catalog.filter(e => e.kind === 'class');
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, '0')).join('');
const emptyPick = (id: string): Pick => ({ id, uid: newId(), branch: '', source: byId(id)?.kind === 'edge' ? 'edge' : 'feature', config: {}, confirmed: [] });
const sourceTexts: Record<string, string> = {...sources, ...referenceSources};
const sourcePages = Object.keys(sourceTexts).map(Number).sort((a, b) => a - b);
export default function Home() {
    const [t, setT] = useState<Trainer>(fresh), [tab, setTab] = useState('builder'), [step, setStep] = useState('identity'), [kind, setKind] = useState('class'), [query, setQuery] = useState(''), [group, setGroup] = useState('all'), [available, setAvailable] = useState(false), [selected, setSelected] = useState<Pick | null>(null), [sourcePage, setSourcePage] = useState<number | null>(null), [future, setFuture] = useState('Ace Trainer'), [planLevel, setPlanLevel] = useState(1), [saved, setSaved] = useState<SavedTrainer[]>([]), [recordId, setRecordId] = useState(''), [revision, setRevision] = useState(0), [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [pending, setPending] = useState<{
        type: 'remove' | 'edit' | 'new' | 'load' | 'import';
        value?: string;
        replacement?: Pick;
    } | null>(null), [limit, setLimit] = useState(36);
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [progressionTab, setProgressionTab] = useState('next');
    const [undo, setUndo] = useState<{before: Trainer; after: Trainer; message: string} | null>(null);
    const inputRef = useRef<HTMLInputElement>(null), stateRef = useRef(t);
    stateRef.current = t;
    function update(next: Trainer | ((old: Trainer) => Trainer)) { setT(next); setDirty(true); setUndo(null); }
    function field<K extends keyof Trainer>(k: K, v: Trainer[K]) { update(old => ({ ...old, [k]: v })); }
    async function load() { setLoading(true); setLoadError(''); try {
        setSaved(listTrainers());
    }
    catch (e) {
        setLoadError(e instanceof Error ? e.message : 'No se pudieron cargar las fichas.');
    }
    finally {
        setLoading(false);
    } }
    useEffect(() => { load(); const refresh = (e: StorageEvent) => { if (e.key === null || e.key.startsWith(STORAGE_PREFIX))
        load(); }; window.addEventListener('storage', refresh); return () => window.removeEventListener('storage', refresh); }, []);
    useEffect(() => { const before = (e: BeforeUnloadEvent) => { if (dirty) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', before); return () => window.removeEventListener('beforeunload', before); }, [dirty]);
    useEffect(() => { setLimit(36); }, [query, kind, group, available]);
    useEffect(() => { const ctx = (document as any).modelContext; if (!ctx?.registerTool)
        return; const life = new AbortController(); Promise.resolve(ctx.registerTool({ name: 'read_trainer_draft', title: 'Consultar entrenador en edición', description: 'Devuelve el borrador visible y sus comprobaciones; no guarda ni modifica la ficha.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute(input: unknown) { if (!input || typeof input !== 'object' || Object.keys(input).length)
            throw Error('Se espera un objeto vacío.'); const st = stateRef.current; return { trainer: st, issues: issues(st), derived: derived(st) }; } }, { signal: life.signal })).catch(() => { }); return () => life.abort(); }, []);
    const a = allocation(t), b = budgets(t), d = derived(t), values = statValues(t), problems = useMemo(() => [...issues(t), ...t.picks.flatMap(p => configErrors(byId(p.id), p, { ...t, picks: t.picks.filter(q => q.uid !== p.uid) }).map(x => byId(p.id).label + ': ' + x))], [t]);
    const selectedEntry = selected ? byId(selected.id) : null;
    const selectedBase = withoutChoice(t, editingUid || undefined);
    const checks = selected && selectedEntry ? pickChecks(selectedBase, selectedEntry, selected) : [];
    const extra = selected && selectedEntry ? configErrors(selectedEntry, selected, selectedBase) : [];
    const canAdd = !!selected && checks.every(c => c.ok) && !extra.length;
    const grantsList = grants(t).filter(g => !g.skillOnly && !t.picks.some(p => p.source === g.key));
    const editGrants = grants(selectedBase).filter(g => !g.skillOnly && !selectedBase.picks.some(p => p.source === g.key));
    const missing = Math.max(0, a.featMax - a.featUsed) + Math.max(0, a.edgeMax - a.edgeUsed) + Math.max(0, a.generalMax - a.generalUsed) + Math.max(0, a.freeSkillMax - a.freeSkillUsed) + grantsList.length;
    const pickedClasses = t.picks.filter(p => byId(p.id)?.kind === 'class');
    function open(e: Entry, branch?: string) { setEditingUid(null); let p = emptyPick(e.id); let options = branchOptions(e, t); if (branch && options.includes(branch)) p.branch = branch; else if (options.length === 1)
        p.branch = options[0]; const g = grantsList.find(g => canSource(t, e, g.key)); if (g)
        p.source = g.key;
    else if (e.kind === 'general' && a.generalUsed < a.generalMax)
        p.source = 'general'; setSelected(p); }
    function edit(p: Pick) { setEditingUid(p.uid); setSelected({...p, config: {...p.config}, confirmed: [...p.confirmed]}); }
    function closeChoice() { setSelected(null); setEditingUid(null); }
    function commitChoice(after: Trainer, message: string) { setUndo({before: t, after, message}); setT(after); setDirty(true); }
    function undoChoice() { if (!undo || stateRef.current !== undo.after) return; setT(undo.before); setDirty(true); setUndo(null); toast.success('Cambio deshecho'); }
    function add() {
        if (!selected || !canAdd) return;
        const after = replaceChoice(t, selected);
        const impact = choiceImpact(t, after, selected.uid);
        if (editingUid && (impact.affected.length || impact.newIssues.length)) { setPending({type: 'edit', replacement: selected}); return; }
        commitChoice(after, (selectedEntry?.label || 'Elección') + (editingUid ? ': cambios aplicados.' : ': añadida a tu ficha.'));
        closeChoice();
    }
    function raise(sk: string) { const max = cap(t.level); if (skillRank(t, sk) >= max || t.level === 1 && t.weak.includes(sk))
        return; const next = { ...t, ups: { ...t.ups, [sk]: (t.ups[sk] || 0) + 1 } }; if (allocation(next).edgeUsed > allocation(next).edgeMax) {
        toast.error('No quedan ventajas para esta mejora.');
        return;
    } update(next); }
    function lower(sk: string) { if ((t.ups[sk] || 0) > 0)
        update({ ...t, ups: { ...t.ups, [sk]: t.ups[sk] - 1 } }); }
    async function save() { setSaving(true); const id = recordId || newId(); try {
        const result = await saveTrainer(id, revision, t);
        setRecordId(id);
        setRevision(result.revision);
        if (stateRef.current === t)
            setDirty(false);
        toast.success('Entrenador guardado en este navegador');
        load();
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
    finally {
        setSaving(false);
    } }
    function exportFile() { const blob = new Blob([JSON.stringify({ format: 'ptu-trainer-v1', state: t }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = (t.name.replace(/[^\p{L}\p{N}-]+/gu, '-') || 'entrenador') + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    async function importFile(file: File) { try {
        if (file.size > 400000)
            throw Error('Archivo demasiado grande.');
        const j = JSON.parse(await file.text()), s = trainerSchema.parse(j.state);
        setT(s as Trainer);
        setUndo(null);
        closeChoice();
        setRecordId('');
        setRevision(0);
        setDirty(true);
        toast.success('Copia importada como nuevo entrenador');
    }
    catch {
        toast.error('Ese archivo no es una ficha compatible.');
    } }
    const pendingPick = pending?.type === 'remove' ? t.picks.find(p => p.uid === pending.value) : pending?.replacement;
    const pendingAfter = pending?.type === 'remove' ? withoutChoice(t, pending.value) : pending?.replacement ? replaceChoice(t, pending.replacement) : null;
    const pendingImpact = pendingAfter && pendingPick ? choiceImpact(t, pendingAfter, pendingPick.uid) : null;
    const otherImpactIssues = pendingImpact?.newIssues.filter(s => !pendingImpact.affected.some(p => s.startsWith(p.label + ':'))) || [];
    function performPending() {
        if (pending?.type === 'remove' && pendingAfter && pendingPick) {
            commitChoice(pendingAfter, byId(pendingPick.id).label + ': quitada de tu ficha.');
            closeChoice();
        }
        if (pending?.type === 'edit' && pendingAfter && pendingPick) {
            commitChoice(pendingAfter, byId(pendingPick.id).label + ': cambios aplicados.');
            closeChoice();
        }
        if (pending?.type === 'new') {
        setT(fresh());
        setUndo(null);
        closeChoice();
        setRecordId('');
        setRevision(0);
        setDirty(false);
    } if (pending?.type === 'load') {
        const row = saved.find(s => s.id === pending.value);
        if (row) {
            const v = trainerSchema.safeParse(row.state);
            if (v.success) {
                setT(v.data as Trainer);
                setUndo(null);
                closeChoice();
                setRecordId(row.id);
                setRevision(row.revision);
                setDirty(false);
            }
            else
                toast.error('La ficha guardada no tiene un formato compatible.');
        }
    } if (pending?.type === 'import')
        inputRef.current?.click(); setPending(null); }
    const listing = catalog.filter(e => e.kind === kind || (kind === 'feature' && e.kind === 'general')).filter(e => !['Basic Skills', 'Adept Skills', 'Expert Skills', 'Master Skills'].includes(e.name)).filter(e => group === 'all' || e.group === group).filter(e => clean([e.name, e.label, e.summary, e.requirements].join(' ')).includes(clean(query))).filter(e => !available || requirements(t, e).every(c => c.ok));
    const futureEntries = catalog.filter(e => e.group === future && e.kind !== 'class');
    function sourceButton(page: number) { return <Button variant="ghost" size="sm" onClick={() => setSourcePage(page)}><BookOpen size={14}/>Core · p. {page}</Button>; }
    function entryCard(e: Entry, planning = false) { const req = requirements({ ...t, level: planning ? planLevel : t.level }, e); const unlocked = req.every(c => c.ok); return <article key={e.id} className={'option-card ' + (e.kind === 'class' ? 'class-card' : '')}><div className="option-top"><span className="kind-label">{e.kind === 'class' ? 'CLASE' : e.kind === 'edge' ? 'VENTAJA' : e.kind === 'reference' ? 'OPCIÓN DESBLOQUEADA' : e.group === 'General' ? 'RASGO GENERAL' : e.group}</span><span className={'status ' + (unlocked ? 'ready' : 'locked')}>{unlocked ? <Check size={13}/> : <Lock size={13}/>} {unlocked ? 'Requisitos cumplidos' : 'Ver requisitos'}</span></div><h3>{e.label}</h3>{e.label !== e.name && <span className="original-name">{e.name}</span>}<p className="option-summary">{e.summary}</p>{t.picks.some(p => p.id === e.id) && <span className="owned-label"><Check size={14}/>En tu ficha · {t.picks.filter(p => p.id === e.id).length}</span>}{e.summaryLanguage === 'en' && <span className="original-name">Descripción original en inglés</span>}<div className="option-foot"><span>{e.tags.match(/Ranked \d+/)?.[0]?.replace('Ranked', 'Rangos:') || ((e.tags.includes('[Branch]')) ? 'Especialización' : 'Core · p. ' + e.page)}</span><Button variant="outline" size="sm" onClick={() => open(e)}>Ver opción <ChevronRight size={14}/></Button></div></article>; }
    return <><Toaster richColors/><header className="masthead"><div className="brand"><BookOpen /><div><p className="eyebrow">POKÉMON TABLETOP UNITED · 1.05</p><h1>Cuaderno de entrenadores</h1></div></div><span className="edition">CREACIÓN Y PROGRESIÓN · NIVELES 1–50</span></header><main><div className="documentbar"><div className="docname"><UserRound size={20}/><strong>{t.name || 'Entrenador sin nombre'}</strong><span>{dirty ? 'Cambios sin guardar' : recordId ? 'Guardado' : 'Nuevo borrador'}</span></div><div className="actions"><Button variant="outline" onClick={() => setPending({ type: 'new' })}><Plus size={16}/>Nuevo</Button><Button variant="outline" onClick={exportFile}><Download size={16}/>Exportar</Button><Button variant="outline" onClick={() => setPending({ type: 'import' })}>Importar</Button><Button onClick={save} disabled={saving || loading}><Save size={16}/>{saving ? 'Guardando…' : 'Guardar ficha'}</Button></div></div>
    <p className="local-storage-note"><Save size={16}/>Las fichas se guardan en este navegador. Usa Exportar para hacer copias o llevarlas a otro dispositivo.</p>
    {undo && <div className="undo-banner" role="status"><span>{undo.message}</span><Button variant="outline" size="sm" onClick={undoChoice}><RotateCcw size={15}/>Deshacer</Button><Button variant="ghost" size="sm" onClick={() => setUndo(null)} aria-label="Cerrar aviso del último cambio">Cerrar</Button></div>}
    {loadError && <div className="notice"><Info size={18}/><span>{loadError} Puedes editar y exportar una copia mientras tanto.</span><Button variant="ghost" size="sm" onClick={load}>Reintentar</Button></div>}
    {saved.length > 0 && <div className="saved-picker"><label>Abrir una ficha guardada</label><Choice value={recordId} label="Ficha guardada" onChange={value => setPending({ type: 'load', value })} options={saved.map(s => ({ value: s.id, label: s.name }))}/></div>}
    <Tabs value={tab} onValueChange={setTab}><TabsList className="main-tabs"><TabsTrigger value="builder"><UserRound />Crear y editar</TabsTrigger><TabsTrigger value="starter">Pokémon inicial</TabsTrigger><TabsTrigger value="sheet"><FileText />Mi ficha</TabsTrigger><TabsTrigger value="future"><Compass />Progresión</TabsTrigger><TabsTrigger value="reference"><BookOpen />Reglas rápidas</TabsTrigger></TabsList><TabsContent value="builder"><div className="workspace"><div><Tabs value={step} onValueChange={setStep}><TabsList className="step-tabs"><TabsTrigger value="identity">1. Identidad</TabsTrigger><TabsTrigger value="skills">2. Habilidades</TabsTrigger><TabsTrigger value="stats">3. Estadísticas</TabsTrigger><TabsTrigger value="choices">4. Clases y rasgos</TabsTrigger></TabsList>
    <TabsContent value="identity"><section className="panel"><p className="eyebrow">IDENTIDAD Y EXPERIENCIA</p><h2>¿Quién empieza esta aventura?</h2><div className="two-col"><label>Nombre<Input value={t.name} onChange={e => field('name', e.target.value)} placeholder="Nombre del entrenador" maxLength={200}/></label><label>Nivel<Choice label="Nivel del entrenador" value={String(t.level)} onChange={s => { field('level', Number(s)); setPlanLevel(Number(s)); }} options={numberOptions(50, 1)}/></label><label>Edad<Input value={t.age} onChange={e => field('age', e.target.value)} placeholder="Texto libre" maxLength={200}/></label><label>Concepto<Input value={t.concept} onChange={e => field('concept', e.target.value)} placeholder="Explorador, artista, aspirante a campeón…" maxLength={200}/></label></div><label>Apariencia<Textarea value={t.appearance} onChange={e => field('appearance', e.target.value)} placeholder="Cómo se presenta al mundo." maxLength={12000}/></label><label>Historia y personalidad<Textarea value={t.story} onChange={e => field('story', e.target.value)} placeholder="Lo que le mueve a salir de viaje." maxLength={12000}/></label><p className="hint">Estos campos son narrativos. Tus habilidades y estadísticas se eligen en los siguientes apartados.</p><Button onClick={() => setStep('skills')}>Elegir habilidades <ChevronRight size={16}/></Button></section></TabsContent>
    <TabsContent value="skills"><section className="panel"><p className="eyebrow">TRASFONDO</p><h2>Lo que ya sabías antes de viajar</h2><p>Una habilidad Competente, una Novata y tres Patéticas. Las demás comienzan Sin entrenar. Deben ser cinco habilidades distintas.</p><label>Nombre del trasfondo<Input value={t.bg} onChange={e => field('bg', e.target.value)} placeholder="Aprendiz de investigador, artista callejero…" maxLength={200}/></label><div className="two-col"><label>Competente · 4d6<Choice label="Habilidad competente de trasfondo" value={t.adept} options={skillOptions} onChange={s => field('adept', s)}/></label><label>Novata · 3d6<Choice label="Habilidad novata de trasfondo" value={t.novice} options={skillOptions} onChange={s => field('novice', s)}/></label></div><div className="three-col">{t.weak.map((s, i) => <label key={i}>Patética {i + 1} · 1d6<Choice label={'Habilidad patética ' + (i + 1)} value={s} options={skillOptions} onChange={s => field('weak', t.weak.map((x, j) => i === j ? s : x))}/></label>)}</div>{sourceButton(13)}</section><section className="panel"><div className="section-title"><div><p className="eyebrow">DESARROLLO</p><h2>Mejorar tus habilidades</h2></div><span className="counter">{a.edgeMax - a.edgeUsed} ventajas disponibles</span></div><p className="hint">Cada aumento cuesta una ventaja. Se usan primero las concesiones de habilidad compatibles. Rango máximo por nivel: {ranks[cap(t.level)]}. El trasfondo puede conceder Competente desde nivel 1.</p><div className="skills-list">{skills.map(([sk, label, cat]) => <div className="skill-row" key={sk}><div><strong>{label}</strong><small>{cat} · base {baseRank(t, sk)}d6</small></div><span className="skill-rank">{skillRank(t, sk)}d6{skillBonus(t, sk) > 0 ? ' + ' + skillBonus(t, sk) : ''} <small>{ranks[skillRank(t, sk)]}</small></span><div className="skill-buttons"><Button variant="outline" size="icon" aria-label={'Reducir ' + label} disabled={!(t.ups[sk] > 0)} onClick={() => lower(sk)}><Minus size={15}/></Button><Button variant="outline" size="icon" aria-label={'Mejorar ' + label} disabled={skillRank(t, sk) >= cap(t.level) || (t.level === 1 && t.weak.includes(sk))} onClick={() => raise(sk)}><Plus size={15}/></Button></div></div>)}</div><p className="hint">Concesiones de habilidad usadas: {a.freeSkillUsed}/{a.freeSkillMax}. Las mejoras de aquí ya cuentan en el presupuesto de ventajas.</p>{sourceButton(52)}</section></TabsContent>
    <TabsContent value="stats"><section className="panel"><p className="eyebrow">ESTADÍSTICAS DE COMBATE</p><h2>Reparte los puntos de tu entrenador</h2><p>Base: HP 10; las otras estadísticas, 5. Reparte 10 puntos iniciales, hasta 5 por estadística. Cada nivel después del primero añade un punto más.</p><div className="point-summary"><span>Iniciales: <strong>{t.initial.reduce((x, y) => x + y, 0)} / 10</strong></span><span>Por nivel: <strong>{t.growth.reduce((x, y) => x + y, 0)} / {t.level - 1}</strong></span></div><Table><TableHeader><TableRow><TableHead>Estadística</TableHead><TableHead>Inicial</TableHead><TableHead>Por nivel</TableHead><TableHead>Total</TableHead></TableRow></TableHeader><TableBody>{stats.map((s, i) => <TableRow key={s}><TableCell><strong>{statLabels[i]}</strong></TableCell><TableCell><Choice label={'Puntos iniciales ' + s} value={String(t.initial[i])} options={numberOptions(5)} onChange={v => field('initial', t.initial.map((n, j) => i === j ? Number(v) : n))}/></TableCell><TableCell><Choice label={'Puntos por nivel ' + s} value={String(t.growth[i])} options={numberOptions(t.level - 1)} onChange={v => field('growth', t.growth.map((n, j) => i === j ? Number(v) : n))}/></TableCell><TableCell className="total-cell">{values[i]}</TableCell></TableRow>)}</TableBody></Table><p className="hint">HP es una estadística. Los puntos de vida se calculan aparte: nivel × 2 + HP × 3 + 10. Las etiquetas [+Estadística] seleccionadas se suman automáticamente.</p>{sourceButton(15)}</section>{t.level >= 5 && <section className="panel"><p className="eyebrow">HITOS DE PROGRESIÓN</p><h2>Recompensas de nivel</h2>{[5, 10, 20, 30, 40].filter(n => n <= t.level).map(n => <label key={n}>Nivel {n}<Choice label={'Recompensa nivel ' + n} value={t.milestones[n] || ''} onChange={s => field('milestones', { ...t.milestones, [n]: s })} options={[{ value: 'features', label: n === 5 ? '1 rasgo general' : '2 rasgos generales' }, ...(n === 5 ? [] : [{ value: 'edges', label: '2 ventajas' }]), { value: 'stats', label: 'Puntos de Ataque / Ataque especial' }]}/></label>)}<p className="hint">Los puntos ofensivos dependen de los niveles pares alcanzados en el tramo correspondiente; el hito de nivel 5 incluye los puntos retroactivos de niveles 2 y 4.</p><div className="two-col"><label>A Ataque<Choice label="Puntos ofensivos a Ataque" value={String(t.offense[0])} options={numberOptions(b.offense)} onChange={s => field('offense', [Number(s), t.offense[1]])}/></label><label>A Ataque especial<Choice label="Puntos ofensivos a Ataque especial" value={String(t.offense[1])} options={numberOptions(b.offense)} onChange={s => field('offense', [t.offense[0], Number(s)])}/></label></div><p>Repartidos: {t.offense[0] + t.offense[1]} / {b.offense}</p>{sourceButton(19)}</section>}</TabsContent>
    <TabsContent value="choices"><section className="panel chosen-panel"><div className="section-title"><div><p className="eyebrow">YA EN TU FICHA</p><h2>Tus elecciones</h2></div><span className="counter">{t.picks.length} elegidas</span></div><p className="hint">Edita la especialización, configuración o presupuesto de una elección. Para sustituirla por otra, quítala y elige la nueva en el catálogo.</p><ChoiceList trainer={t} onEdit={edit} onRemove={p => setPending({type: 'remove', value: p.uid})} onSource={setSourcePage} compact/></section><section className="panel catalog-panel"><div className="section-title"><div><p className="eyebrow">CLASES, VENTAJAS Y RASGOS</p><h2>Elige lo que sabe hacer</h2></div></div><p className="hint">Una clase consume un rasgo y abre sus opciones. Máximo cuatro clases. Cada opción muestra requisitos, efecto y su lugar en la ficha.</p>{grantsList.length > 0 && <div className="grant-box"><strong>Elecciones concedidas pendientes</strong>{grantsList.map(g => <span key={g.key}>{g.label}</span>)}</div>}<div className="catalog-controls"><div className="search-wrap"><Search size={18}/><Input aria-label="Buscar opciones" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre, efecto o requisito…"/></div><Choice label="Tipo de opción" value={kind} onChange={setKind} options={[{ value: 'class', label: 'Clases' }, { value: 'edge', label: 'Ventajas (Edges)' }, { value: 'feature', label: 'Rasgos (Features)' }, { value: 'reference', label: 'Recetas y técnicas' }]}/><Choice label="Filtrar por clase" value={group} onChange={setGroup} options={[{ value: 'all', label: 'Todas las clases' }, { value: 'General', label: 'Opciones generales' }, ...classList.map(e => ({ value: e.name, label: e.label }))]}/></div><label className="inline-check"><Checkbox checked={available} onCheckedChange={v => setAvailable(v === true)}/>Solo requisitos comprobados con mi ficha</label><p className="hint">{listing.length} opciones · Los requisitos del equipo se confirman dentro de cada opción.</p><div className="option-grid">{listing.slice(0, limit).map(e => entryCard(e))}</div>{!listing.length && <div className="empty">No hay coincidencias. Prueba otro término o desactiva el filtro de requisitos.</div>}{listing.length > limit && <Button variant="outline" className="load-more" onClick={() => setLimit(limit + 36)}>Mostrar más opciones</Button>}</section></TabsContent></Tabs></div>
    <aside className="sheet"><p className="eyebrow">TU ENTRENADOR</p><h2>{t.name || 'Por escribir'}</h2><p className="sheet-sub">Nivel {t.level}{t.concept ? ' · ' + t.concept : ''}</p><div className="stat-preview"><span><strong>{d.hp}</strong>PV máximos</span><span><strong>{d.ap}</strong>Puntos de acción</span></div><div className="budget-row"><span>Clases</span><strong>{pickedClasses.length} / 4</strong></div><div className="budget-row"><span>Rasgos</span><strong>{a.featUsed} / {a.featMax}</strong></div><div className="budget-row"><span>Ventajas</span><strong>{a.edgeUsed} / {a.edgeMax}</strong></div>{a.generalMax > 0 && <div className="budget-row"><span>Rasgos de hitos</span><strong>{a.generalUsed} / {a.generalMax}</strong></div>}<Progress value={Math.min(100, Math.round((a.featUsed + a.edgeUsed) / (a.featMax + a.edgeMax) * 100))} className="budget-progress"/>{pickedClasses.length ? <div className="class-tags">{pickedClasses.map(p => <span key={p.uid}>{byId(p.id).label}{p.branch ? ' · ' + p.branch : ''}</span>)}</div> : <p>Tu primera clase cuenta como uno de tus rasgos disponibles.</p>}<div className="validation"><strong>{problems.length ? problems.length + ' comprobaciones pendientes' : missing ? missing + ' elecciones pendientes' : 'Elecciones básicas completas'}</strong><p>{problems.length ? problems[0] : missing ? 'Puedes guardar el borrador y seguir eligiendo.' : 'Consulta los efectos situacionales de tus rasgos antes de jugar.'}</p></div><Button variant="outline" className="full-width" onClick={() => setTab('sheet')}>Ver ficha completa</Button></aside></div></TabsContent>
    <TabsContent value="starter"><StarterPanel trainer={t} onChange={s => field('starter', s)} onSource={setSourcePage}/></TabsContent><TabsContent value="sheet"><div className="workspace"><div><section className="panel"><p className="eyebrow">FICHA DEL PERSONAJE</p><h2>{t.name || 'Entrenador sin nombre'}</h2><p>{t.concept || 'Sin concepto'} · Nivel {t.level}{t.age ? ' · ' + t.age : ''}</p><div className="six-stats">{stats.map((s, i) => <div key={s}><span>{statLabels[i]}</span><strong>{values[i]}</strong></div>)}</div><div className="derived-grid">{[['PV máximos', d.hp], ['Puntos de acción', d.ap], ['Iniciativa', d.initiative], ['Evasión física', d.physical], ['Evasión especial', d.special], ['Evasión velocidad', d.speed], ['Movimiento terrestre', d.overland], ['Nado', d.swim], ['Power', d.power], ['Salto vertical', d.highJump], ['Salto horizontal', d.longJump], ['Alcance al lanzar', d.throwing]].map(([n, v]) => <div key={n}><span>{n}</span><strong>{v}</strong></div>)}</div><p className="hint">Valores permanentes calculados a partir de la base y las etiquetas de rasgos. Los cambios de combate y beneficios condicionados siguen indicados en cada rasgo.</p>{t.appearance && <><h3>Apariencia</h3><p className="free-text">{t.appearance}</p></>}{t.story && <><h3>Historia y personalidad</h3><p className="free-text">{t.story}</p></>}<label>Notas de juego<Textarea value={t.notes} onChange={e => field('notes', e.target.value)} placeholder="Vínculos, objetivos, acontecimientos…" maxLength={12000}/></label></section><section className="panel"><h2>Mis elecciones</h2><ChoiceList trainer={t} onEdit={edit} onRemove={p => setPending({type: 'remove', value: p.uid})} onSource={setSourcePage}/></section></div><aside className="sheet"><h3>Comprobaciones</h3>{problems.length ? <ul className="issue-list">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul> : <p>No se detectan conflictos en los requisitos registrados.</p>}{missing > 0 && <p>Faltan {missing} elecciones de tu presupuesto.</p>}<p>Las confirmaciones sobre tus Pokémon o circunstancias quedan registradas en la ficha; revísalas si cambia tu equipo.</p><Button onClick={save} disabled={saving || loading} className="full-width"><Save size={16}/>Guardar borrador</Button></aside></div></TabsContent>
    <TabsContent value="future"><Tabs value={progressionTab} onValueChange={setProgressionTab}><TabsList className="step-tabs"><TabsTrigger value="next">Próximas clases</TabsTrigger><TabsTrigger value="explore">Explorar una clase</TabsTrigger></TabsList><TabsContent value="next"><ClassPlanner trainer={t} onInspect={open} onExplore={name => {setFuture(name);setProgressionTab('explore');}}/></TabsContent><TabsContent value="explore"><div className="future-head"><div><p className="eyebrow">PLANIFICA SIN CAMBIAR TU FICHA</p><h2>¿Hasta dónde puede llegar tu entrenador?</h2><p>Consulta la clase completa y sus rasgos avanzados. El nivel de consulta no concede habilidades ni elecciones.</p></div><label>Nivel de consulta<Choice value={String(planLevel)} onChange={s => setPlanLevel(Number(s))} label="Nivel de consulta futura" options={numberOptions(50, 1)}/></label></div><div className="class-explorer"><label>Clase que quieres explorar<Choice value={future} onChange={setFuture} label="Clase futura" options={classList.map(e => ({ value: e.name, label: e.label + ' · ' + e.name }))}/></label></div>{(() => { const e = classList.find(e => e.name === future)!; return <section className="class-intro"><div><span className="eyebrow">CLASE · {e.name}</span><h2>{e.label}</h2><p>{e.summary}</p><p className="hint">Entrada: {translatedReq(e.requirements)}</p></div><Button variant="outline" onClick={() => open(e)}>Ver clase y requisitos</Button></section>; })()}<p className="notice"><Info size={18}/>Los requisitos se comparan con tus habilidades y elecciones actuales, simulando solo el nivel {planLevel}. Elegir «Añadir» siempre usa tu nivel real {t.level}.</p><div className="option-grid future-options">{futureEntries.map(e => entryCard(e, true))}</div></TabsContent></Tabs></TabsContent><TabsContent value="reference"><QuickReference onSource={setSourcePage}/></TabsContent></Tabs>
    <footer>PTU 1.05 · Manual principal · Interfaz en español; algunas descripciones conservan el texto original en inglés. Incluye un Pokémon inicial y comparación de beneficios del entrenador.</footer></main>
    <Sheet open={!!selected} onOpenChange={v => { if (!v)
        closeChoice(); }}><SheetContent className="detail-sheet">{selected && selectedEntry && <><SheetHeader><p className="eyebrow">{selectedEntry.group} · CORE P. {selectedEntry.page}</p><SheetTitle>{editingUid ? "Editar: " : ""}{selectedEntry.label}</SheetTitle><SheetDescription>{selectedEntry.name} · {selectedEntry.kind === 'class' ? 'Clase: consume un rasgo' : selectedEntry.kind === 'edge' ? 'Ventaja (Edge)' : selectedEntry.kind === 'reference' ? 'Se desbloquea mediante un rasgo' : 'Rasgo (Feature)'}</SheetDescription></SheetHeader><div className="sheet-body"><p className="detail-summary">{selectedEntry.summary}</p>{selectedEntry.usage && <p className="usage">{selectedEntry.usage}</p>}{branchOptions(selectedEntry, selectedBase).length > 0 && <label>Especialización<Choice label="Especialización" value={selected.branch} options={branchOptions(selectedEntry, selectedBase).map(value => ({ value, label: types.includes(value) ? typeLabels[types.indexOf(value)] : stats.includes(value) ? statLabels[stats.indexOf(value)] : value }))} onChange={branch => setSelected({ ...selected, branch })}/></label>}{configuration(selectedEntry).map(c => <label key={c.key}>{c.label}<Choice value={selected.config[c.key] || ''} label={c.label} options={c.options} onChange={v => setSelected({ ...selected, config: { ...selected.config, [c.key]: v } })}/></label>)}{<label>Usar una elección de<Choice label="Presupuesto de la elección" value={selected.source} onChange={source => setSelected({ ...selected, source })} options={[...(selectedEntry.kind === 'reference' ? [] : [{ value: selectedEntry.kind === 'edge' ? 'edge' : 'feature', label: selectedEntry.kind === 'edge' ? 'Ventajas normales' : 'Rasgos normales' }]), ...(selectedEntry.kind === 'general' || selectedEntry.group === 'Hobbyist' ? [{ value: 'general', label: 'Rasgos generales de hitos' }] : []), ...editGrants.filter(g => canSource(selectedBase, selectedEntry, g.key)).map(g => ({ value: g.key, label: g.label }))]}/></label>}{editingUid && <p className="edit-note">Estás editando una elección existente. Al guardar se conserva su lugar en la ficha y se revisan sus dependencias.</p>}<h3>¿Qué necesitas?</h3><div className="requirements">{checks.map((c, i) => <div className={'requirement ' + (c.ok ? 'met' : 'unmet')} key={i}>{c.context ? <Checkbox aria-label={'Confirmar ' + c.text} checked={c.ok} onCheckedChange={v => setSelected({ ...selected, confirmed: v ? [...selected.confirmed, c.key!] : selected.confirmed.filter(s => s !== c.key) })}/> : c.ok ? <Check size={17}/> : <Lock size={17}/>}<span>{c.text}{c.context && <small>Confirmación de la mesa o del equipo; no se deduce de la ficha.</small>}</span></div>)}{extra.map(s => <div className="requirement unmet" key={s}><Lock size={17}/><span>{s}</span></div>)}</div>{selectedEntry.kind === 'reference' && !editGrants.some(g => canSource(selectedBase, selectedEntry, g.key)) ? <p className="notice">Esta opción se consulta o se elige mediante el rasgo que la concede; no se compra como un rasgo independiente.</p> : <Button disabled={!canAdd} onClick={add} className="full-width">{editingUid ? <Pencil size={16}/> : <Plus size={16}/>} {editingUid ? "Guardar cambios de la elección" : "Añadir a mi ficha"}</Button>}<details open={selectedEntry.summaryLanguage === 'en'}><summary>Efecto completo · original en inglés</summary><p className="original-text">{selectedEntry.effect}</p></details>{sourceButton(selectedEntry.page)}<p className="hint">Si cambias habilidades, nivel o rasgos anteriores, se volverán a comprobar las elecciones. No se borran automáticamente.</p></div></>}</SheetContent></Sheet>
    <Dialog open={sourcePage !== null} onOpenChange={v => { if (!v)
        setSourcePage(null); }}><DialogContent className="source-dialog"><DialogHeader><DialogTitle>Manual principal · página {sourcePage}</DialogTitle><DialogDescription>Texto original en inglés. Incluye excepciones y elecciones relacionadas; puede conservar saltos de línea del PDF.</DialogDescription></DialogHeader><pre>{sourcePage ? sourceTexts[String(sourcePage)] || 'Esta página aún no está incluida en la consulta.' : ''}</pre><div className="actions"><Button variant="outline" disabled={!sourcePage || sourcePages.indexOf(sourcePage) <= 0} onClick={() => setSourcePage(sourcePages[sourcePages.indexOf(sourcePage!) - 1])}>Anterior</Button><Button variant="outline" disabled={!sourcePage || sourcePages.indexOf(sourcePage) < 0 || sourcePages.indexOf(sourcePage) >= sourcePages.length - 1} onClick={() => setSourcePage(sourcePages[sourcePages.indexOf(sourcePage!) + 1])}>Siguiente</Button></div></DialogContent></Dialog>
    <AlertDialog open={!!pending} onOpenChange={v => {if (!v) setPending(null);}}><AlertDialogContent className="choice-confirmation"><AlertDialogHeader><AlertDialogTitle>{pending?.type === 'remove' ? 'Quitar ' + (pendingPick ? byId(pendingPick.id).label : 'esta elección') : pending?.type === 'edit' ? 'Revisar las elecciones relacionadas' : pending?.type === 'new' ? 'Empezar otro entrenador' : pending?.type === 'import' ? 'Importar una copia' : 'Abrir la ficha guardada'}</AlertDialogTitle><AlertDialogDescription>{pendingImpact ? pendingImpact.affected.length || otherImpactIssues.length ? 'Este cambio deja comprobaciones pendientes. Se conservarán las elecciones relacionadas para que puedas corregirlas.' : 'Se recalculará el presupuesto. No se detectan nuevas dependencias pendientes; podrás deshacer este cambio.' : dirty ? 'Hay cambios sin guardar. Si continúas, se sustituirá el borrador actual. Guarda o exporta antes si quieres conservarlo.' : 'Esto sustituye el borrador visible. Las fichas ya guardadas se conservarán.'}</AlertDialogDescription></AlertDialogHeader>
    {pendingImpact && <div className="impact-list">{pendingImpact.affected.map(item => <div key={item.uid}><strong>{item.label}</strong><ul>{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>)}{otherImpactIssues.length > 0 && <ul>{otherImpactIssues.map(issue => <li key={issue}>{issue}</li>)}</ul>}</div>}
    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={performPending}>{pending?.type === 'remove' ? 'Quitar elección' : pending?.type === 'edit' ? 'Aplicar cambios' : 'Continuar'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <input type="file" ref={inputRef} accept="application/json,.json" hidden onChange={e => { if (e.target.files?.[0])
        importFile(e.target.files[0]); e.target.value = ''; }}/>
    </>;
}
