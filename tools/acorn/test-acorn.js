const MM = require('./mastery-0.6.js'), A = require('./acorn.js'), assert = require('assert');
const DAY = 864e5; let T = Date.UTC(2026, 9, 5, 12);
const ids = A.SERIALS.slice();
function sim(nAns, seedP, start) {
  let x = seedP; const R = () => (x = (x * 16807) % 2147483647) / 2147483647;
  const P = MM.create(ids, { pace: 'steady', dial: 5 }); P.braveIds = new Set(ids.filter((_, i) => i % 3 == 0)); P.settings.brave = true;
  if (start) MM.place(P, start);
  let t = T - nAns / 40 * DAY, S = MM.session();
  for (let i = 0; i < nAns; i++) { if (i % 40 == 0) { t += DAY; S = MM.session(); MM.tick(P, t); if (MM.alarmDue(P, S, true)) MM.startIntervention(P, S, t); } const q = MM.next(P, S, t); MM.answer(P, S, q, R() < 0.85, 10, t); t += 60e3; }
  MM.tick(P, T);
  return P;
}
function toAcorn(P) { const a = { day: A.dayOf(T), era: 'II', settings: { pace: 'steady', dial: 5, brave: true, hero: 'kai', nemesis: 'rex', coins: 'THB', units: 'metric', clock: '24h', stories: 'on', drill: 'off', specials: 'on', palette: 'ocean' }, eras: { I: { placed: true, start: 1 }, II: { placed: true, start: 3 } }, skills: {} };
  for (const id of P.order) { const r = A.fromMastery(P, id); if (r) a.skills[A.serialOf(id)] = r; } return a; }
const norm = o => JSON.parse(JSON.stringify(o));
const cases = [['fresh (placed at III.1)', 0, 'III.1'], ['few months', 2500], ['heavy', 12000], ['near complete', 40000]];
const segno = require('child_process');
for (const [name, n, start] of cases) {
  const P = sim(n, 7 + n, start), a = toAcorn(P), code = A.encode(a), b = A.decode(code);
  assert.deepStrictEqual(norm(b.skills), norm(a.skills)); assert.deepStrictEqual(b.settings, a.settings); assert.strictEqual(b.era, 'II');
  // mastery round trip: P → acorn → P2 → acorn must be identical, and states identical
  const P2 = MM.create(ids, P.settings); for (const [s, r] of Object.entries(b.skills)) A.toMastery(r, P2, A.idOf(+s), T);
  const a2 = toAcorn(P2); assert.deepStrictEqual(norm(a2.skills), norm(a.skills));
  for (const id of ids) { const s1 = MM.state(P, id, T), s2 = MM.state(P2, id, T); const near = P.skills[id] && P.skills[id].due && Math.abs(P.skills[id].due - T) < DAY; if (!near) assert.strictEqual(s2, s1, id + ' ' + s1 + ' ' + s2); }
  const c = MM.counts(P, T);
  console.log(name.padEnd(24), String(code.length).padStart(5), 'chars', JSON.stringify(c));
  require('fs').writeFileSync('samples/sample-' + name.split(' ')[0] + '.txt', code);
}
// typo detection: change every char of a mid code one at a time
const code = require('fs').readFileSync('samples/sample-few.txt', 'utf8'); let caught = 0, tot = 0;
for (let i = 0; i < code.length; i++) for (const ch of 'A7Z') { if (code[i] === ch) continue; tot++; try { A.decode(code.slice(0, i) + ch + code.slice(i + 1)); } catch (e) { if (e.acorn) caught++; } }
console.log('single typos caught', caught, '/', tot);
let sw = 0, swt = 0; for (let i = 0; i + 1 < code.length; i++) { if (code[i] === code[i + 1]) continue; swt++; try { A.decode(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2)); } catch (e) { sw++; } }
console.log('swaps caught', sw, '/', swt);
// lenient reading
assert.deepStrictEqual(A.decode(A.group(code).toLowerCase().replace(/1/g, 'l').replace(/0/g, 'o')).skills, A.decode(code).skills);
// merge: order independent, idempotent
const a = A.decode(require('fs').readFileSync('samples/sample-heavy.txt', 'utf8')), b = A.decode(require('fs').readFileSync('samples/sample-few.txt', 'utf8'));
assert.deepStrictEqual(norm(A.merge(a, b).skills), norm(A.merge(b, a).skills));
assert.deepStrictEqual(norm(A.merge(a, a).skills), norm(a.skills));
// an old backup can't revive a withered leaf: proven long ago re-wilts after tick
const Pw = MM.create(ids, { dial: 5 }); A.toMastery({ kind: 'proven', top: 'd', sg: 1, due: A.dayOf(T) - 60 }, Pw, 'I.1.01', T); MM.tick(Pw, T); assert.strictEqual(MM.state(Pw, 'I.1.01', T), 'withered');
// future curriculum: serials past the list survive a decode/encode
const fut = { day: 300, skills: { 900: { kind: 'proven', top: 'd', sg: 2, due: 310 }, 5: { kind: 'placed' } } };
assert.deepStrictEqual(norm(A.decode(A.encode(fut)).skills), norm(fut.skills));
console.log('all tests pass');
