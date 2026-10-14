"""Remove the Inventions feature and DJ mode from index.html; archive the removed code under /workspace/mathera/archive/.
Saves are unaffected: Inventions were derived from proven skills (never stored in Acorn/CHAR codes); DJ mode stored nothing."""
import pathlib, re
P = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
AR = pathlib.Path('/workspace/mathera/archive')
s = P.read_text(); inv_arc, dj_arc = [], []
def cut(old, new='', arc=None, label=''):
    global s
    assert s.count(old) == 1, f'{label}: found {s.count(old)}'
    if arc is not None: arc.append(f'/* ---- {label} ---- */\n{old}\n')
    s = s.replace(old, new)
def span(start, end, arc, label, keep_end=False):
    i = s.index(start); j = s.index(end, i) + (0 if keep_end else len(end))
    assert s.count(start) == 1, label
    cut(s[i:j], '', arc, label)
def line_with(sub, arc, label):
    m = [l for l in s.split('\n') if sub in l]; assert len(m) == 1, f'{label}: {len(m)}'
    cut(m[0] + '\n', '', arc, label)

# ---------- Inventions ----------
for k in range(148, 153): pass
for sel in ['.inv{display:flex', '.inv svg{width:34px', '.inv b{font-size:11.5px', '.inv small{font-size:10.5px', '.inv.locked svg', 'body.wt .inv{']:
    line_with(sel, inv_arc, 'css ' + sel)
line_with('<h2>Inventions</h2><span id="invCount">', inv_arc, 'tree view heading')
line_with('<div class="shelf" id="shelf"></div>', inv_arc, 'tree view shelf')
line_with('<h2>Inventions collected</h2>', inv_arc, 'id card heading')
line_with('<div class="shelf" id="idShelf"></div>', inv_arc, 'id card shelf')
span('const ICON = {', 'const icon = id => `<svg viewBox="0 0 40 40" aria-hidden="true" fill="currentColor">${ICON[id]}</svg>`;\n', inv_arc, 'ICON, INVENTIONS, eraInv, icon')
line_with('const hasInv = inv =>', inv_arc, 'hasInv')
line_with('function shelfHTML()', inv_arc, 'shelfHTML')
line_with("  $('shelf').innerHTML = shelfHTML();", inv_arc, 'renderHome shelf')
line_with("  $('invCount').textContent =", inv_arc, 'renderHome count')
cut("  $('idShelf').innerHTML = shelfHTML(); $('idInvN').textContent = `${eraInv().filter(hasInv).length} of ${eraInv().length}`;\n", '', inv_arc, 'renderID shelf')
line_with('const rHasInv = inv =>', inv_arc, 'report rHasInv')
line_with('  const invAll = INVENTIONS.map(', inv_arc, 'report invAll')
cut('legend, inv: invAll, code:', 'legend, code:', inv_arc, 'report data inv key')
cut(" ['Inventions', `${data.inv.filter(i => i.has).length} of ${data.inv.length}`],", '', inv_arc, 'glance small item')
span('  // inventions shelf (icons drawn from the app\'s own SVGs)\n', "join(', ')}`, 174), 18, 274.5); }\n", inv_arc, 'glance inventions shelf')
span('async function loadIcons() {', '  return out;\n}\n', inv_arc, 'loadIcons')
cut('const data = reportData(), icons = await loadIcons();', 'const data = reportData();', inv_arc, 'makeReport icons')
cut('function pageGlance(D, data, no, pages, icons) {', 'function pageGlance(D, data, no, pages) {', inv_arc, 'pageGlance sig')
cut('pageGlance(D, data, no, N, icons)', 'pageGlance(D, data, no, N)', inv_arc, 'pageGlance call')

# ---------- DJ mode ----------
line_with('<button id="djTab" aria-current="false">DJ mode</button>', dj_arc, 'nav tab')
line_with('<!-- DJ MODE: a classroom board for the projector -->', dj_arc, 'view comment')
line_with('<section class="view" id="v-dj" hidden><div id="djHost"></div></section>', dj_arc, 'view section')
line_with('body.djwide .app{max-width:1180px}', dj_arc, 'css djwide')
cut('body.focus .evline,body.djwide .evline{display:none}', 'body.focus .evline{display:none}', dj_arc, 'css evline')
cut('.app,body.focus .app,body.djwide .app,', '.app,body.focus .app,', dj_arc, 'css app width')
span('<script>\nfunction DJ_BOOT(ROOT) {', '</script>\n', dj_arc, 'DJ_BOOT board (script)')
span('<!-- DJ MODE (classroom board): self-contained', '</script>\n', dj_arc, 'DJ shadow-root host + tab wiring (script)')

left = [w for w in ['INVENTIONS', 'eraInv', 'hasInv', 'shelfHTML', 'invCount', 'idShelf', 'djTab', 'DJ_BOOT', 'djHost', 'djwide'] if re.search(r'\b' + w + r'\b', s)]
assert not left, f'leftovers: {left}'
P.write_text(s)
(AR / 'inventions/inventions-removed.js.txt').write_text('\n'.join(inv_arc))
(AR / 'dj-mode/dj-mode-removed.html.txt').write_text('\n'.join(dj_arc))
print('removed; archived', len(inv_arc), 'inventions chunks,', len(dj_arc), 'dj chunks')
