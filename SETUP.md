# Noody Tap — what's left to switch on

Three things need an action from you. None take more than five minutes.
Do all three before you fly.

---

## 1. Lead capture — REQUIRED, or you collect nothing

Right now the exchange form has nowhere to send to. It does not pretend
otherwise: the visitor is told it could not send and is given a prefilled
email they can fire off in one tap, so a lead is never silently lost. But
that puts the work on them, which is not what you want in a meeting.

Follow **[lead-relay/README.md](lead-relay/README.md)** — paste the script
into script.google.com, deploy it, copy the `/exec` URL, and put it in
`config.js`:

```js
formEndpoint: 'https://script.google.com/macros/s/AKfy…/exec',
```

It runs in your own Google account, so no third party holds the contact
details of people you meet. Test it once on the live card and confirm the
email arrives.

---

## 2. Custom domain — scott.noody.co.nz

**I have deliberately not committed the `CNAME` file yet.** Adding it before
DNS exists makes GitHub Pages redirect the working github.io URL to a domain
that does not resolve, which would take the card offline. So: DNS first.

**Add this record at whoever hosts noody.co.nz DNS:**

| Type  | Name    | Value                          | TTL   |
|-------|---------|--------------------------------|-------|
| CNAME | `scott` | `code-and-coffee-00.github.io` | 1 hour |

Note the value has no `https://` and no trailing slash, and it is the
*account* domain, not the repo path.

Tell me once it's added. I'll confirm it has propagated, commit the `CNAME`
file, and enable enforced HTTPS. Certificate issue takes a few more minutes
after that, so this is the one to start now.

Why a subdomain rather than `noody.co.nz/scott`: Shopify would serve that as
a 301, and browsers cache 301s hard — which destroys the whole point of being
able to re-point the card later without reprinting it.

---

## 3. What to encode on the card

Use **different** `utm_source` values for the chip and the printed QR, so
afterwards you can tell whether people tapped or scanned:

- **NFC chip:** `https://scott.noody.co.nz/?utm_source=nfc`
- **Printed QR:** `https://scott.noody.co.nz/?utm_source=qr`

The campaign no longer needs to be in the URL — the page fills in
`malaysia_2026` automatically when the source is `nfc` or `qr`. Shorter URL
means a lower QR version, which means bigger modules and a scan that survives
a phone held at arm's length in trade-show lighting.

Both land on the same page. Analytics is live on Noody's existing GA4
property (`G-NQLK5XR1TV`); filter by the `scott.noody.co.nz` hostname to
separate card traffic from the storefront. Events sent: `page_view`,
`save_contact`, `share_profile`, `exchange_open`, `wholesale_open`,
`exchange_submit`, `website_click`.

Check GA4 **Realtime** after your first live tap to confirm it is landing.

---

## 4. Printed cards — the backup that will get used

Lingy asked everyone to bring business cards and info sheets. At a 15,000-person
show you will meet people whose NFC is off, whose phone is flat, or who just
want something for their pocket.

Artwork is generated, not hand-drawn:

```
python3 tools/make-card.py
```

Output is `tools/out/noody-card.pdf` — 90 × 55 mm trim with 3 mm bleed, front
and back, using the real wordmark, Laica A and PP Mori. The QR is ECC-Q at
20 mm (0.41 mm per module), which is comfortably inside print spec.

**The script refuses to run until the DNS record exists.** That is deliberate:
generating a QR for a hostname that does not resolve gives you a box of dead
cards. So the order is DNS → generate → print.

If you run out of time for `scott.noody.co.nz`, generate against the working
URL instead and accept the vendor-branded link on this one print run:

```
python3 tools/make-card.py --url "https://code-and-coffee-00.github.io/noody-tap/?utm_source=qr"
```

Before sending to print, open the PDF on screen and scan the QR with your own
phone. Thirty seconds, and it is the one check no amount of code can do for you.

## Still outstanding

- Apple/Google Wallet pass is not built.

## Contact details now live

`+64 20 472 6884` and `linkedin.com/in/scott-glacken-nz` are in the vCard, and
WhatsApp and LinkedIn are both in the connect grid. WhatsApp is the primary
button in the wholesale drawer, prefilled with a distribution opener — it is
the default business channel in Malaysia, so it should outrank email there.
