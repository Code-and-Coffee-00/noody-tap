#!/usr/bin/env python3
"""
Noody Tap — claim linter.

Noody's product claims are tightly scoped: substantiation for one SKU does not
transfer to another. Calm Balm has a repeat-insult patch test, so it may say
"dermatologically tested" and "hypoallergenic". Lotion Potion carries GHS H317
(fragrance allergen), so it may not say any of that. Sun Balm has an in-vivo SPF
report but no water-resistance test. None of the range has a paediatric dossier,
so "newborn" language is out everywhere.

This checks index.html against those rules. Run it after ANY copy change:

    python3 tools/claim-check.py

Source of truth (not this file):
  ~/noody-theme-od-v9/NOODY-VERIFIED-CLAIMS.md
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / 'index.html').read_text()
text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html)).lower()

blocks = {}
for m in re.finditer(r'<li class="range-item[^"]*">(.*?)</li>', html, re.S):
    body = re.sub(r'<[^>]+>', ' ', m.group(1)).lower()
    name = re.search(r'(soft suds|lotion potion|calm balm|bedtime bestie|sun balm)', body)
    if name:
        blocks[name.group(1)] = body

PER_SKU = {
    'lotion potion':  ['hypoallergenic', 'non-irritating', 'fragrance-free', 'unscented',
                       'sensitive skin', 'allergy tested'],
    'soft suds':      ['tear-free', 'tear free', 'hypoallergenic', 'non-irritating',
                       'fragrance-free', 'unscented', '100% natural'],
    'bedtime bestie': ['hypoallergenic', 'fragrance-free', 'unscented', 'aids sleep',
                       'natural', 'dermatologically tested'],
    'sun balm':       ['water resistant', 'water-resistant', 'reef-safe', 'reef safe',
                       'non-nano', 'hypoallergenic', 'dermatologically tested', 'sweat-proof'],
    'calm balm':      ['cures eczema', 'treats eczema', 'medical-grade', '100% natural', 'organic'],
}

PAGE_WIDE = ['newborn', 'from birth', 'safe from day 1', 'cures eczema', 'treats eczema',
             'natrue', 'certified organic', 'shieling', 'halal', 'jakim',
             'paediatrician', 'pediatrician', 'water resistant', 'reef-safe',
             'tear-free', '100% natural']

failed = False

for sku, terms in PER_SKU.items():
    body = blocks.get(sku)
    if body is None:
        print(f'  ??    {sku:<16} block not found'); continue
    hits = [t for t in terms if re.search(t, body)]
    print(f'  {"FAIL" if hits else "ok  "}  {sku:<16} {hits if hits else ""}')
    failed |= bool(hits)

hits = [t for t in PAGE_WIDE if t in text]
print(f'\n  {"FAIL" if hits else "ok  "}  page-wide prohibited {hits if hits else ""}')
failed |= bool(hits)

# Calm Balm's substantiation must not leak onto other SKUs.
leaked = [s for s, b in blocks.items() if s != 'calm balm' and 'dermatologically tested' in b]
print(f'  {"FAIL" if leaked else "ok  "}  patch-test claims scoped to Calm Balm {leaked if leaked else ""}')
failed |= bool(leaked)

# Label claim is SPF 50; 52.6 is the measured mean and is not for publication.
print(f'  {"FAIL" if "52.6" in text else "ok  "}  measured SPF value not published')
failed |= '52.6' in text

print('\nCLAIM CHECK: ' + ('FAILED' if failed else 'PASSED'))
sys.exit(1 if failed else 0)
