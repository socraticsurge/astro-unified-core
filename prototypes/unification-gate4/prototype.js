(() => {
  const root = document.documentElement;
  const screens = [...document.querySelectorAll('.screen')];
  const navLinks = [...document.querySelectorAll('.nav-link[data-screen]')];
  const mobileMenu = document.querySelector('#mobile-menu');
  const mobileNav = document.querySelector('#mobile-nav');
  const titles = {
    home: 'Today', panchangam: 'Panchangam', horoscope: 'Daily Horoscopes',
    muhurtam: 'Muhurtam', dashboard: 'Your Dashboard', onboarding: 'Create Profile', admin: 'Admin Preview'
  };

  function showScreen(name, scrollTarget) {
    screens.forEach((screen) => screen.classList.toggle('active', screen.dataset.view === name));
    navLinks.forEach((link) => link.classList.toggle('active', link.dataset.screen === name && !link.dataset.scroll));
    document.body.dataset.screen = name;
    document.title = `${titles[name] || 'Astro Chaganti'} — Gate 4 Prototype`;
    mobileNav.hidden = true;
    mobileMenu.setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (scrollTarget) requestAnimationFrame(() => document.querySelector(`#${scrollTarget}`)?.scrollIntoView({ behavior: 'smooth' }));
  }

  navLinks.forEach((link) => link.addEventListener('click', () => showScreen(link.dataset.screen, link.dataset.scroll)));
  mobileMenu.addEventListener('click', () => {
    const willOpen = mobileNav.hidden;
    mobileNav.hidden = !willOpen;
    mobileMenu.setAttribute('aria-expanded', String(willOpen));
  });

  document.querySelector('#theme-toggle').addEventListener('click', (event) => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    event.currentTarget.setAttribute('aria-label', `Switch to ${next === 'light' ? 'dark' : 'light'} theme`);
  });

  const readings = {
    Mesha: ['♈', 'A deliberate pace serves you better today. Mars supports decisive work, while the Moon asks that important conversations be given more room than usual.'],
    Vrishabha: ['♉', 'Practical choices settle the day. Keep resources organised and allow a trusted conversation to clarify what deserves your commitment.'],
    Mithuna: ['♊', 'Mercury sharpens your questions today. Complete one important exchange before opening several new lines of thought.'],
    Karka: ['♋', 'Protect a little quiet at the start of the day. Emotional clarity improves when you distinguish what is urgent from what is merely loud.'],
    Simha: ['♌', 'Visibility helps when it serves a clear purpose. Lead with warmth, then give collaborators room to strengthen the result.'],
    Kanya: ['♍', 'Small corrections create meaningful momentum. Attend to the system beneath the symptom and keep the afternoon flexible.'],
    Tula: ['♎', 'Balance comes from naming the real trade-off. A gracious but direct conversation can restore movement to a stalled choice.'],
    Vrischika: ['♏', 'Your concentration is strong, but intensity needs direction. Place it into one consequential task and resist unnecessary testing of others.'],
    Dhanu: ['♐', 'A wider perspective is available once the immediate obligation is handled. Plan boldly, but verify the practical route.'],
    Makara: ['♑', 'Steady effort carries more influence than a dramatic push. Review the terms of a responsibility before accepting more of it.'],
    Kumbha: ['♒', 'A useful idea needs a human bridge. Explain the benefit in familiar language and invite one grounded response before scaling it.'],
    Meena: ['♓', 'Intuition is informative when paired with a boundary. Give creative work room, while keeping financial and time commitments explicit.']
  };
  document.querySelectorAll('.sign').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.sign').forEach((item) => item.classList.toggle('active', item === button));
    const [symbol, copy] = readings[button.dataset.sign];
    document.querySelector('#reading-symbol').textContent = symbol;
    document.querySelector('#reading-sign').textContent = button.dataset.sign;
    document.querySelector('#reading-copy').textContent = copy;
  }));

  document.querySelectorAll('.workspace-tabs button').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.workspace-tabs button').forEach((item) => item.classList.toggle('active', item === button));
  }));
  document.querySelectorAll('.admin-sidebar nav button').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.admin-sidebar nav button').forEach((item) => item.classList.toggle('active', item === button));
  }));
})();
