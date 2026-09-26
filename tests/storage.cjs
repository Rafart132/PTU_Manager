const ts = require('typescript'), fs = require('node:fs'), Module = require('node:module');
const assert = require('node:assert/strict'), path = require('node:path');
const cache = {};
function load(file) {
  if (cache[file]) return cache[file].exports;
  const m = new Module(path.resolve(file), module);
  cache[file] = m; m.filename = path.resolve(file); m.paths = module.paths;
  const req = m.require.bind(m);
  m.require = id => id.startsWith('@/')
    ? (id.endsWith('.json') ? require('../' + id.slice(2)) : load(id.slice(2) + '.ts'))
    : id.startsWith('./') ? load(path.join(path.dirname(file), id) + '.ts') : req(id);
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, m.filename);
  return m.exports;
}
const data = new Map();
const storage = {
  get length() { return data.size; },
  key: i => [...data.keys()][i] ?? null,
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
};
global.window = { localStorage: storage };
const R = load('lib/ptu.ts'), P = load('lib/starter.ts'), S = load('lib/storage.ts');
(async () => {
  const trainer = R.fresh(); trainer.name = 'Entrenador de prueba';
  trainer.starter = { ...P.freshStarter(), species: 'charmander', nickname: 'Chispa' };
  const first = await S.saveTrainer('test-1', 0, trainer);
  assert.equal(first.revision, 1);
  assert.deepEqual(S.listTrainers()[0].state, trainer);
  const exported = JSON.parse(JSON.stringify({ format: 'ptu-trainer-v1', state: trainer }));
  await S.saveTrainer('test-2', 0, exported.state);
  assert.equal(S.listTrainers().length, 2);
  trainer.name = 'Nombre actualizado';
  await S.saveTrainer('test-1', 1, trainer);
  await assert.rejects(S.saveTrainer('test-1', 1, exported.state), /otra pestaña/);
  assert.equal(S.listTrainers().find(x => x.id === 'test-1').state.name, 'Nombre actualizado');
  await assert.rejects(S.saveTrainer('invalid', 0, { ...trainer, level: -1 }), /formato compatible/);
  const setItem = storage.setItem;
  storage.setItem = () => { throw Error('QuotaExceededError'); };
  await assert.rejects(S.saveTrainer('full', 0, trainer), /No se pudo guardar/);
  storage.setItem = setItem;
  assert.equal(S.listTrainers().length, 2);
  data.set(S.STORAGE_PREFIX + 'broken', '{');
  assert.throws(() => S.listTrainers(), /No se ha sobrescrito/);
  await assert.rejects(S.saveTrainer('broken', 0, trainer), /No se ha sobrescrito/);
  assert.equal(data.get(S.STORAGE_PREFIX + 'broken'), '{');
  Object.defineProperty(global.window, 'localStorage', { get() { throw Error('SecurityError'); } });
  assert.throws(() => S.listTrainers(), /bloquea el guardado/);
  console.log('PASS: trainer and starter persistence, export compatibility, stale revisions, validation, full/blocked storage, preservation of corrupt data.');
})().catch(error => { console.error(error); process.exitCode = 1; });
