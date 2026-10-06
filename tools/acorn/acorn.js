/* Mathera · Acorn v2: the whole tree in one save code. No accounts, no server.
   Pure logic: no DOM, no clock. Shared by the site, Wayfinder, ForgePath and the games.

   HOW A TREE BECOMES A CODE
   1. Every skill has a permanent serial number (SERIALS below). The list only ever grows at the end;
      a serial is never reused or reordered, so old Acorns keep loading as the curriculum grows.
   2. Only facts are saved: "step c planted, stage 3, due on day 412". Thirsty and withered-by-time are
      worked out again on load, so grafting an old backup can't bring a dead leaf back to life.
   3. The facts become a stream of bits. Small numbers use Elias gamma codes (short numbers, short codes),
      untouched skills are skipped with a gap count (run-length, like a telegraph or a fax), and each
      date is stored as a difference from the one before (day counts, like Julian Day Numbers).
   4. A CRC-32 seal goes on the end, so a mistyped code is refused instead of loaded.
   5. The bits are written 5 at a time in Crockford base32 (0-9 and A-Z without I, L, O, U), which a
      QR code can hold in its compact alphanumeric mode. When reading, I and L count as 1 and O as 0.

   BIT LAYOUT (v1)
   version 4 · save day 16 · has-settings 1
   [settings] pace γ · dial 4 · brave 1 · hero γ · nemesis γ · coins γ · units γ · clock γ ·
              stories 1 · drill 1 · specials 1 · palette γ · era γ
   eras γ(n+1) · per era: placed 1 · start unit γ(k+1)      (k = 0 means not chosen)
   records γ(n+1) · per record: serial gap γ · kind (prefix code) · fields by kind
     proven   0       stage 3, due Δ, brave 1 [· e 1 · f 1]
     inferred 10      run γ (how many more inferred skills follow in a row, plus 1)
     planted  110     top 2, stage 3, due Δ, cur 2, streak 2
     growing  1110    cur 2, streak 2
     withered 11110   from-step 2, days ago γz, cur 2, streak 2
     placed   111110  run γ
   [v2] sections γ(n+1) · per section: type γ · length in bits γ(len+1) · payload
        Sections let a newer app add data (the activity journal, later lock codes and seed packets) that an
        older v2 app skips over and writes back out untouched, the same way unknown skill serials survive.
        type 1 = activity journal (see JOURNAL below)
   zero padding to a whole byte · CRC-32 of those bytes (32 bits)
   JOURNAL (section 1): one line per day for the last A.JOURNAL_DAYS days, newest first
     fields γ(f+1) · days γ(n+1) · per day: day gap γ (first = save day − day + 1, then the gap to the
     previous day written) · each field γ(v+1) in A.JOURNAL_FIELDS order · skills touched γ(k+1) · serial gaps γ
     A.JOURNAL_FIELDS is append-only, like the serials; a newer app's extra fields are read and dropped.
   γ = Elias gamma of n ≥ 1; γz = gamma of the zigzag of a signed number, plus 1; Δ = γz of (due − previous due)
*/
(function (G) {
  const A = {};
  A.VERSION = 2;
  A.JOURNAL_DAYS = 28;
  /* what a day of study records: append only */
  A.JOURNAL_FIELDS = ['min', 'q', 'right', 'fastWrong', 'hints', 'idle', 'sessions', 'quitMiss', 'choiceQ', 'choiceRight'];
  A.EPOCH = Date.UTC(2026, 0, 1);            // Mathera day 0
  const DAY = 864e5;
  A.dayOf = ms => Math.floor((ms - A.EPOCH) / DAY);
  A.msOf = day => A.EPOCH + day * DAY + DAY / 2;   // midday, so a date is never more than half a day out

  /* permanent skill serials: serial = position + 1. Append only. */
  A.SERIALS = (`
I.1.01 I.1.02 I.1.03 I.1.04 I.1.05 I.1.06 I.1.07 I.1.08 I.1.09 I.1.10 I.1.11 I.1.12 I.1.13 I.1.14 I.1.15 I.1.16 I.2.01 
I.2.02 I.2.03 I.2.04 I.2.05 I.2.06 I.2.07 I.2.08 I.2.09 I.2.10 I.2.11 I.2.12 I.3.01 I.3.02 I.3.03 I.3.04 I.3.05 I.3.06 
I.3.07 I.3.08 I.3.09 I.3.10 I.3.11 I.3.12 I.4.01 I.4.02 I.4.03 I.4.04 I.4.05 I.4.06 I.4.07 I.4.08 I.4.09 I.4.10 I.4.11 
I.4.12 I.4.13 I.4.14 I.4.15 I.4.16 I.4.17 I.4.18 I.4.19 I.4.20 I.4.21 I.4.22 I.4.23 I.5.01 I.5.02 I.5.03 I.5.04 I.5.05 
I.5.06 I.5.07 I.5.08 I.5.09 I.5.10 I.5.11 I.5.12 I.5.13 I.5.14 I.5.15 I.6.01 I.6.02 I.6.03 I.6.04 I.6.05 I.6.06 I.6.07 
I.6.08 I.6.09 I.6.10 I.6.11 I.6.12 I.6.13 I.6.14 I.7.01 I.7.02 I.7.03 I.7.04 I.7.05 I.7.06 I.7.07 I.7.08 I.7.09 I.7.10 
I.7.11 I.7.12 I.7.13 I.7.14 I.7.15 I.7.16 II.1.01 II.1.02 II.1.03 II.1.04 II.1.05 II.1.06 II.1.07 II.1.08 II.1.09 
II.1.10 II.1.11 II.1.12 II.2.01 II.2.02 II.2.03 II.2.04 II.2.05 II.2.06 II.2.07 II.2.08 II.2.09 II.2.10 II.2.11 II.2.12 
II.2.13 II.2.14 II.2.15 II.3.01 II.3.02 II.3.03 II.3.04 II.3.05 II.3.06 II.3.07 II.3.08 II.3.09 II.3.10 II.3.11 II.3.12 
II.3.13 II.3.14 II.3.15 II.4.01 II.4.02 II.4.03 II.4.04 II.4.05 II.4.06 II.4.07 II.4.08 II.4.09 II.4.10 II.4.11 II.4.12 
II.5.01 II.5.02 II.5.03 II.5.04 II.5.05 II.5.06 II.5.07 II.5.08 II.5.09 II.5.10 II.5.11 II.5.12 II.5.13 II.5.14 II.5.15 
II.6.01 II.6.02 II.6.03 II.6.04 II.6.05 II.6.06 II.6.07 II.6.08 II.6.09 II.6.10 II.6.11 II.6.12 II.6.13 II.6.14 II.7.01 
II.7.02 II.7.03 II.7.04 II.7.05 II.7.06 II.7.07 II.7.08 II.7.09 II.7.10 II.7.11 II.7.12 II.7.13 II.7.14 II.8.01 II.8.02 
II.8.03 II.8.04 II.8.05 II.8.06 II.8.07 II.8.08 II.8.09 II.9.01 II.9.02 II.9.03 II.9.04 II.9.05 II.9.06 II.9.07 II.9.08 
II.9.09 II.9.10 II.9.11 II.9.12 II.9.13 II.9.14 II.9.15 II.9.16 II.9.17 II.9.18 II.9.19 II.9.20 II.10.01 II.10.02 
II.10.03 II.10.04 II.10.05 II.10.06 II.10.07 II.10.08 II.10.09 III.1.01 III.1.02 III.1.03 III.1.04 III.1.05 III.1.06 
III.1.07 III.1.08 III.1.09 III.1.10 III.1.11 III.1.12 III.1.13 III.1.14 III.1.15 III.2.01 III.2.02 III.2.03 III.2.04 
III.2.05 III.2.06 III.2.07 III.2.08 III.2.09 III.2.10 III.2.11 III.2.12 III.2.13 III.2.14 III.2.15 III.3.01 III.3.02 
III.3.03 III.3.04 III.3.05 III.3.06 III.3.07 III.3.08 III.3.09 III.3.10 III.3.11 III.3.12 III.3.13 III.3.14 III.3.15 
III.3.16 III.3.17 III.4.01 III.4.02 III.4.03 III.4.04 III.4.05 III.4.06 III.4.07 III.4.08 III.4.09 III.4.10 III.4.11 
III.4.12 III.4.13 III.4.14 III.4.15 III.4.16 III.4.17 III.5.01 III.5.02 III.5.03 III.5.04 III.5.05 III.5.06 III.5.07 
III.5.08 III.5.09 III.5.10 III.5.11 III.5.12 III.5.13 III.5.14 III.5.15 III.6.01 III.6.02 III.6.03 III.6.04 III.6.05 
III.6.06 III.6.07 III.6.08 III.6.09 III.6.10 III.6.11 III.6.12 III.7.01 III.7.02 III.7.03 III.7.04 III.7.05 III.7.06 
III.7.07 III.7.08 III.7.09 III.7.10 III.7.11 III.7.12 III.8.01 III.8.02 III.8.03 III.8.04 III.8.05 III.8.06 III.8.07 
III.8.08 III.8.09 III.8.10 III.8.11 III.8.12 III.8.13 III.8.14 III.8.15 III.8.16 III.8.17 III.8.18 III.8.19 III.8.20 
III.8.21 III.8.22 III.8.23 III.9.01 III.9.02 III.9.03 III.9.04 III.9.05 III.9.06 III.9.07 III.9.08 III.9.09 III.9.10 
III.9.11 III.9.12 III.9.13 III.9.14 III.9.15 III.9.16 III.9.17 III.9.18 III.9.19 III.9.20 IV.1.01 IV.1.02 IV.1.03 
IV.1.04 IV.1.05 IV.2.01 IV.2.02 IV.2.03 IV.2.04 IV.2.05 IV.2.06 IV.2.07 IV.2.08 IV.2.09 IV.2.10 IV.2.11 IV.2.12 IV.2.13 
IV.2.14 IV.2.15 IV.3.01 IV.3.02 IV.3.03 IV.3.04 IV.3.05 IV.3.06 IV.3.07 IV.3.08 IV.3.09 IV.4.01 IV.4.02 IV.4.03 IV.4.04 
IV.4.05 IV.4.06 IV.4.07 IV.4.08 IV.4.09 IV.4.10 IV.4.11 IV.4.12 IV.4.13 IV.4.14 IV.4.15 IV.5.01 IV.5.02 IV.5.03 IV.5.04 
IV.5.05 IV.5.06 IV.5.07 IV.6.01 IV.6.02 IV.6.03 IV.6.04 IV.6.05 IV.6.06 IV.6.07 IV.6.08 IV.6.09 IV.6.10 IV.6.11 IV.6.12 
IV.6.13 IV.6.14 IV.6.15 IV.6.16 IV.7.01 IV.7.02 IV.7.03 IV.7.04 IV.7.05 IV.7.06 IV.7.07 IV.7.08 IV.7.09 IV.7.10 IV.7.11 
IV.7.12 IV.7.13 IV.7.14 IV.7.15 IV.7.16 IV.7.17 IV.8.01 IV.8.02 IV.8.03 IV.8.04 IV.8.05 IV.8.06 IV.8.07 IV.8.08 IV.8.09 
IV.8.10 IV.8.11 IV.8.12 IV.8.13 IV.8.14 IV.8.15 IV.8.16 IV.9.01 IV.9.02 IV.9.03 IV.9.04 IV.9.05 IV.9.06 IV.9.07 IV.9.08 
IV.9.09 IV.9.10 IV.9.11 IV.9.12 IV.9.13 IV.9.14 IV.9.15 IV.9.16 IV.9.17 IV.9.18 IV.10.01 IV.10.02 IV.10.03 IV.10.04 
IV.10.05 IV.10.06 IV.10.07 IV.10.08 IV.10.09 IV.10.10 IV.10.11 IV.10.12 IV.10.13 IV.10.14 IV.11.01 IV.11.02 IV.11.03 
IV.11.04 IV.11.05 IV.11.06 IV.11.07 IV.11.08 IV.11.09 IV.11.10 IV.11.11 IV.11.12 IV.11.13 IV.11.14 IV.12.01 IV.12.02 
IV.12.03 IV.12.04 IV.12.05 IV.12.06 IV.12.07 IV.12.08 IV.12.09 IV.12.10 IV.12.11 IV.12.12 IV.12.13 IV.12.14 IV.12.15 
IV.12.16 IV.12.17 IV.13.01 IV.13.02 IV.13.03 IV.13.04 IV.13.05 IV.13.06 IV.13.07 IV.13.08 IV.13.09 IV.13.10 IV.13.11 
IV.13.12 IV.13.13 IV.13.14 IV.14.01 IV.14.02 IV.14.03 IV.14.04 IV.14.05 IV.14.06 IV.14.07 IV.14.08 IV.14.09 IV.14.10 
IV.14.11 IV.14.12 IV.15.01 IV.15.02 IV.15.03 IV.15.04 IV.15.05 IV.15.06 IV.15.07 IV.15.08 IV.15.09 IV.15.10 V.1.01 
V.1.02 V.1.03 V.1.04 V.1.05 V.1.06 V.1.07 V.1.08 V.1.09 V.1.10 V.1.11 V.1.12 V.1.13 V.1.14 V.1.15 V.1.16 V.2.01 V.2.02 
V.2.03 V.2.04 V.2.05 V.2.06 V.3.01 V.3.02 V.3.03 V.3.04 V.3.05 V.3.06 V.3.07 V.3.08 V.3.09 V.3.10 V.3.11 V.3.12 V.3.13 
V.3.14 V.4.01 V.4.02 V.4.03 V.4.04 V.4.05 V.4.06 V.4.07 V.4.08 V.4.09 V.5.01 V.5.02 V.5.03 V.5.04 V.5.05 V.5.06 V.5.07 
V.5.08 V.5.09 V.5.10 V.5.11 V.5.12 V.6.01 V.6.02 V.6.03 V.6.04 V.6.05 V.6.06 V.6.07 V.6.08 V.6.09 V.6.10 V.6.11 V.6.12 
V.6.13 V.6.14 V.7.01 V.7.02 V.7.03 V.7.04 V.7.05 V.7.06 V.7.07 V.7.08 V.7.09 V.7.10 V.8.01 V.8.02 V.8.03 V.8.04 V.8.05 
V.8.06 V.8.07 V.8.08 V.8.09 V.8.10 V.8.11 V.8.12 V.8.13 V.8.14 V.8.15 V.8.16 V.8.17 V.9.01 V.9.02 V.9.03 V.9.04 V.9.16 
V.9.05 V.9.06 V.9.07 V.9.08 V.9.09 V.9.10 V.9.11 V.9.12 V.9.13 V.9.14 V.9.15 V.10.01 V.10.02 V.10.03 V.10.04 V.10.13 
V.10.05 V.10.14 V.10.06 V.10.07 V.10.15 V.10.08 V.10.09 V.10.10 V.10.11 V.10.12 V.11.01 V.11.02 V.11.03 V.11.04 V.11.05 
V.11.06 V.11.07 V.11.08 V.11.09 V.12.01 V.12.02 V.12.03 V.12.14 V.12.04 V.12.12 V.12.05 V.12.06 V.12.07 V.12.13 V.12.08 
V.12.09 V.12.15 V.12.16 V.12.10 V.12.11 V.13.01 V.13.02 V.13.03 V.13.04 V.13.05 V.13.06 V.13.07 V.13.08 V.13.09 V.13.10 
V.13.11 V.13.12 V.14.01 V.14.02 V.14.03 V.14.04 V.14.05 V.14.06 V.14.07 V.14.08 V.15.01 V.15.02 V.15.03 V.15.04 V.15.05 
V.15.06 V.15.07 V.15.08 V.15.09`).trim().split(/\s+/);
  const SERIAL = Object.fromEntries(A.SERIALS.map((id, i) => [id, i + 1]));
  A.serialOf = id => SERIAL[id] || 0;
  A.idOf = n => A.SERIALS[n - 1] || null;

  /* settings vocabularies: append only, like the serials */
  A.LISTS = {
    pace: ['gentle', 'steady', 'intense'],
    hero: ['nova', 'kai', 'rio', 'mei', 'juno', 'ade', 'sol'],
    nemesis: ['crumblewick', 'rex', 'bragg', 'sterling', 'moriarty', 'tempus', 'nullspace', 'rumpel'],
    coins: ['US', 'THB'], units: ['metric', 'imperial'], clock: ['12h', '24h'],
    palette: ['garden', 'surprise', 'ocean', 'sunset', 'lavender', 'sakura', 'desert', 'contrast', 'midnight', 'chalk', 'ember'],
    era: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'],
  };
  const KINDS = ['inferred', 'placed', 'growing', 'planted', 'proven', 'withered'];
  // a prefix code for the kind, shortest for the commonest (the idea behind Morse code and Huffman codes)
  const KCODE = { proven: '0', inferred: '10', planted: '110', growing: '1110', withered: '11110', placed: '111110' };   // 111111 is kept for later
  A.KINDS = KINDS;
  const STEPS = 'abcd';

  /* ---------- Crockford base32 ---------- */
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  A.B32 = B32;
  A.clean = s => String(s || '').toUpperCase().replace(/[\s\-_.,]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  A.group = (code, n = 5) => code.match(new RegExp(`.{1,${n}}`, 'g')).join(' ');

  /* ---------- CRC-32 (polynomial division mod 2) ---------- */
  const CRCT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  A.crc32 = bytes => { let c = 0xFFFFFFFF; for (const b of bytes) c = CRCT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

  /* ---------- bits ---------- */
  function Writer() {
    const bits = [];
    const W = {
      bits,
      put(v, n) { for (let i = n - 1; i >= 0; i--) bits.push(Math.floor(v / 2 ** i) % 2); },
      gamma(v) { if (!(v >= 1) || v !== Math.floor(v)) throw new Error('gamma needs a whole number ≥ 1'); const n = Math.floor(Math.log2(v)); W.put(0, n); W.put(v, n + 1); },
      gz(v) { W.gamma((v >= 0 ? 2 * v : -2 * v - 1) + 1); },
      enumv(list, v) { const i = list.indexOf(v); W.gamma(i + 2); },   // 1 = not set
    };
    return W;
  }
  function Reader(bits, end) {
    let p = 0;
    const R = {
      get(n) { if (p + n > end) throw new AcornError('short', 'The code stops too early.'); let v = 0; for (let i = 0; i < n; i++) v = v * 2 + bits[p++]; return v; },
      gamma() { let z = 0; while (true) { if (p >= end) throw new AcornError('short', 'The code stops too early.'); if (bits[p]) break; z++; p++; if (z > 40) throw new AcornError('bad', 'Not an Acorn.'); } return R.get(z + 1); },
      gz() { const u = R.gamma() - 1; return u % 2 ? -(u + 1) / 2 : u / 2; },
      enumv(list) { const i = R.gamma() - 2; return i < 0 ? undefined : list[i]; },
      pos: () => p,
      seek(q) { p = q; },
    };
    return R;
  }
  function AcornError(code, message) { const e = new Error(message); e.acorn = code; return e; }
  A.AcornError = AcornError;

  /* ---------- the activity journal ----------
     acorn.journal = { days: { day: { min, q, right, …, skills: [serial, …] } } }   (fields as A.JOURNAL_FIELDS) */
  A.journalDays = (acorn) => Object.keys((acorn.journal || {}).days || {}).map(Number)
    .filter(d => d <= acorn.day && d > acorn.day - A.JOURNAL_DAYS).sort((a, b) => b - a);
  function journalBits(acorn) {
    const days = A.journalDays(acorn); if (!days.length) return null;
    const W = Writer(), F = A.JOURNAL_FIELDS;
    W.gamma(F.length + 1); W.gamma(days.length + 1);
    let prev = acorn.day + 1;
    for (const d of days) {
      const e = acorn.journal.days[d];
      W.gamma(prev - d); prev = d;
      for (const f of F) W.gamma(Math.max(0, Math.round(e[f] || 0)) + 1);
      const sk = [...new Set((e.skills || []).map(Number).filter(n => n >= 1))].sort((a, b) => a - b);
      W.gamma(sk.length + 1); let p = 0; for (const n of sk) { W.gamma(n - p); p = n; }
    }
    return W.bits.join('');
  }
  function readJournal(R, acorn) {
    const nf = R.gamma() - 1, nd = R.gamma() - 1, F = A.JOURNAL_FIELDS, days = {};
    let prev = acorn.day + 1;
    for (let i = 0; i < nd; i++) {
      const d = prev - R.gamma(); prev = d;
      const e = {};
      for (let j = 0; j < nf; j++) { const v = R.gamma() - 1; if (j < F.length) e[F[j]] = v; }
      for (let j = nf; j < F.length; j++) e[F[j]] = 0;
      const k = R.gamma() - 1; e.skills = []; let p = 0; for (let j = 0; j < k; j++) { p += R.gamma(); e.skills.push(p); }
      days[d] = e;
    }
    return { days };
  }

  /* ---------- encode ----------
     acorn = { day, era?, settings?: {pace, dial, brave, hero, nemesis, coins, units, clock, stories, drill, specials, palette},
               eras?: {I: {placed, start}}  (start is a unit number like 5 for II.5),
               skills: { serial: rec } }
     rec = { kind, top?, sg?, due? (day), cur?, ck?, wstep?, wday? (day), bv?: {e, f} }            */
  A.encode = function (acorn) {
    const W = Writer(), L = A.LISTS;
    W.put(A.VERSION, 4); W.put(Math.max(0, Math.min(65535, acorn.day)), 16);
    const st = acorn.settings;
    W.put(st ? 1 : 0, 1);
    if (st) {
      W.enumv(L.pace, st.pace); W.put(Math.max(1, Math.min(10, st.dial || 5)), 4); W.put(st.brave ? 1 : 0, 1);
      W.enumv(L.hero, st.hero); W.enumv(L.nemesis, st.nemesis); W.enumv(L.coins, st.coins); W.enumv(L.units, st.units); W.enumv(L.clock, st.clock);
      W.put(st.stories === 'off' ? 0 : 1, 1); W.put(st.drill === 'off' ? 0 : 1, 1); W.put(st.specials === 'off' ? 0 : 1, 1);
      W.enumv(L.palette, st.palette); W.enumv(L.era, acorn.era);
    }
    const eras = L.era.map(k => (acorn.eras || {})[k] || {});
    let ne = eras.length; while (ne && !eras[ne - 1].placed && !eras[ne - 1].start) ne--;
    W.gamma(ne + 1);
    for (let i = 0; i < ne; i++) { W.put(eras[i].placed ? 1 : 0, 1); W.gamma((eras[i].start || 0) + 1); }
    const serials = Object.keys(acorn.skills || {}).map(Number).filter(n => n >= 1).sort((a, b) => a - b);
    let prev = 0, prevDue = acorn.day;
    let count = 0;
    const recs = [];   // [serial, rec, run]: inferred and placed leaves come in runs, so a run is written once
    for (let i = 0; i < serials.length; i++) {
      const n = serials[i], r = acorn.skills[n];
      if (!KCODE[r.kind]) throw new Error('unknown kind ' + r.kind);
      let run = 0;
      if (r.kind === 'inferred' || r.kind === 'placed') while (i + 1 < serials.length && serials[i + 1] === n + run + 1 && acorn.skills[serials[i + 1]].kind === r.kind) { run++; i++; }
      recs.push([n, r, run]);
    }
    W.gamma(recs.length + 1);
    for (const [n, r, run] of recs) {
      W.gamma(n - prev); prev = n + run;
      for (const b of KCODE[r.kind]) W.put(+b, 1);
      if (r.kind === 'inferred' || r.kind === 'placed') W.gamma(run + 1);
      const cs = () => { W.put(STEPS.indexOf(r.cur || 'a'), 2); W.put(Math.min(3, r.ck || 0), 2); };
      if (r.kind === 'growing') cs();
      else if (r.kind === 'planted') { W.put(STEPS.indexOf(r.top), 2); W.put(r.sg || 0, 3); W.gz(r.due - prevDue); prevDue = r.due; cs(); }
      else if (r.kind === 'proven') { W.put(r.sg || 0, 3); W.gz(r.due - prevDue); prevDue = r.due; const b = r.bv || {}; if (b.e || b.f) { W.put(1, 1); W.put(b.e ? 1 : 0, 1); W.put(b.f ? 1 : 0, 1); } else W.put(0, 1); }
      else if (r.kind === 'withered') { W.put(STEPS.indexOf(r.wstep), 2); W.gz(acorn.day - r.wday); cs(); }
    }
    const sections = [];
    const jb = journalBits(acorn); if (jb) sections.push({ type: 1, bits: jb });
    for (const x of acorn.extra || []) if (x.type !== 1) sections.push(x);   // sections this app doesn't know, kept as they came
    W.gamma(sections.length + 1);
    for (const x of sections) { W.gamma(x.type); W.gamma(x.bits.length + 1); for (const b of x.bits) W.put(+b, 1); }
    while (W.bits.length % 8) W.bits.push(0);
    const bytes = []; for (let i = 0; i < W.bits.length; i += 8) bytes.push(parseInt(W.bits.slice(i, i + 8).join(''), 2));
    W.put(A.crc32(bytes), 32);
    while (W.bits.length % 5) W.bits.push(0);
    let out = ''; for (let i = 0; i < W.bits.length; i += 5) out += B32[parseInt(W.bits.slice(i, i + 5).join(''), 2)];
    return out;
  };

  /* ---------- decode ---------- */
  A.decode = function (text) {
    const code = A.clean(text);
    if (!code) throw AcornError('empty', 'There is no code to read yet.');
    if (/[^0-9A-Z]/.test(code) || /U/.test(code)) throw AcornError('chars', 'An Acorn only uses the digits 0–9 and the letters A–Z (never U).');
    const bits = [];
    for (const ch of code) { const v = B32.indexOf(ch); for (let i = 4; i >= 0; i--) bits.push((v >> i) & 1); }
    // the seal sits on the last whole byte boundary before the base32 padding (padding is under 5 bits)
    const total = bits.length;
    let found = -1;
    for (let pad = 0; pad < 5; pad++) {
      const L = total - pad; if (L < 32 + 8 || (L - 32) % 8) continue;
      if (bits.slice(L).some(b => b)) continue;
      const body = bits.slice(0, L - 32), bytes = [];
      for (let i = 0; i < body.length; i += 8) bytes.push(parseInt(body.slice(i, i + 8).join(''), 2));
      let seal = 0; for (let i = L - 32; i < L; i++) seal = seal * 2 + bits[i];
      if (A.crc32(bytes) === seal) { found = L - 32; break; }
    }
    if (found < 0) throw AcornError('seal', 'This code has a typo somewhere. Check each group and try again.');
    const R = Reader(bits, found), Ls = A.LISTS;
    const v = R.get(4);
    if (v < 1 || v > A.VERSION) throw AcornError('version', v > A.VERSION ? 'This Acorn comes from a newer Mathera. Update the app to load it.' : 'Not an Acorn.');
    const acorn = { v, day: R.get(16), skills: {} };
    if (R.get(1)) {
      const s = {};
      s.pace = R.enumv(Ls.pace); s.dial = R.get(4); s.brave = !!R.get(1);
      s.hero = R.enumv(Ls.hero); s.nemesis = R.enumv(Ls.nemesis); s.coins = R.enumv(Ls.coins); s.units = R.enumv(Ls.units); s.clock = R.enumv(Ls.clock);
      s.stories = R.get(1) ? 'on' : 'off'; s.drill = R.get(1) ? 'on' : 'off'; s.specials = R.get(1) ? 'on' : 'off';
      s.palette = R.enumv(Ls.palette); acorn.era = R.enumv(Ls.era);
      acorn.settings = s;
    }
    const ne = R.gamma() - 1; acorn.eras = {};
    for (let i = 0; i < ne; i++) { const placed = !!R.get(1), start = R.gamma() - 1; if (Ls.era[i]) acorn.eras[Ls.era[i]] = { placed, start }; }
    const ns = R.gamma() - 1;
    let prev = 0, prevDue = acorn.day;
    const KREAD = Object.fromEntries(Object.entries(KCODE).map(([k, c]) => [c, k]));
    for (let i = 0; i < ns; i++) {
      const n = prev + R.gamma(); prev = n;
      let c = '', kind; while (!(kind = KREAD[c])) { if (c.length >= 6) throw AcornError('bad', 'Not an Acorn.'); c += R.get(1); }
      const r = { kind };
      if (kind === 'inferred' || kind === 'placed') { const run = R.gamma() - 1; for (let j = 1; j <= run; j++) acorn.skills[n + j] = { kind }; prev = n + run; }
      const cs = () => { r.cur = STEPS[R.get(2)]; r.ck = R.get(2); };
      if (kind === 'growing') cs();
      else if (kind === 'planted') { r.top = STEPS[R.get(2)]; r.sg = R.get(3); r.due = prevDue + R.gz(); prevDue = r.due; cs(); }
      else if (kind === 'proven') { r.top = 'd'; r.sg = R.get(3); r.due = prevDue + R.gz(); prevDue = r.due; if (R.get(1)) { const e = !!R.get(1), f = !!R.get(1); r.bv = { e, f }; } }
      else if (kind === 'withered') { r.wstep = STEPS[R.get(2)]; r.wday = acorn.day - R.gz(); cs(); }
      acorn.skills[n] = r;
    }
    if (v >= 2) {
      const nsec = R.gamma() - 1;
      for (let i = 0; i < nsec; i++) {
        const type = R.gamma(), len = R.gamma() - 1, start = R.pos();
        if (start + len > found) throw AcornError('bad', 'Not an Acorn.');
        if (type === 1) { const SR = Reader(bits, start + len); SR.seek(start); acorn.journal = readJournal(SR, acorn); if (SR.pos() !== start + len) throw AcornError('bad', 'Not an Acorn.'); }
        else (acorn.extra || (acorn.extra = [])).push({ type, bits: bits.slice(start, start + len).join('') });
        R.seek(start + len);
      }
    }
    if (bits.slice(R.pos(), found).some(b => b)) throw AcornError('bad', 'Not an Acorn.');
    return acorn;
  };

  /* ---------- merge: grafting never loses anything ----------
     Each skill keeps whichever record is further along. Two records at the same step keep the later watering.
     Brave and Legend badges are kept from either side. This gives the same answer in any order, so devices agree. */
  A.rank = r => {
    if (!r) return 0;
    switch (r.kind) {
      case 'inferred': return 1; case 'placed': return 2; case 'withered': return 3;
      case 'growing': return 4 + (STEPS.indexOf(r.cur) * 4 + (r.ck || 0)) / 16;
      case 'planted': return 5 + STEPS.indexOf(r.top);
      case 'proven': return 8;
    }
    return 0;
  };
  A.pick = function (a, b) {
    if (!a) return b; if (!b) return a;
    const ra = A.rank(a), rb = A.rank(b);
    const key = r => [r.due || r.wday || 0, r.sg || 0, r.ck || 0, JSON.stringify(r)];
    const later = (x, y) => { const p = key(x), q = key(y); for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) return p[i] > q[i]; return false; };
    let w = ra > rb ? a : rb > ra ? b : later(b, a) ? b : a;   // same step: the later watering wins (ties broken the same way on every device)
    const ba = a.bv || {}, bb = b.bv || {};
    if (ba.e || ba.f || bb.e || bb.f) w = Object.assign({}, w, { bv: { e: !!(ba.e || bb.e), f: !!(ba.f || bb.f) } });
    return w;
  };
  A.merge = function (a, b) {
    const out = { day: Math.max(a.day, b.day), skills: {}, eras: {} };
    for (const n of new Set([...Object.keys(a.skills), ...Object.keys(b.skills)])) out.skills[n] = A.pick(a.skills[n], b.skills[n]);
    for (const k of A.LISTS.era) { const x = (a.eras || {})[k] || {}, y = (b.eras || {})[k] || {}; if (x.placed || y.placed || x.start || y.start) out.eras[k] = { placed: !!(x.placed || y.placed), start: x.start || y.start || 0 }; }
    const newer = b.day > a.day ? b : a;
    if (newer.settings || a.settings || b.settings) { out.settings = newer.settings || a.settings || b.settings; out.era = newer.era || a.era || b.era; }
    const mj = A.mergeJournal(a.journal, b.journal); if (mj) out.journal = mj;
    const ex = newer.extra || (newer === a ? b : a).extra; if (ex) out.extra = ex;
    return out;
  };

  /* ---------- the activity journal: writing and reading it ----------
     All pure: every function takes the time in ms. J = { days: {day: entry}, live: {...} }; only days go in the Acorn. */
  A.journalEntry = () => { const e = {}; for (const f of A.JOURNAL_FIELDS) e[f] = 0; e.skills = []; return e; };
  A.SESSION_GAP = 10;     // minutes without an answer that end a session
  A.MAX_ANSWER = 120;     // seconds: a longer pause on one question counts as 2 minutes of study
  // one answered question. ev = { serial, ok, secs, hint, choice }
  A.journalLog = function (J, ev, ms) {
    J.days = J.days || {}; const L = J.live || (J.live = {});
    const d = A.dayOf(ms), e = J.days[d] || (J.days[d] = A.journalEntry());
    const gap = L.last ? (ms - L.last) / 60e3 : Infinity;
    if (gap >= A.SESSION_GAP) {
      e.sessions++;
      if (L.last && L.lastOk === false && J.days[L.lastDay]) J.days[L.lastDay].quitMiss++;   // the last session ended on a miss
    }
    const secs = Math.max(0, Math.min(A.MAX_ANSWER, +ev.secs || 0));
    e.min = Math.round((e.min + secs / 60) * 100) / 100;
    e.q++; if (ev.ok) e.right++;
    if (!ev.ok && secs < 2) e.fastWrong++;
    if (ev.hint) e.hints++;
    if (ev.choice) { e.choiceQ++; if (ev.ok) e.choiceRight++; }
    if (ev.serial && !e.skills.includes(ev.serial) && e.skills.length < 64) e.skills.push(ev.serial);
    L.last = ms; L.lastOk = !!ev.ok; L.lastDay = d;
    return e;
  };
  // minutes a study timer ran with no answers (for a Pomodoro timer)
  A.journalIdle = function (J, minutes, ms) { J.days = J.days || {}; const d = A.dayOf(ms), e = J.days[d] || (J.days[d] = A.journalEntry()); e.idle += Math.max(0, minutes); return e; };
  A.journalTrim = function (J, today) { for (const d of Object.keys(J.days || {})) if (+d <= today - A.JOURNAL_DAYS || +d > today) delete J.days[d]; return J; };
  // a day studied on two devices can't be told apart from the same day saved twice, so each day keeps the busier
  // record: never double-counts, may under-count a day split across devices. Same answer in any order.
  A.mergeJournal = function (ja, jb) {
    const x = (ja || {}).days || {}, y = (jb || {}).days || {}, keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    if (!keys.size) return null;
    const out = { days: {} }, key = e => [e.q || 0, e.min || 0, JSON.stringify(e)];
    for (const d of keys) {
      const p = x[d], q = y[d]; if (!p || !q) { out.days[d] = p || q; continue; }
      const kp = key(p), kq = key(q); let w = p;
      for (let i = 0; i < kp.length; i++) if (kp[i] !== kq[i]) { w = kp[i] > kq[i] ? p : q; break; }
      out.days[d] = w;
    }
    return out;
  };
  // totals for the n days ending on toDay
  A.journalSum = function (J, toDay, n = 7) {
    const t = A.journalEntry(); t.days = 0; const sk = new Set();
    for (const [d, e] of Object.entries((J || {}).days || {})) {
      if (+d > toDay || +d <= toDay - n) continue;
      if (e.q || e.min) t.days++;
      for (const f of A.JOURNAL_FIELDS) t[f] += e[f] || 0;
      (e.skills || []).forEach(s => sk.add(s));
    }
    t.skills = [...sk].sort((a, b) => a - b); t.min = Math.round(t.min);
    return t;
  };
  /* study flags: when the data says the learner isn't really studying. Thresholds are first guesses, to tune.
     skills = acorn.skills (serial → record), used to tell new work from re-watering. Returns facts; the app words them. */
  A.FLAG = { fastWrong: 5, guessQ: 10, guessRate: 0.35, idle: 5, farmQ: 20, hintQ: 10, hintRate: 0.5, quitMiss: 3 };
  A.studyFlags = function (J, skills, toDay, n = 7) {
    const F = A.FLAG, out = [], days = (J || {}).days || {};
    let mash = null;
    for (const [d, e] of Object.entries(days)) if (+d <= toDay && +d > toDay - n && (e.fastWrong || 0) >= F.fastWrong && (!mash || e.fastWrong > mash.n)) mash = { day: +d, n: e.fastWrong, q: e.q };
    if (mash) out.push({ flag: 'mashing', day: mash.day, n: mash.n, q: mash.q });
    const t = A.journalSum(J, toDay, n);
    if (t.choiceQ >= F.guessQ && t.choiceRight / t.choiceQ <= F.guessRate) out.push({ flag: 'guessing', n: t.choiceQ, right: t.choiceRight });
    if (t.idle >= F.idle) out.push({ flag: 'idle', min: t.idle });
    const newLeft = A.SERIALS.some((_, i) => { const r = (skills || {})[i + 1]; return !r || r.kind !== 'proven'; });   // nothing new left to try = not farming
    if (newLeft && t.q >= F.farmQ && t.skills.length && t.skills.every(s => ((skills || {})[s] || {}).kind === 'proven')) out.push({ flag: 'farming', q: t.q, skills: t.skills.length });
    if (t.q >= F.hintQ && t.hints / t.q > F.hintRate) out.push({ flag: 'hints', n: t.hints, q: t.q });
    if (t.quitMiss >= F.quitMiss) out.push({ flag: 'quitMiss', n: t.quitMiss });
    return out;
  };

  /* ---------- the mastery.js shape ----------
     P = { skills: {id: {top, sg, due, cur, miss, inf, wilt: {step, at}, bv: {e, f}}}, steps: {'id.k': {n, k, st}} } */
  const up = s => STEPS[Math.min(3, STEPS.indexOf(s) + 1)];
  A.fromMastery = function (P, id) {
    const s = P.skills[id] || {}, st = k => P.steps[id + '.' + k] || {};
    let r = null;
    if (s.wilt) { const cur = s.cur || s.wilt.step; r = { kind: 'withered', wstep: s.wilt.step, wday: A.dayOf(s.wilt.at), cur, ck: st(cur).k || 0 }; }
    else if (s.top === 'd') r = { kind: 'proven', top: 'd', sg: s.sg || 0, due: A.dayOf(s.due) };
    else if (s.top) { const cur = s.cur || up(s.top); r = { kind: 'planted', top: s.top, sg: s.sg || 0, due: A.dayOf(s.due), cur, ck: st(cur).k || 0 }; }
    else if (s.inf) r = { kind: s.inf === 2 ? 'placed' : 'inferred' };
    else {
      const worked = [...STEPS].filter(k => st(k).n);
      if (worked.length || s.cur) { const cur = s.cur || worked[worked.length - 1]; r = { kind: 'growing', cur, ck: st(cur).k || 0 }; }
    }
    const b = s.bv || {};
    if (r && r.kind === 'proven' && (b.e || b.f)) r.bv = { e: !!b.e, f: !!b.f };
    return r;
  };
  // write a record into P, replacing whatever was there for that skill
  A.toMastery = function (r, P, id, now) {
    for (const k of STEPS + 'ef') delete P.steps[id + '.' + k];
    delete P.skills[id];
    if (!r) return;
    const s = P.skills[id] = {}, ST = k => P.steps[id + '.' + k] || (P.steps[id + '.' + k] = {});
    const setCur = () => { s.cur = r.cur; if (r.ck) { ST(r.cur).k = r.ck; ST(r.cur).n = r.ck; } };
    if (r.kind === 'inferred') s.inf = 1;
    else if (r.kind === 'placed') s.inf = 2;
    else if (r.kind === 'growing') { setCur(); ST(r.cur).n = Math.max(1, r.ck || 0); }
    else if (r.kind === 'planted' || r.kind === 'proven') {
      const top = r.kind === 'proven' ? 'd' : r.top;
      for (const k of STEPS.slice(0, STEPS.indexOf(top) + 1)) { ST(k).st = 'p'; ST(k).n = ST(k).n || 1; }
      s.top = top; s.sg = r.sg || 0; s.due = A.msOf(r.due); s.miss = 0;
      if (top === 'd') s.cur = 'd'; else setCur();
    } else if (r.kind === 'withered') {
      for (const k of STEPS.slice(0, STEPS.indexOf(r.wstep) + 1)) { ST(k).st = 's'; ST(k).k = 0; }
      s.wilt = { step: r.wstep, at: A.msOf(r.wday) }; setCur();
    }
    if (r.bv && (r.bv.e || r.bv.f)) { s.bv = {}; if (r.bv.e) s.bv.e = now; if (r.bv.f) s.bv.f = now; }
  };

  /* summary for previews: how many leaves of each kind */
  A.tally = function (acorn) {
    const c = { proven: 0, planted: 0, growing: 0, withered: 0, inferred: 0, placed: 0, brave: 0, legend: 0 };
    for (const r of Object.values(acorn.skills)) { c[r.kind]++; if (r.bv && r.bv.e) c.brave++; if (r.bv && r.bv.f) c.legend++; }
    return c;
  };

  G.Acorn = A;
  if (typeof module !== 'undefined') module.exports = A;
})(typeof window !== 'undefined' ? window : globalThis);
