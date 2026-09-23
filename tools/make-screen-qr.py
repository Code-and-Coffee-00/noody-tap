#!/usr/bin/env python3
"""
Noody Tap — QR codes to show off your own phone.

No printing. Two images you save to your phone and hold up:

  noody-qr-show.png        square, for Photos — the one you show people
  noody-qr-lockscreen.png  iPhone lock-screen wallpaper, QR clear of the clock

    python3 tools/make-screen-qr.py
    python3 tools/make-screen-qr.py --url https://...

Scanning off a screen is not the same as scanning off paper. Three things
matter and all three are handled here:
  - Dark-on-light. Inverted QRs fail on a lot of scanners.
  - A real quiet zone. Four modules of clear space, built into the image.
  - Size. The QR fills most of the frame so it survives being photographed
    at arm's length across a trade-show table.

The remaining variable is you: turn screen brightness up, and turn auto-
brightness off, or a dim screen will beat every other precaution.
"""
import argparse, pathlib, re, subprocess
import segno

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'tools' / 'out'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

ap = argparse.ArgumentParser()
ap.add_argument('--url', default='https://scott.noody.co.nz/?utm_source=qr')
args = ap.parse_args()
OUT.mkdir(parents=True, exist_ok=True)

qr = segno.make(args.url, error='q')
qr_path = OUT / '_screen-qr.svg'
qr.save(qr_path, scale=10, border=4, dark='#123A2C')
svg = qr_path.read_text()
inner = re.sub(r'^<\?xml[^>]*\?>|<svg[^>]*>|</svg>\s*$', '', svg, flags=re.S).strip()
# segno writes width/height but no viewBox, so build one from them — without it
# the QR will not scale to the box we give it.
_w = re.search(r'width="(\d+)"', svg).group(1)
_h = re.search(r'height="(\d+)"', svg).group(1)
vb = f'0 0 {_w} {_h}' 

wordmark = re.sub(r'^<svg[^>]*>|</svg>\s*$', '',
                  (ROOT / 'assets/brand/noody-wordmark.svg').read_text().strip(), flags=re.S)

FONTS = '''
  @font-face { font-family:"Laica A"; src:url("../../assets/fonts/laica-a.woff2") format("woff2"); }
  @font-face { font-family:"PP Mori"; src:url("../../assets/fonts/pp-mori-medium.woff2") format("woff2"); font-weight:600; }
'''

def render(name, w, h, body, css):
    page = f'''<!doctype html><meta charset="utf-8"><style>{FONTS}
    *{{box-sizing:border-box;-webkit-print-color-adjust:exact}}
    html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden}}
    {css}</style>{body}'''
    src = OUT / f'_{name}.html'
    src.write_text(page)
    png = OUT / f'{name}.png'
    subprocess.run([CHROME, '--headless', '--disable-gpu', f'--screenshot={png}',
                    f'--window-size={w},{h}', '--hide-scrollbars',
                    '--force-device-scale-factor=1', src.as_uri()],
                   check=True, capture_output=True)
    return png

# --- 1. The square you show people ---------------------------------------
show_css = '''
  body{background:#FBF9F2;display:flex;flex-direction:column;align-items:center;
       justify-content:center;gap:52px;padding:70px;color:#123A2C}
  .mark{width:270px}.mark svg{width:100%;height:auto;display:block;fill:#123A2C}
  .qr{width:760px;height:760px;background:#fff;border-radius:44px;padding:30px;
      box-shadow:0 20px 60px rgba(18,58,44,.10)}
  .qr svg{width:100%;height:100%;display:block}
  .who{font-family:"Laica A",serif;font-size:56px;line-height:1;margin:0}
  .role{font-family:"PP Mori",sans-serif;font-weight:600;font-size:21px;letter-spacing:.14em;
        text-transform:uppercase;opacity:.5;margin:16px 0 0}
'''
show_body = f'''<div class="mark"><svg viewBox="0 0 994.05 324.82">{wordmark}</svg></div>
<div class="qr"><svg viewBox="{vb}">{inner}</svg></div>
<div style="text-align:center"><p class="who">Scott Glacken</p>
<p class="role">Scan to connect</p></div>'''
p1 = render('noody-qr-show', 1080, 1440, show_body, show_css)

# --- 2. iPhone lock screen ------------------------------------------------
# 1290x2796 is the iPhone 15/16 Pro panel. The clock and widgets own the top
# third, notifications creep up from the bottom, so the QR sits at mid-height.
lock_css = '''
  body{background:#FBF9F2;position:relative;color:#123A2C}
  .qr{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);
      width:840px;height:840px;background:#fff;border-radius:52px;padding:34px;
      box-shadow:0 24px 70px rgba(18,58,44,.12)}
  .qr svg{width:100%;height:100%;display:block}
  .cap{position:absolute;left:0;right:0;top:calc(52% + 480px);text-align:center;
       font-family:"PP Mori",sans-serif;font-weight:600;font-size:34px;
       letter-spacing:.16em;text-transform:uppercase;opacity:.55}
  .mark{position:absolute;left:50%;transform:translateX(-50%);bottom:250px;width:230px}
  .mark svg{width:100%;height:auto;display:block;fill:#123A2C}
'''
lock_body = f'''<div class="qr"><svg viewBox="{vb}">{inner}</svg></div>
<div class="cap">Scan to connect</div>
<div class="mark"><svg viewBox="0 0 994.05 324.82">{wordmark}</svg></div>'''
p2 = render('noody-qr-lockscreen', 1290, 2796, lock_body, lock_css)

for f in OUT.glob('_*'):
    f.unlink()

print(f'  URL          {args.url}')
print(f'  QR           v{qr.version} ECC-Q, {qr.symbol_size(scale=1, border=4)[0]} modules')
print(f'  show me      {p1.relative_to(ROOT)}   (1080x1440 — save to Photos)')
print(f'  lock screen  {p2.relative_to(ROOT)}   (1290x2796 — iPhone wallpaper)')
