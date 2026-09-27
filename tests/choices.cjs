const ts = require('typescript');
const fs = require('fs');
const Module = require('module');
const assert = require('node:assert/strict');

function compile(name, imports = {}) {
  const filename = process.cwd() + '/lib/' + name + '.cjs';
  const source = fs.readFileSync('lib/' + name + '.ts', 'utf8')
    .replace("import raw from '@/data/catalog.json';", "const raw = require('../data/catalog.json');");
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  const originalRequire = m.require.bind(m);
  m.require = id => imports[id] || originalRequire(id);
  m._compile(code, filename);
  return m.exports;
}
const R = compile('ptu');
const C = compile('choices', {'./ptu': R});
const entry = name => R.catalog.find(e => e.name === name);
const pick = (name, overrides = {}) => ({uid: name, id: entry(name).id, branch: '', source: entry(name).kind === 'edge' ? 'edge' : 'feature', config: {}, confirmed: [], ...overrides});
const trainer = () => ({...R.fresh(), adept: 'Command', novice: 'Charm', weak: ['Combat', 'Stealth', 'Medicine Education'], initial: [5, 0, 0, 0, 0, 5]});

// Editing a choice releases its own slot, including a full budget or free grant.
let t = trainer();
t.picks = ['Ace Trainer', 'Perseverance', 'Elite Trainer', 'Critical Moment'].map(name => pick(name));
assert.equal(R.allocation(t).featUsed, R.budgets(t).feat);
assert(C.choiceChecks(t, {...t.picks[0], config: {}}).every(c => c.ok));
const before = structuredClone(t);
const edited = {...t.picks[0], confirmed: ['table-note']};
const after = C.replaceChoice(t, edited);
assert.equal(after.picks.length, t.picks.length);
assert.deepEqual(after.picks.map(p => p.uid), t.picks.map(p => p.uid));
assert.deepEqual(t, before, 'The original snapshot must remain available for undo');

t = trainer();
const training = pick('Focused Training', {source: 'training'});
t.picks = [training];
assert(C.choiceChecks(t, training).every(c => c.ok), 'Editing reuses the initial training grant');

// Removing a class reports dependent choices, keeps them, and frees its budget.
t = trainer();
t.picks = [pick('Ace Trainer'), pick('Perseverance')];
let removed = C.withoutChoice(t, 'Ace Trainer');
let impact = C.choiceImpact(t, removed, 'Ace Trainer');
assert(impact.affected.some(x => x.uid === 'Perseverance' && x.reasons.some(s => s.includes('Entrenador experto'))));
assert.equal(removed.picks.length, 1);
assert.equal(removed.picks[0].id, entry('Perseverance').id);
assert.equal(R.allocation(removed).featUsed, R.allocation(t).featUsed - 1);
assert.deepEqual(C.replaceChoice(removed, t.picks[0]).picks.map(p => p.id).sort(), t.picks.map(p => p.id).sort());

// Changing a Researcher field warns about the feature tied to the old field.
t = trainer();
t.novice = 'General Education';
const researcher = pick('Researcher', {branch: 'General', config: {field2: 'Botany'}});
const botany = R.catalog.find(e => e.group === 'Researcher' && e.kind === 'feature' && e.page === 143);
const study = {uid: 'study', id: botany.id, branch: '', config: {}, confirmed: [], source: researcher.uid + '-research'};
t.picks = [researcher, study];
const changed = C.replaceChoice(t, {...researcher, config: {field2: 'Chemistry'}});
impact = C.choiceImpact(t, changed, researcher.uid);
assert.equal(changed.picks[1].source, study.source, 'Editing must preserve the grant identity');
assert(impact.affected.some(x => x.uid === study.uid && x.reasons.includes('Campo de investigación: Botany')));
removed = C.withoutChoice(t, researcher.uid);
assert(C.choiceImpact(t, removed, researcher.uid).affected.some(x => x.uid === study.uid && x.reasons.includes('Elección disponible en el presupuesto')));

// No dependency warning for unrelated changes or already failing prerequisites.
t = trainer();
t.picks = [pick('Ace Trainer'), pick('Skill Enhancement', {config: {skill1: 'Command', skill2: 'Charm'}})];
impact = C.choiceImpact(t, C.withoutChoice(t, 'Skill Enhancement'), 'Skill Enhancement');
assert.equal(impact.affected.length, 0);
assert.equal(impact.newIssues.length, 0);
assert(C.choiceChecks(t, {...t.picks[1], config: {skill1: 'Focus', skill2: 'Charm'}}).every(c => c.ok), 'The choice must not conflict with its own skill configuration');
assert(C.choiceChecks(t, {...t.picks[1], config: {skill1: 'Charm', skill2: 'Charm'}}).some(c => !c.ok && c.text === 'Dos habilidades distintas'));

// The planner evaluates the real sheet and never treats table confirmations as met.
t = trainer();
assert.equal(C.classReadiness(t, entry('Ace Trainer')).status, 'ready');
t.picks = [pick('Ace Trainer')];
assert.equal(C.classReadiness(t, entry('Ace Trainer')).status, 'owned');
t = trainer();
t.novice = 'Focus';
let plan = C.classReadiness(t, entry('Duelist'));
assert.equal(plan.status, 'near');
assert.equal(plan.missing.length, 1);
assert.equal(plan.missing[0].text, entry('Focused Training').label);
t.picks = [training];
assert.equal(C.classReadiness(t, entry('Duelist')).status, 'ready');
t.novice = 'Charm';
assert.equal(C.classReadiness(t, entry('Duelist')).status, 'near');
plan = C.classReadiness(t, entry('Type Ace'));
assert.equal(plan.status, 'context');
assert(plan.context.length > 0);
assert(plan.context.every(c => !c.ok));
t.picks.push(pick('Type Ace', {branch: plan.branch}));
plan = C.classReadiness(t, entry('Type Ace'));
assert.equal(plan.inSheet, true, 'Branch classes remain visible in My classes');
assert.equal(plan.owned, false, 'Unchosen specializations can still be explored');
assert.notEqual(plan.branch, t.picks.at(-1).branch);
const snapshot = structuredClone(t);
for (const e of R.catalog.filter(e => e.kind === 'class')) {
  plan = C.classReadiness(t, e);
  if (plan.status === 'near') { assert.equal(plan.missing.length, 1); assert.equal(plan.context.length, 0); }
  if (plan.status === 'ready') assert(plan.checks.every(c => c.ok));
}
assert.deepEqual(t, snapshot, 'Planning must never mutate the character');
console.log('PASS: edit at full budget; free-grant edits; immutable replacement; dependent removals and field edits; preserved grant IDs; configuration validation; ready/near/context/owned planning.');
