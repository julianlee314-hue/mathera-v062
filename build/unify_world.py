"""Unify the Tree/world page: every era uses the home tree page (pixel logo, painting, legend, Continue, one-column skills).
The old 'world' view (← Tree bar, era chips, 3-column branch grid) is no longer reachable: its entry points route to home."""
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
s = P.read_text()
def sub1(old, new, label):
    global s
    assert s.count(old) == 1, f'{label}: found {s.count(old)}'
    s = s.replace(old, new)
sub1("function openWorld(k) { worldK = WORLD_ART[k] ? k : era; show('world'); }",
     "function openWorld(k) {   // 0.6.3: one tree page for every era (the old world view is retired)\n  if (ERAS[k] && k !== era) { setEra(k); S = MM.session(); save(); }\n  show(META.placed[era] ? 'home' : 'welcome');\n}", 'openWorld')
sub1("function show(v) {\n", "function show(v) {\n  if (v === 'world') v = META.placed[era] ? 'home' : 'welcome';   // retired view: always the unified tree page\n", 'show world guard')
sub1("""  $('hHead').innerHTML = `<span class="where">Era ${k} · ${esc(ERAS[k].name)}</span><h1>""",
     """  $('hHead').innerHTML = `<span class="where">Era ${k} · ${esc(ERAS[k].name)}</span><h1>""", 'pixel logo (removed per Julius)')
sub1(".wvhead p{margin:0;color:var(--muted)}", ".wvhead p{margin:0;color:var(--muted)}\n.hlogo{display:flex;justify-content:center;margin:4px 0 10px}.hlogo svg{width:56px;height:56px}\n#v-world{display:none!important}", 'css')
P.write_text(s); print('unified world view')
