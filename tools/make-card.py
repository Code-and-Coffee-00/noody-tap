#!/usr/bin/env python3
"""
Noody Tap — printed card artwork generator.

Produces print-ready front and back artwork for the physical card, with a QR
that points at the same URL as the NFC chip. Run it again any time the URL
changes; nothing is hand-drawn.

    python3 tools/make-card.py                    # scott.noody.co.nz
    python3 tools/make-card.py --url https://...  # any other destination
    python3 tools/make-card.py --force            # skip the DNS guard

THE DNS GUARD: printing a QR for a hostname that does not resolve produces a
box of dead cards. The script refuses to build unless the host resolves, so
that mistake cannot be made quietly. --force overrides it deliberately.

Output: tools/out/noody-card--<host>.pdf  (90 x 55 mm trim + 3 mm bleed)
        tools/out/noody-qr--<host>.svg    (the QR on its own, for other uses)

The filenames carry the host so a proof built against the fallback URL cannot
be mistaken for the real print file.
"""
import argparse, pathlib, re, socket, subprocess, sys, urllib.parse
import segno

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'tools' / 'out'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

TRIM_W, TRIM_H, BLEED = 90, 55, 3          # millimetres
PAGE_W, PAGE_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED

ap = argparse.ArgumentParser()
ap.add_argument('--url', default='https://scott.noody.co.nz/?utm_source=qr')
ap.add_argument('--force', action='store_true', help='build even if the host does not resolve')
args = ap.parse_args()

host = urllib.parse.urlparse(args.url).hostname
try:
    socket.getaddrinfo(host, None)
    print(f'  DNS ok       {host}')
except socket.gaierror:
    print(f'  DNS FAILS    {host} does not resolve.')
    if not args.force:
        print('\n  Refusing to generate artwork for a hostname that does not resolve —\n'
              '  printing that QR gives you a box of dead cards.\n'
              '  Add the DNS record first, or re-run with --force if you know better.')
        sys.exit(1)
    print('  --force given, continuing anyway.\n')

OUT.mkdir(parents=True, exist_ok=True)

# Error correction Q (25% recovery) rather than H. H pushes this URL to v8/v9,
# which at 18mm gives ~0.28mm modules — under the size a phone camera reads
# comfortably off a card in trade-show lighting. Q lands on v6 / 0.37mm modules,
# which is the better trade for a card that will be scanned, not abused.
# border=4 carries the mandatory quiet zone inside the SVG itself rather than
# relying on the layout to provide it.
qr = segno.make(args.url, error='q')
qr.save(OUT / f'noody-qr--{host.replace(chr(46),chr(45))}.svg', scale=10, border=4, dark='#123A2C')
qr_svg = (OUT / f'noody-qr--{host.replace(chr(46),chr(45))}.svg').read_text()
qr_inner = re.sub(r'^<\?xml[^>]*\?>|<svg[^>]*>|</svg>\s*$', '', qr_svg, flags=re.S).strip()
qr_vb = re.search(r'viewBox="([^"]+)"', qr_svg)
qr_vb = qr_vb.group(1) if qr_vb else f'0 0 {qr.symbol_size(10,0)[0]} {qr.symbol_size(10,0)[1]}'

wordmark = re.sub(r'^<svg[^>]*>|</svg>\s*$', '',
                  (ROOT / 'assets/brand/noody-wordmark.svg').read_text().strip(), flags=re.S)
char = re.sub(r'^<svg[^>]*>|</svg>\s*$', '',
              (ROOT / 'assets/brand/char-suds.svg').read_text().strip(), flags=re.S)
char_vb = re.search(r'viewBox="([^"]+)"', (ROOT / 'assets/brand/char-suds.svg').read_text()).group(1)

