(() => {
  'use strict';

  const CFG = window.NOODY_CONFIG || {};
  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => [...root.querySelectorAll(s)];
  const toast = q('#toast');
  let toastTimer;

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function haptic(pattern = 8) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  /* --- Campaign attribution ---------------------------------------------
     The NFC chip and the printed QR should carry different utm_source values
     so the trip can be read as "did the tap work, or did people scan?".      */
  const params = new URLSearchParams(location.search);
  const source = params.get('utm_source') || 'direct';
  const campaign = {
    source,
    medium:   params.get('utm_medium')   || '',
    // The card carries one campaign, so the chip and the printed QR only need
    // to encode the source. Every character dropped from the URL lowers the
    // QR version, and lower version means larger modules and a scan that
    // survives a phone held at arm's length in bad light.
    campaign: params.get('utm_campaign') || (source === 'qr' || source === 'nfc' ? 'malaysia_2026' : ''),
    content:  params.get('utm_content')  || ''
  };
  sessionStorage.setItem('noody_tap_campaign', JSON.stringify(campaign));

  /* --- Analytics ---------------------------------------------------------
     Previously track() pushed to window.dataLayer and window.posthog, neither
     of which was ever loaded, so every event was a no-op. GA4 is loaded here. */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  if (CFG.ga4Id) {
    gtag('js', new Date());
    gtag('config', CFG.ga4Id, {
      // The hostname separates tap-card traffic from the storefront.
      page_title: 'Noody Tap — Scott Glacken',
      tap_source: campaign.source
    });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(CFG.ga4Id)}`;
    document.head.appendChild(s);
  }

  function track(event, details = {}) {
    const payload = { tap_source: campaign.source, ...details };
    if (CFG.ga4Id) gtag('event', event, payload);
    window.dispatchEvent(new CustomEvent('noody:analytics', { detail: { event, ...payload } }));
  }

  /* --- Save Scott -------------------------------------------------------- */
  const vCard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Glacken;Scott;;;',
    'FN:Scott Glacken',
    'ORG:Noody Skincare',
    'TITLE:Co-Founder & Creative Director',
    'EMAIL;TYPE=INTERNET,WORK:scott@noody.co.nz',
    'TEL;TYPE=CELL,VOICE:+64204726884',
    'URL:https://www.noody.co.nz/',
    'URL:https://www.linkedin.com/in/scott-glacken-nz/',
    'X-SOCIALPROFILE;TYPE=instagram:https://www.instagram.com/noodyskincare',
    'X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/scott-glacken-nz/',
    'NOTE:Met at Cosmobeauté Malaysia 2026, Kuala Lumpur.',
    'END:VCARD'
  ].join('\r\n');

  q('#saveContact').addEventListener('click', () => {
    const blob = new Blob([vCard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Scott-Glacken-Noody.vcf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    q('#saveContact span').textContent = 'Saved';
    haptic([8, 30, 8]);
    track('save_contact');
    showToast('Scott added to your downloads');
    setTimeout(() => q('#saveContact span').textContent = 'Save Scott', 2600);
  });

  async function shareProfile() {
    const data = { title: 'Scott Glacken — Noody', text: 'Meet Scott, Co-Founder of Noody Skincare.', url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(location.href);
        showToast('Profile link copied');
      }
      track('share_profile');
      haptic();
    } catch (e) {
      if (e?.name !== 'AbortError') showToast('Share unavailable on this browser');
    }
  }
  qa('#shareProfile, #shareProfileBottom').forEach(b => b.addEventListener('click', shareProfile));

  /* --- Sheets ------------------------------------------------------------ */
  const exchangeSheet = q('#exchangeSheet');
  const wholesaleSheet = q('#wholesaleSheet');
  function openSheet(sheet, event) {
    if (!sheet.open) sheet.showModal();
    haptic();
    track(event);
  }
  q('#exchangeOpen').addEventListener('click', () => openSheet(exchangeSheet, 'exchange_open'));
  qa('#exchangeOpenBottom, #exchangeOpenTrade').forEach(b =>
    b.addEventListener('click', () => openSheet(exchangeSheet, 'exchange_open')));
  qa('#wholesaleOpen, #wholesaleOpenHero').forEach(b =>
    b.addEventListener('click', () => openSheet(wholesaleSheet, 'wholesale_open')));
  qa('[data-close]').forEach(btn => btn.addEventListener('click', () => q(`#${btn.dataset.close}`).close()));

  /* --- Exchange ----------------------------------------------------------
     Conference wifi and roaming data drop constantly, so a single failed POST
     must not lose a lead. Three attempts with backoff, then an honest failure
     state with a prefilled email the visitor can send themselves.            */
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function deliver(record) {
    const endpoint = CFG.formEndpoint || '';
    if (!endpoint) return { ok: false, reason: 'unconfigured' };

    const backoff = [0, 1200, 3000];
    for (let i = 0; i < backoff.length; i++) {
      if (backoff[i]) await wait(backoff[i]);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          // text/plain keeps this a CORS "simple request", so no preflight —
          // Apps Script web apps do not answer OPTIONS.
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(record)
        });
        if (res.ok) return { ok: true };
      } catch (_) { /* network dropped — retry */ }
    }
    return { ok: false, reason: 'network' };
  }

  function fallbackMailto(record) {
    const to = CFG.notifyEmail || 'scott@noody.co.nz';
    const subject = `Noody — details from ${record.name}`;
    const body = [
      `Name: ${record.name}`,
      `Company: ${record.company || '—'}`,
      `Email: ${record.email}`,
      `Phone: ${record.phone || '—'}`,
      `Interested in: ${record.interests.join(', ')}`,
      '',
      `Met via: ${record.source}`
    ].join('\n');
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const form = q('#exchangeForm');
  const submitBtn = () => q('#exchangeForm button[type=submit] span');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const interests = fd.getAll('interest').map(String);
    const interestError = q('#interestError');
    interestError.hidden = interests.length > 0;

    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !interests.length) {
      form.reportValidity();
      if (!interests.length) interestError.hidden = false;
      haptic(20);
      return;
    }

    const record = {
      name,
      company: String(fd.get('company') || '').trim(),
      email,
      phone: String(fd.get('phone') || '').trim(),
      interests,
      createdAt: new Date().toISOString(),
      source: campaign.source,
      campaign,
      page: location.href
    };

    const hasEndpoint = !!(CFG.formEndpoint || '');
    if (hasEndpoint) {
      submitBtn().textContent = 'Sending…';
      form.querySelector('button[type=submit]').disabled = true;
    }

    const result = await deliver(record);
    track('exchange_submit', { interests: interests.join(','), delivered: result.ok });

    q('#exchangeFormWrap').hidden = true;
    q('#exchangeSuccess').hidden = false;

    if (result.ok) {
      q('#successTitle').textContent = 'Lovely to meet you.';
      q('#successCopy').textContent = 'Your details are on their way to Scott.';
      const cta = q('#successCta');
      cta.textContent = 'Open Noody ↗';
      cta.href = 'https://www.noody.co.nz/';
      cta.target = '_blank';
    } else {
      /* With no endpoint configured this is the intended route, not a failure,
         so it should not read like one. The form has already done the useful
         part — structuring the details and capturing what they're interested
         in — and this hands the finished email over ready to send. */
      const cta = q('#successCta');
      cta.textContent = 'Send to Scott ↗';
      cta.href = fallbackMailto(record);
      cta.removeAttribute('target');

      if (result.reason === 'network') {
        q('#successTitle').textContent = 'One more tap.';
        q('#successCopy').textContent = 'The connection dropped before that sent — this opens it as an email instead.';
      } else {
        q('#successTitle').textContent = 'Almost there.';
        q('#successCopy').textContent = 'Your email app will open with everything filled in. Hit send and Scott has it.';
      }
    }

    haptic([10, 35, 10]);
  });

  qa('[data-track]').forEach(el => el.addEventListener('click', () => track(el.dataset.track)));

  /* --- Product galleries -------------------------------------------------
     Scroll-snap does the scrolling; this only keeps the dots in step with it
     and lets them be tapped. Guarded so a single-image gallery does nothing. */
  qa('.range-media').forEach(media => {
    const gallery = q('.range-gallery', media);
    const dots = qa('.range-dot', media);
    if (!gallery || dots.length < 2) return;

    const sync = () => {
      const i = Math.round(gallery.scrollLeft / gallery.clientWidth);
      dots.forEach((d, n) => d.setAttribute('aria-current', String(n === i)));
    };
    dots.forEach((dot, n) => dot.addEventListener('click', () => {
      gallery.scrollTo({ left: n * gallery.clientWidth, behavior: 'smooth' });
    }));
    gallery.addEventListener('scroll', () => {
      clearTimeout(gallery._t);
      gallery._t = setTimeout(sync, 60);
    }, { passive: true });
    addEventListener('resize', sync, { passive: true });
    sync();
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
  }, { threshold: .12 });
  qa('.reveal').forEach(el => io.observe(el));

})();
