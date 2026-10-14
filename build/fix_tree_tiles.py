"""Tree view fixes: (1) entering a not-yet-started era shows its world tree (auto-placed at its first unit) once the learner
has any era started; the start-unit picker shows only for a learner's first era, or when asked for (House Rules, reset).
(2) every era tile shows proven/total."""
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
s = P.read_text()
def sub1(old, new, label):
    global s
    assert s.count(old) == 1, f'{label}: found {s.count(old)}'
    s = s.replace(old, new)
# (2) tiles
sub1("${META.placed[k] ? `<small>${c.proven + c.thirsty}/${PS[k].order.length}</small>` : ERAS[k].total ? `<small>${ERAS[k].units.length < ERAS[k].total ? `preview · ${ERAS[k].units.length}/${ERAS[k].total} units` : `new · ${PS[k].order.length} skills`}</small>` : ''}",
     "<small>${c.proven + c.thirsty}/${PS[k].order.length}</small>", 'tile counts')
# (1) picker only when appropriate
sub1("function show(v) {", """let WANT_PICK = false;   // true only when the learner asked to choose a starting unit
function show(v) {
  if (v === 'welcome' && !WANT_PICK && !META.placed[era] && ERA_KEYS.some(x => x !== era && META.placed[x])) {
    META.placed[era] = true; META.start[era] = UNITS[0][0]; selUnit = UNITS[0][0]; save(); v = 'home';   // a new era starts at its beginning; House Rules can move it
  }""", 'show guard')
sub1("$('replaceBtn').addEventListener('click', () => show('welcome'));", "$('replaceBtn').addEventListener('click', () => { WANT_PICK = true; show('welcome'); WANT_PICK = false; });", 'replace btn')
sub1("  $('resetBtn').classList.remove('arm'); $('resetBtn').textContent = 'Progress reset';\n  show('welcome');",
     "  $('resetBtn').classList.remove('arm'); $('resetBtn').textContent = 'Progress reset';\n  WANT_PICK = true; show('welcome'); WANT_PICK = false;", 'reset')
P.write_text(s); print('tree/tiles fixes applied')
