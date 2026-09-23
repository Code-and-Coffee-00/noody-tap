# Noody Tap — what's left to switch on

The page itself is finished. What remains needs your hands, not more code.

---

## 1. Lead capture — decided: prefilled email

Scott's call, Sept 2026: the expected volume on this trip does not justify a
backend. So the exchange form does the useful part — collects name, company,
email, phone and what they're interested in — then opens a prefilled email for
them to send. One tap, no server, nothing to deploy or maintain.

Nothing to do here. It works as-is.

**If that changes**, `lead-relay/` has a Google Apps Script that emails you
each lead directly, with retries. Deploy it, paste the `/exec` URL into
`config.js` as `formEndpoint`, and the form switches to sending on its own —
no other change needed. The code path is already written and tested.

---

## 2. Custom domain — done

Live on **https://scott.noody.co.nz** with enforced HTTPS.

- DNS: `CNAME` `scott` -> `code-and-coffee-00.github.io`, at Hostinger.
- The old `code-and-coffee-00.github.io/noody-tap/` address still works and
  redirects here, query string intact — anything already carrying the old URL
  keeps landing.
- The page is `noindex, nofollow`, so it stays out of search. It is not
  private: anyone with the link can open it, which is the point.

Optional: a URL redirect in Shopify (Online Store -> Navigation -> URL
Redirects) from `/scott` to `https://scott.noody.co.nz` lets you say
"noody.co.nz/scott" out loud. The address bar still ends on the subdomain.

---

## 3. What to encode on the card

Use **different** `utm_source` values for the chip and the printed QR, so
afterwards you can tell whether people tapped or scanned:

- **NFC chip:** `https://scott.noody.co.nz/?utm_source=nfc`
- **Printed QR:** `https://scott.noody.co.nz/?utm_source=qr`

The shorter domain also made the QR meaningfully easier to scan: it dropped
from version 6 to version 4, so the modules are 0.49mm instead of 0.41mm.

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

## 4. NFC — what it actually takes

**Your phone cannot do this on its own.** An iPhone cannot emulate an NFC tag
to send a URL to another phone: Apple restricts host card emulation to Wallet,
and the third-party route added in iOS 17.4 is EEA-only and needs a special
entitlement. Android's phone-to-phone NFC beam was removed in Android 10. So
"tap my phone" is not a thing you can switch on — you need a physical tag.

The good news is a tag costs about ten dollars and takes two minutes to set up.

### Buy (today — you fly in a few days)

**Fastest: Mitre 10 MEGA Silverdale** has *WiZ NFC Tag 4-pack, $14.95*, aisle
24 bay 1, click & collect today. These are sold for triggering smart-light
scenes, but Mitre 10's own copy says the tags are "customizable" and that you
"personalize" them — which means they ship writable, and at that price they
will be ordinary NTAG chips rather than anything proprietary.

Two conditions if you take that route:

- **Do not open the WiZ app.** Go straight to NFC Tools. Letting the vendor
  app set them up is the one way they might end up locked.
- **Test one before you leave the car park.** Install NFC Tools first, write
  the URL, tap it. If it takes, you are done for $15. If it refuses, drive on
  to PB Tech or Jaycar, or order below.

[Sparts NZ](https://sparts.nz/collections/nfc-products) courier daily from
Auckland:

- **NFC Tags Ntag213 Adhesive 25mm, 10 pack — $9.99.** This is all you need; a
  60-character URL uses a fraction of the 144 bytes.
- Ntag215 sticker 10-pack is $16.99 if you want headroom.

PB Tech and Jaycar also carry NFC tags if you would rather walk in and have
them the same day.

### Write the URL

1. Install **NFC Tools** (free, iOS and Android).
2. Write → Add a record → **URL/URI**.
3. Enter exactly:

   ```
   https://scott.noody.co.nz/?utm_source=nfc
   ```

   `utm_source=nfc` is what separates taps from QR scans in your analytics.
4. Write, then hold a tag to the back of your phone.
5. **Do not tick "lock tag".** Locking is permanent, and being able to
   re-point the tag later without replacing it is the entire reason the URL is
   yours rather than a vendor's.

### Where to stick it

**Not on your phone.** A tag sitting on your own phone's NFC antenna will get
read by your own handset constantly.

Better: **the back of your Cosmobeauté badge.** Everyone is wearing one, it is
already in your hand, and "tap my badge" is a better line than "tap my phone".
A notebook cover or a sample bottle works too. Stick a spare on each so you
are never without one.

If a surface is metal or has magnets in it, ordinary tags will not read — you
need an on-metal tag for that.

### Check it works

Hold a phone to the tag. On iPhone XS and later the link banner appears
automatically with the screen on and unlocked; older iPhones need the NFC
reader in Control Centre. Most Android phones read it with the screen on.

**Test with someone else's phone before you fly, not at the show.**

## 5. The QR — no printing needed

Two images. Save both to your phone.

```
python3 tools/make-screen-qr.py
```

- **`tools/out/noody-qr-show.png`** — save to Photos and Favourite it. This is
  the one you hold up. Noody wordmark, big QR, your name underneath.
- **`tools/out/noody-qr-lockscreen.png`** — set as your iPhone lock-screen
  wallpaper. The QR sits below where the clock lands, so you can show it
  without unlocking your phone at all.

Scanning off a screen works fine, and this is actually more reliable than a
printed card because the code is physically bigger. Verified by decoding the
rendered images down to 20% scale and with simulated glare across them.

Two things that will beat every precaution in the code, both on your phone:

1. **Turn screen brightness up, and turn auto-brightness OFF.** A dimmed
   screen is the single most common reason a screen QR fails to scan.
2. If you use the lock-screen one, turn off the wallpaper **Depth Effect** and
   perspective zoom when you set it, or iOS will crop into the QR.

Printed cards are still available if you change your mind —
`python3 tools/make-card.py` generates 90 × 55 mm artwork, front and back. But
you do not need them for the QR to work.

## Still outstanding

- Apple/Google Wallet pass is not built.

## Contact details now live

`+64 20 472 6884` and `linkedin.com/in/scott-glacken-nz` are in the vCard, and
WhatsApp and LinkedIn are both in the connect grid. WhatsApp is the primary
button in the wholesale drawer, prefilled with a distribution opener — it is
the default business channel in Malaysia, so it should outrank email there.