html = f'''<!doctype html><meta charset="utf-8">
<style>
  @font-face {{ font-family:"Laica A"; src:url("../../assets/fonts/laica-a.woff2") format("woff2"); }}
  @font-face {{ font-family:"PP Mori"; src:url("../../assets/fonts/pp-mori-medium.woff2") format("woff2"); font-weight:600; }}
  @page {{ size: {PAGE_W}mm {PAGE_H}mm; margin: 0; }}
  * {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  html, body {{ margin:0; padding:0; }}
  .card {{
    width:{PAGE_W}mm; height:{PAGE_H}mm; position:relative; overflow:hidden;
    background:#FBF9F2; color:#123A2C; page-break-after:always;
  }}
  /* Everything sits inside the trim, with a further 3mm of safety. */
  .safe {{ position:absolute; inset:{BLEED + 3}mm; }}

  .front .mark {{ position:absolute; left:50%; top:50%; transform:translate(-50%,-52%); width:34mm; }}
  .front .mark svg {{ width:100%; height:auto; display:block; fill:#123A2C; }}
  .front .peek {{ position:absolute; right:1mm; bottom:0; width:14mm; opacity:.92; }}
  .front .peek svg {{ width:100%; height:auto; display:block; fill:#44D62C; }}

  .nfc {{ position:absolute; right:0; top:0; width:5mm; height:5mm; }}
  .nfc svg {{ width:100%; height:100%; display:block; }}

  .back .name {{ font-family:"Laica A",serif; font-size:16pt; line-height:1; margin:0; letter-spacing:-.02em; }}
  .back .role {{ font-family:"PP Mori",sans-serif; font-weight:600; font-size:6pt; letter-spacing:.1em;
                 text-transform:uppercase; margin:2.2mm 0 0; opacity:.62; }}
  .back .tap {{ position:absolute; left:0; bottom:0; font-family:"PP Mori",sans-serif; font-weight:600;
                font-size:6.5pt; letter-spacing:.12em; text-transform:uppercase;
                display:flex; align-items:center; gap:1.6mm; }}
  .back .tap .waves {{ width:4mm; height:4mm; }}
  .back .tap .waves svg {{ stroke:#44D62C; }}
  .back .origin {{ position:absolute; left:0; bottom:6mm; font-family:"PP Mori",sans-serif; font-weight:600;
                   font-size:5.5pt; letter-spacing:.14em; text-transform:uppercase; opacity:.45; }}
  .back .qr {{ position:absolute; right:0; bottom:0; width:20mm; height:20mm; }}
  .back .qr svg {{ width:100%; height:100%; display:block; }}
</style>

<!-- FRONT -->
<div class="card front">
  <div class="safe">
    <div class="nfc">{{NFC}}</div>
  </div>
  <div class="mark"><svg viewBox="0 0 994.05 324.82">{wordmark}</svg></div>
  <div class="peek"><svg viewBox="{char_vb}">{char}</svg></div>
</div>

<!-- BACK -->
<div class="card back">
  <div class="safe">
    <p class="name">Scott Glacken</p>
    <p class="role">Co-Founder &amp; Creative Director</p>
    <div class="origin">Aotearoa New Zealand</div>
    <div class="tap"><span class="waves">{{NFC}}</span>Tap to connect</div>
    <div class="qr"><svg viewBox="{qr_vb}">{qr_inner}</svg></div>
  </div>
</div>
'''

# The contactless glyph: three arcs, drawn rather than sourced so it scales cleanly.
nfc = ('<svg viewBox="0 0 24 24" fill="none" stroke="#123A2C" stroke-width="1.8" stroke-linecap="round">'
       '<path d="M7 4.5a10.5 10.5 0 0 1 0 15"/><path d="M12 7.5a6 6 0 0 1 0 9"/>'
       '<path d="M16.6 10.4a2.4 2.4 0 0 1 0 3.2"/></svg>')
html = html.replace('{NFC}', nfc)

# Name the output after the host it encodes, so a proof built against the
# fallback URL can never be mistaken for the real print file.
slug = host.replace('.', '-')
src = OUT / f'noody-card--{slug}.html'
src.write_text(html)

pdf = OUT / f'noody-card--{slug}.pdf'
subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                f'--print-to-pdf={pdf}', src.as_uri()],
               check=True, capture_output=True)

mods = qr.symbol_size(scale=1, border=4)[0]
print(f'  QR           v{qr.version} ECC-Q, {len(args.url)} chars, {mods} modules, {20/mods:.3f}mm per module at 20mm')
print(f'  URL          {args.url}')
print(f'  artwork      {pdf.relative_to(ROOT)}  ({PAGE_W} x {PAGE_H} mm = {TRIM_W} x {TRIM_H} mm trim + {BLEED} mm bleed)')
print(f'  qr only      {(OUT / f"noody-qr--{host.replace(chr(46),chr(45))}.svg").relative_to(ROOT)}')
