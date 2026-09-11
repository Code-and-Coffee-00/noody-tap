(() => {
  'use strict';

  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    burst(24);
  });

  qa('[data-track]').forEach(el => el.addEventListener('click', () => track(el.dataset.track, { href: el.href || '' })));

  function burst(count = 16) {
    const layer = q('#confettiLayer');
    const colors = ['#24b57b','#7be451','#f35ab3','#9a73dd','#65c6ef','#ffd94d'];
    for (let i = 0; i < count; i++) {
      const s = document.createElement('i');
      s.className = 'confetti';
      s.style.background = colors[i % colors.length];
      s.style.setProperty('--x', `${(Math.random() - .5) * 500}px`);
      s.style.setProperty('--y', `${(Math.random() - .65) * 460}px`);
      s.style.setProperty('--r', `${(Math.random() - .5) * 720}deg`);
      s.style.animationDelay = `${Math.random() * .08}s`;
      layer.appendChild(s);
      setTimeout(() => s.remove(), 1200);
    }
  }

  const avatar = q('#avatarCore');
  let taps = [];
  avatar.addEventListener('click', () => {
    const now = Date.now();
    taps = [...taps.filter(t => now - t < 1900), now];
    haptic(6);
    avatar.animate([
      { scale: '1' }, { scale: '.93' }, { scale: '1.04' }, { scale: '1' }
    ], { duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)' });
    if (taps.length >= 5) {
      taps = [];
      burst(36);
      haptic([8,25,8,25,15]);
      showToast('Noody party mode ✦');
    }
  });

  const stage = q('#avatarStage');
  if (!reduceMotion) {
    const move = (x, y) => {
      const r = stage.getBoundingClientRect();
      const mx = Math.max(-1, Math.min(1, (x - r.left - r.width / 2) / (r.width / 2)));
      const my = Math.max(-1, Math.min(1, (y - r.top - r.height / 2) / (r.height / 2)));
      stage.style.setProperty('--tilt-x', `${(-my * 5).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(mx * 5).toFixed(2)}deg`);
      stage.style.setProperty('--pax', `${(-mx * 10).toFixed(2)}px`);
      stage.style.setProperty('--pay', `${(-my * 8).toFixed(2)}px`);
      stage.style.setProperty('--pbx', `${(mx * 8).toFixed(2)}px`);
      stage.style.setProperty('--pby', `${(my * 10).toFixed(2)}px`);
    };
    stage.addEventListener('pointermove', e => move(e.clientX, e.clientY));
    stage.addEventListener('pointerleave', () => {
      ['--tilt-x','--tilt-y'].forEach(v => stage.style.setProperty(v,'0deg')); ['--pax','--pay','--pbx','--pby'].forEach(v => stage.style.setProperty(v,'0px'));
    });

    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return;
      const mx = Math.max(-1, Math.min(1, e.gamma / 25));
      const my = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
      stage.style.setProperty('--tilt-x', `${(-my * 4).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(mx * 4).toFixed(2)}deg`);
      stage.style.setProperty('--pax', `${(-mx * 8).toFixed(2)}px`);
      stage.style.setProperty('--pay', `${(-my * 6).toFixed(2)}px`);
      stage.style.setProperty('--pbx', `${(mx * 6).toFixed(2)}px`);
      stage.style.setProperty('--pby', `${(my * 8).toFixed(2)}px`);
    }, { passive: true });
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
  }, { threshold: .12 });
  qa('.reveal').forEach(el => io.observe(el));

  const progress = q('#progressBar');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

})();
