"""Small era tiles use the white pixel-world icons (worldSVG) instead of the painted images.
Painted images stay only on the gate (homepage) and the big World Tree view. Applies to index.html in place; asserts each edit once."""
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
s = P.read_text()
def sub1(s, old, new, label):
    assert s.count(old) == 1, f'{label}: found {s.count(old)}'
    return s.replace(old, new)
s = sub1(s, '<button data-era="${k}" aria-pressed="${k === era}"><b>Era ${k}</b>',
         '<button data-era="${k}" aria-pressed="${k === era}">${worldSVG(k, 24)}<b>Era ${k}</b>', 'era tabs icon')
s = sub1(s, '<button data-bera="${x}" aria-pressed="${x === k}"><b>Era ${x}</b>',
         '<button data-bera="${x}" aria-pressed="${x === k}">${worldSVG(x, 24)}<b>Era ${x}</b>', 'basic tabs icon')
s = sub1(s, '<span class="soon-band" data-short="Soon">Coming soon</span><b>Era ${k}</b>',
         '<span class="soon-band" data-short="Soon">Coming soon</span>${worldSVG(k, 24)}<b>Era ${k}</b>', 'soon tabs icon')
CSS = ('/* Small era tiles: simple pixel-world icons, no paintings (paintings only on the gate and the World Tree view) */\n'
       '.eras button::before,body.wt .eras button::before{content:none!important;background-image:none!important}\n'
       '.eras button svg{display:block;margin:0 auto 3px;color:var(--ink);opacity:.85}\n'
       'body.wt .eras button svg{color:#F4F2EC;opacity:.95}\n'
       '.eras button[aria-pressed="true"] svg{opacity:1}\n')
s = sub1(s, '.eras button.soon,.gp.later{cursor:default}\n', '.eras button.soon,.gp.later{cursor:default}\n' + CSS, 'css')
P.write_text(s); print('small trees applied')
