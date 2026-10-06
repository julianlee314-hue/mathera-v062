/* Mathera · mastery-lite (beta rules, placeholder numbers until R1)
   Pure logic: no DOM, no clock. Every function takes `now` (ms) so the rules can be simulated.

   A skill is a leaf; its steps a–d are sprouts.
   - 3 correct in a row at a step plants it, and planting a step plants every easier step too (d plants a–c).
   - Only the leaf's top planted step carries a watering schedule: stage 0…6 → 1d, 3d, 1w, 2w, 1m, 3m, 6m at dial 5.
   - Dial 1–10 multiplies every interval (and so the wilting grace) by 1.5^(5 − dial); intervals are capped at 1 year.
   - Thirsty: due for review. Withered: overdue by more than its own interval → the leaf drops back to seed.
   - INTERVENTION: at most 5 withered leaves at a time. Each starts one step below where it was; a right answer climbs one step,
     a miss slides one step easier without losing the streak. Saved = 3 right, the last one at the original step.
*/
(function (G) {
  const MM = {};
  const DAY = 864e5, STEPS = 'abcd';
  const I = [1, 3, 7, 14, 30, 90, 180];          // days at dial 5
  const MAXSTAGE = I.length - 1, CAP = 365 * DAY;
  const PACE = {
    gentle:  { name: 'Gentle',  start: 'a', slide: 1, newShare: 0.4, active: 2, hint: true,  desc: 'Starts every skill at step a. A miss slides you one step easier. More review, less new.' },
    steady:  { name: 'Steady',  start: 'b', slide: 2, newShare: 0.6, active: 3, hint: false, desc: 'Starts at step b. Two misses in a row slide you one step easier. A balance of new and review.' },
    intense: { name: 'Intense', start: 'c', slide: 2, newShare: 0.8, active: 3, hint: false, desc: 'Starts at step c, so three right in a row plants a, b and c at once. Mostly new material.' },
  };
  const IV_CAP = 5, IV_MAXTRIES = 8, IV_EVERY = 12, CONFIRM_EVERY = 5, RECENT = 3;
  MM.DAY = DAY; MM.I = I; MM.PACE = PACE; MM.IV_CAP = IV_CAP; MM.STEPS = STEPS;
  /* Brave steps (the "master quest"): e ★ Brave and f ★★ Legend. Optional, opened by proving the skill (d planted),
     earned with BRAVE_RUN right in a row, never wither, never block progress. Skills that have them are listed in P.braveIds. */
  const BRAVE = 'ef', BRAVE_RUN = 2, BRAVE_EVERY = 4; MM.BRAVE = BRAVE; MM.BRAVE_RUN = BRAVE_RUN;
  MM.hasBrave = (P, id) => !!(P.braveIds && P.braveIds.has(id));
  MM.braveOpen = (P, id) => MM.hasBrave(P, id) && MM.proven(P, id);
  MM.braveEarned = (P, id) => { const b = (P.skills[id] || {}).bv || {}; return { e: !!b.e, f: !!b.f }; };
  MM.braveNext = (P, id) => MM.braveEarned(P, id).e ? 'f' : 'e';
  MM.braveCounts = P => { const c = { e: 0, f: 0 }; for (const id of P.order) { const b = (P.skills[id] || {}).bv || {}; if (b.e) c.e++; if (b.f) c.f++; } return c; };

  const si = s => STEPS.indexOf(s);
  const up = s => STEPS[Math.min(3, si(s) + 1)];
  const down = s => STEPS[Math.max(0, si(s) - 1)];
  MM.factor = dial => Math.pow(1.5, 5 - dial);
  MM.interval = (stage, dial) => Math.min(CAP, I[Math.min(stage, MAXSTAGE)] * DAY * MM.factor(dial));
  // wilting grace: the leaf's own interval, but never shorter than dial 5's (a frequent dial means more watering,
  // not faster dying) and never under GRACE_MIN, so a weekend away can't wither a leaf planted on Friday
  const GRACE_MIN = 3 * DAY;
  MM.grace = (stage, dial) => Math.max(GRACE_MIN, MM.interval(stage, dial), MM.interval(stage, 5));
  MM.GRACE_MIN = GRACE_MIN;

  /* ---------- state ---------- */
  // P = { order:[skillIds], settings:{pace, dial, start}, skills:{id:{…}}, steps:{'id.k':{…}} }
  MM.create = function (order, settings) {
    return { order: order.slice(), settings: Object.assign({ pace: 'steady', dial: 5, start: null }, settings || {}), skills: {}, steps: {} };
  };
  const SK = (P, id) => P.skills[id] || (P.skills[id] = {});
  const ST = (P, id, k) => P.steps[id + '.' + k] || (P.steps[id + '.' + k] = {});
  MM.skillRec = SK; MM.stepRec = ST;
  const pace = P => PACE[P.settings.pace] || PACE.steady;
  const unitOf = id => id.split('.').slice(0, 2).join('.');
  MM.unitOf = unitOf;

  /* where learning on this skill happens next */
  MM.curStep = function (P, id) {
    const s = SK(P, id);
    if (s.cur) return s.cur;
    if (s.top) return s.top === 'd' ? 'd' : up(s.top);
    return pace(P).start;
  };

  /* leaf state for the tree */
  MM.state = function (P, id, now) {
    const s = P.skills[id] || {};
    if (s.wilt) return 'withered';
    if (s.top) {
      if (now >= s.due) return 'thirsty';
      return s.top === 'd' ? 'proven' : 'planted';
    }
    if (s.inf) return 'inferred';
    for (const k of STEPS) { const r = P.steps[id + '.' + k]; if (r && r.n) return 'growing'; }
    return 'seed';
  };
  MM.proven = (P, id) => (P.skills[id] || {}).top === 'd';
  // how grown a leaf is (0…1), for drawing
  MM.growth = function (P, id) {
    const s = P.skills[id] || {};
    if (s.top) return 0.55 + 0.15 * si(s.top) + 0.05 * Math.min(3, s.sg || 0) / 3;
    let best = 0;
    for (const k of STEPS) { const r = P.steps[id + '.' + k]; if (r && r.n) best = Math.max(best, (si(k) + Math.min(3, r.k || 0) / 3) / 4); }
    return 0.2 + 0.35 * best;
  };

  /* ---------- placement-lite ---------- */
  MM.place = function (P, startUnit) {
    P.settings.start = startUnit;
    const cut = P.order.findIndex(id => unitOf(id) === startUnit);
    P.order.forEach((id, i) => { const s = SK(P, id); if (i < cut && !s.top && !s.wilt) s.inf = 1; else if (i >= cut) delete s.inf; });
  };

  /* ---------- time passes ---------- */
  MM.tick = function (P, now) {
    const withered = [];
    for (const id of P.order) {
      const s = P.skills[id]; if (!s || !s.top) continue;
      if (now > s.due + MM.grace(s.sg || 0, P.settings.dial)) {
        const was = s.top;
        for (let i = 0; i <= si(was); i++) { const r = ST(P, id, STEPS[i]); r.st = 's'; r.k = 0; }
        s.wilt = { step: was, at: now }; s.cur = was;
        delete s.top; delete s.sg; delete s.due;
        withered.push(id);
      }
    }
    return withered;
  };
  MM.withered = P => P.order.filter(id => P.skills[id] && P.skills[id].wilt).sort((a, b) => P.skills[a].wilt.at - P.skills[b].wilt.at);
  MM.thirsty = (P, now) => P.order.filter(id => { const s = P.skills[id]; return s && s.top && now >= s.due; });

  function plant(P, id, k, now, stage) {
    const s = SK(P, id);
    for (let i = 0; i <= si(k); i++) { const r = ST(P, id, STEPS[i]); r.st = 'p'; }
    if (!s.top || si(k) >= si(s.top)) { s.top = k; s.sg = stage || 0; s.due = now + MM.interval(s.sg, P.settings.dial); }
    s.cur = s.top === 'd' ? 'd' : up(s.top); s.miss = 0;
    delete s.inf; delete s.wilt;
  }

  /* ---------- sessions ---------- */
  MM.session = () => ({ n: 0, newN: 0, revN: 0, recent: [], seen: {}, iv: null, sinceIv: 0, saved: [], lost: [] });

  MM.startIntervention = function (P, S, now, only) {
    const list = only ? [only] : MM.withered(P).slice(0, IV_CAP);
    if (!list.length) return null;
    S.iv = { leaves: list.map(id => { const w = P.skills[id].wilt; return { id, orig: w.step, step: down(w.step), k: 0, tries: 0, done: null }; }), turn: 0 };
    S.sinceIv = 0;
    return S.iv;
  };
  MM.ivActive = S => !!(S.iv && S.iv.leaves.some(l => !l.done));

  function stamp(S, id) { S.n++; S.seen[id] = S.n; S.recent.push(id); if (S.recent.length > RECENT) S.recent.shift(); }

  /* pick the next question: {id, step, mode}  mode ∈ learn | review | confirm | iv | practice */
  MM.next = function (P, S, now, focus) {
    if (MM.ivActive(S)) {
      const open = S.iv.leaves.filter(l => !l.done);
      const L = open[S.iv.turn++ % open.length];
      return { id: L.id, step: L.step, mode: 'iv' };
    }
    if (focus) {
      const s = P.skills[focus] || {};
      if (s.top && now >= s.due) return { id: focus, step: s.top, mode: 'review' };
      if (s.top === 'd') return MM.braveOpen(P, focus) ? { id: focus, step: MM.braveNext(P, focus), mode: 'brave' } : { id: focus, step: 'd', mode: 'practice' };
      return { id: focus, step: MM.curStep(P, focus), mode: 'learn' };
    }
    const p = pace(P);
    const due = MM.thirsty(P, now).filter(id => !S.recent.includes(id))
      .sort((a, b) => { const A = P.skills[a], B = P.skills[b]; return (now - B.due) / MM.interval(B.sg, P.settings.dial) - (now - A.due) / MM.interval(A.sg, P.settings.dial); });
    const inferred = P.order.filter(id => (P.skills[id] || {}).inf);
    if (inferred.length && S.n % CONFIRM_EVERY === CONFIRM_EVERY - 1) {
      // light checks of placed, then inferred leaves: nearest to the start unit first
      const placed = inferred.filter(id => P.skills[id].inf === 2), pickC = placed.length ? placed : inferred;
      return { id: pickC[pickC.length - 1], step: 'd', mode: 'confirm' };
    }
    if (P.settings.brave && S.n % BRAVE_EVERY === BRAVE_EVERY - 1) {          // Brave mode: every 4th question is a master-quest step
      const open = P.order.filter(id => MM.braveOpen(P, id) && !S.recent.includes(id));
      const fresh = open.filter(id => !MM.braveEarned(P, id).f);
      const pool = fresh.length ? fresh : open;
      if (pool.length) { const id = pool.slice().sort((a, b) => (S.seen[a] || 0) - (S.seen[b] || 0))[0]; return { id, step: fresh.length ? MM.braveNext(P, id) : 'f', mode: 'brave' }; }
    }
    const path = P.order.filter(id => { const s = P.skills[id] || {}; return s.top !== 'd' && !s.inf && !s.wilt; });
    const active = path.slice(0, p.active);
    let pickNew = null;
    if (active.length) {
      const cands = active.filter(id => !S.recent.slice(-1).includes(id));
      const pool = cands.length ? cands : active;
      pickNew = pool.slice().sort((a, b) => (S.seen[a] || 0) - (S.seen[b] || 0))[0];
    }
    const share = S.newN / Math.max(1, S.newN + S.revN);
    // a leaf more than halfway to wilting jumps the queue whatever the pace
    const urgent = due.find(id => { const s = P.skills[id]; return now - s.due > 0.5 * MM.grace(s.sg || 0, P.settings.dial); });
    if (urgent) return { id: urgent, step: P.skills[urgent].top, mode: 'review' };
    if (due.length && (!pickNew || share >= p.newShare)) return { id: due[0], step: P.skills[due[0]].top, mode: 'review' };
    if (pickNew) return { id: pickNew, step: MM.curStep(P, pickNew), mode: 'learn' };
    // everything proven and watered: free practice on the soonest-due leaf
    const any = P.order.filter(id => (P.skills[id] || {}).top).sort((a, b) => P.skills[a].due - P.skills[b].due)[0] || P.order[0];
    return { id: any, step: (P.skills[any] || {}).top || 'a', mode: 'practice' };
  };

  /* record an answer; returns a list of events for the UI */
  MM.answer = function (P, S, q, ok, secs, now) {
    const s = SK(P, q.id), r = ST(P, q.id, q.step), ev = [];
    r.n = (r.n || 0) + 1; if (ok) r.r = (r.r || 0) + 1; r.sec = Math.round(((r.sec || 0) + Math.min(300, Math.max(0, secs || 0))) * 10) / 10; r.last = now;
    s.last = now;
    stamp(S, q.id);
    if (q.mode === 'iv') {
      const L = S.iv.leaves.find(l => l.id === q.id && !l.done);
      L.tries++;
      if (ok) {
        L.k++;
        if (L.k >= 3 && L.step === L.orig) { plant(P, q.id, L.orig, now, 0); L.done = 'saved'; S.saved.push(q.id); ev.push({ type: 'saved', id: q.id }); }
        else L.step = STEPS[Math.min(si(L.orig), si(L.step) + 1)];
      } else { const was = L.step; L.step = down(L.step); if (L.step !== was) ev.push({ type: 'eased', step: L.step }); else ev.push({ type: 'kept' }); }
      if (!L.done && L.tries >= IV_MAXTRIES) { L.done = 'resting'; delete s.wilt; s.cur = L.step; S.lost.push(q.id); ev.push({ type: 'resting', id: q.id }); }
      if (!MM.ivActive(S)) ev.push({ type: 'ivDone', saved: S.iv.leaves.filter(l => l.done === 'saved').length, total: S.iv.leaves.length });
      return ev;
    }
    S.sinceIv++;
    if (q.mode === 'review') {
      S.revN++;
      if (ok) { s.sg = Math.min(MAXSTAGE, (s.sg || 0) + 1); s.due = now + MM.interval(s.sg, P.settings.dial); ev.push({ type: 'watered', stage: s.sg, next: s.due }); }
      else { s.sg = Math.max(0, (s.sg || 0) - 2); s.due = now; ev.push({ type: 'dry', stage: s.sg }); }
      return ev;
    }
    if (q.mode === 'confirm') {
      S.revN++;
      // placement never proves: a right answer only moves the leaf onto the path as growing,
      // at step d for a Placed leaf (this answer counts as the first of three) and at step c for an Inferred one
      if (ok) { const placed = s.inf === 2; delete s.inf; s.miss = 0; s.cur = placed ? 'd' : 'c'; r.k = placed ? 1 : 0; ev.push({ type: 'confirmed', id: q.id, step: s.cur }); }
      else { delete s.inf; s.cur = pace(P).start; ev.push({ type: 'unconfirmed', id: q.id }); }
      return ev;
    }
    if (q.mode === 'practice') { S.revN++; return ev; }
    if (q.mode === 'brave') {
      S.revN++;
      if (ok) { r.k = (r.k || 0) + 1; if (r.k >= BRAVE_RUN) { r.k = 0; s.bv = s.bv || {}; if (!s.bv[q.step]) { s.bv[q.step] = now; ev.push({ type: 'brave', step: q.step }); } else ev.push({ type: 'braveAgain', step: q.step }); } }
      else r.k = 0;
      return ev;
    }
    // learn
    S.newN++;
    if (ok) {
      r.k = (r.k || 0) + 1; s.miss = 0;
      if (r.k >= 3) {
        const wasTop = s.top;
        plant(P, q.id, q.step, now, 0); r.k = 0;
        if (!wasTop || si(q.step) > si(wasTop)) ev.push({ type: 'planted', step: q.step });
        if (q.step === 'd' && wasTop !== 'd') ev.push({ type: 'proven', id: q.id });
      }
    } else {
      r.k = 0; s.miss = (s.miss || 0) + 1;
      if (s.miss >= pace(P).slide && q.step !== 'a') { s.cur = down(q.step); s.miss = 0; ST(P, q.id, s.cur).k = 0; ev.push({ type: 'slid', step: s.cur }); }
    }
    return ev;
  };

  /* should the app sound the alarm now? (session start / Continue / every IV_EVERY questions) */
  MM.alarmDue = (P, S, atStart) => !MM.ivActive(S) && MM.withered(P).length > 0 && (atStart || S.sinceIv >= IV_EVERY);

  /* counts for the ID card */
  MM.counts = function (P, now) {
    const c = { proven: 0, planted: 0, thirsty: 0, withered: 0, growing: 0, inferred: 0, seed: 0 };
    P.order.forEach(id => c[MM.state(P, id, now)]++);
    return c;
  };

  /* split / merge for per-unit storage */
  MM.unitDoc = function (P, unit) {
    const d = { skills: {}, steps: {} };
    for (const id of P.order) if (unitOf(id) === unit) {
      if (P.skills[id] && Object.keys(P.skills[id]).length) d.skills[id] = P.skills[id];
      for (const k of STEPS + BRAVE) { const r = P.steps[id + '.' + k]; if (r) d.steps[id + '.' + k] = r; }
    }
    return d;
  };
  MM.mergeUnit = function (P, doc) {
    if (!doc) return;
    Object.assign(P.skills, JSON.parse(JSON.stringify(doc.skills || {})));
    Object.assign(P.steps, JSON.parse(JSON.stringify(doc.steps || {})));
  };

  G.MM = MM;
  if (typeof module !== 'undefined') module.exports = MM;
})(typeof window !== 'undefined' ? window : globalThis);

