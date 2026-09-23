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
  const campaign = {
    source:   params.get('utm_source')   || 'direct',
    medium:   params.get('utm_medium')   || '',
    campaign: params.get('utm_campaign') || '',
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
    'TITLE:Co-Founder',
    'EMAIL;TYPE=INTERNET,WORK:scott@noody.co.nz',
    'TEL;TYPE=CELL,VOICE:+64204726884',
    'URL:https://www.noody.co.nz/',
    'URL:https://www.linkedin.com/in/scott-glacken-nz/',
    'X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/scott-glacken-nz/',
    'NOTE:Met via Noody Malaysia 2026',
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
  q('#shareProfile').addEventListener('click', shareProfile);
  q('#shareProfileBottom').addEventListener('click', shareProfile);

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

    submitBtn().textContent = 'Sending…';
    form.querySelector('button[type=submit]').disabled = true;

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
      // Never claim a delivery that did not happen.
      q('#successTitle').textContent = 'One more tap.';
      q('#successCopy').textContent = result.reason === 'network'
        ? 'The connection dropped before that sent. Open it as an email and it will reach Scott.'
        : 'Send these straight to Scott instead — it takes one tap.';
      const cta = q('#successCta');
      cta.textContent = 'Email my details ↗';
      cta.href = fallbackMailto(record);
      cta.removeAttribute('target');
    }

    haptic([10, 35, 10]);
  });

  qa('[data-track]').forEach(el => el.addEventListener('click', () => track(el.dataset.track)));

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
  }, { threshold: .12 });
  qa('.reveal').forEach(el => io.observe(el));

})();
