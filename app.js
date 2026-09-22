(() => {
  'use strict';

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

  const params = new URLSearchParams(location.search);
  const campaign = {
    source: params.get('utm_source') || 'malaysia_nfc_2026',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    content: params.get('utm_content') || ''
  };
  sessionStorage.setItem('noody_tap_campaign', JSON.stringify(campaign));

  function track(event, details = {}) {
    const payload = { event, ...campaign, ...details, ts: Date.now() };
    window.dataLayer?.push(payload);
    window.posthog?.capture?.(event, payload);
    window.dispatchEvent(new CustomEvent('noody:analytics', { detail: payload }));
  }
  track('page_view');

  const vCard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Glacken;Scott;;;',
    'FN:Scott Glacken',
    'ORG:Noody Skincare',
    'TITLE:Co-Founder',
    'EMAIL;TYPE=INTERNET,WORK:scott@noody.co.nz',
    'URL:https://www.noody.co.nz/',
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

  const exchangeSheet = q('#exchangeSheet');
  const wholesaleSheet = q('#wholesaleSheet');
  function openSheet(sheet, event) {
    if (!sheet.open) sheet.showModal();
    haptic();
    track(event);
  }
  q('#exchangeOpen').addEventListener('click', () => openSheet(exchangeSheet, 'exchange_open'));
  q('#exchangeOpenBottom').addEventListener('click', () => openSheet(exchangeSheet, 'exchange_open'));
  q('#wholesaleOpen').addEventListener('click', () => openSheet(wholesaleSheet, 'wholesale_open'));
  qa('[data-close]').forEach(btn => btn.addEventListener('click', () => q(`#${btn.dataset.close}`).close()));

  const form = q('#exchangeForm');
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
      campaign
    };

    const endpoint = window.NOODY_CONFIG?.formEndpoint || '';
    let delivered = false;
    if (endpoint) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(record)
        });
        delivered = res.ok;
      } catch (_) {}
    }

    const existing = JSON.parse(localStorage.getItem('noody_tap_connections') || '[]');
    existing.push(record);
    localStorage.setItem('noody_tap_connections', JSON.stringify(existing));
    track('exchange_submit', { interests, delivered });

    q('#exchangeFormWrap').hidden = true;
    q('#exchangeSuccess').hidden = false;
    q('#successCopy').textContent = delivered
      ? 'Sent. Scott has your details.'
      : 'Saved on this device. Scott can connect a secure form endpoint before launch.';
    haptic([10, 35, 10]);
  });

  qa('[data-track]').forEach(el => el.addEventListener('click', () => track(el.dataset.track, { href: el.href || '' })));

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
  }, { threshold: .12 });
  qa('.reveal').forEach(el => io.observe(el));

})();
