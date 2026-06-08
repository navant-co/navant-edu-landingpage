'use strict';

// ─── NAVBAR ──────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ─── ACTIVE NAV ──────────────────────────────────────────────
const sections = [...document.querySelectorAll('section[id]')];
const navAnchors = [...document.querySelectorAll('.nav-links a')];
window.addEventListener('scroll', () => {
    let curr = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 130) curr = s.id; });
    navAnchors.forEach(a => a.classList.toggle('nav-active', a.getAttribute('href') === `#${curr}`));
}, { passive: true });

// ─── SCROLL REVEAL ───────────────────────────────────────────
const ro = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); ro.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => ro.observe(el));

// ─── TABS ────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const t = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${t}`)?.classList.add('active');
        // Re-trigger reveal for newly visible cards
        document.querySelectorAll(`#tab-${t} [data-reveal]`).forEach(el => {
            el.classList.remove('is-visible');
            setTimeout(() => ro.observe(el), 10);
        });
    });
});

// ─── LIVE FEED TICKER ────────────────────────────────────────
const feedItems = [...document.querySelectorAll('.feed-item')];
let feedIdx = 0;
const tickFeed = () => {
    feedItems.forEach(fi => fi.style.cssText = '');
    const active = feedItems[feedIdx % feedItems.length];
    active.style.background = 'rgba(99,102,241,0.06)';
    active.style.borderColor = 'rgba(99,102,241,0.2)';
    setTimeout(() => { active.style.cssText = ''; }, 1100);
    feedIdx++;
};
setInterval(tickFeed, 2200);
tickFeed();

// ─── KPI COUNTER ANIMATION ───────────────────────────────────
const kpiEls = [...document.querySelectorAll('.kpi-value[data-count]')];
const kpiObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const fmt    = el.dataset.format;
        const dur    = 1400;
        let start;
        const step = ts => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const val = target * ease;
            if      (fmt === 'currency') el.textContent = `R$ ${(val/1e6).toFixed(1)}M`;
            else if (fmt === 'pct')      el.textContent = `${val.toFixed(1)}%`;
            else if (fmt === 'int')      el.textContent = Math.round(val).toLocaleString('pt-BR');
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        kpiObs.unobserve(el);
    });
}, { threshold: 0.6 });
kpiEls.forEach(el => kpiObs.observe(el));

// ─── MOUSE PARALLAX ──────────────────────────────────────────
const orb1 = document.querySelector('.bg-orb-1');
const orb2 = document.querySelector('.bg-orb-2');
window.addEventListener('mousemove', e => {
    const mx = (e.clientX / window.innerWidth  - 0.5) * 25;
    const my = (e.clientY / window.innerHeight - 0.5) * 25;
    if (orb1) orb1.style.transform = `translate(${mx * 0.4}px, ${my * 0.4}px)`;
    if (orb2) orb2.style.transform = `translate(${-mx * 0.3}px, ${-my * 0.3}px)`;
}, { passive: true });

// ─── CTA HANDLER ─────────────────────────────────────────────
function handleCTA() {
    const fields = {
        inst:    document.getElementById('inst-name'),
        name:    document.getElementById('contact-name'),
        email:   document.getElementById('contact-email'),
        phone:   document.getElementById('contact-phone'),
    };
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email?.value || '');
    const allFilled = Object.values(fields).every(f => f?.value?.trim());

    if (!allFilled || !emailOk) {
        Object.values(fields).forEach(f => {
            if (!f?.value?.trim() || (f === fields.email && !emailOk)) {
                f.style.borderColor = 'rgba(239,68,68,0.5)';
                f.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.08)';
                setTimeout(() => { f.style.borderColor = ''; f.style.boxShadow = ''; }, 2500);
            }
        });
        const firstEmpty = Object.values(fields).find(f => !f?.value?.trim());
        firstEmpty?.focus();
        return;
    }

    const btn = document.getElementById('cta-btn');
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></span>&nbsp;Enviando...`;

    setTimeout(() => {
        btn.innerHTML = `✓ Agendado! Entraremos em contato em até 1 dia útil.`;
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        Object.values(fields).forEach(f => { if (f) f.value = ''; });
        setTimeout(() => {
            btn.innerHTML = `Agendar minha demonstração <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M9 3l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            btn.style.background = '';
            btn.disabled = false;
        }, 5000);
    }, 1800);
}

// Inject base keyframe for spinner + active nav
const s = document.createElement('style');
s.textContent = `
@keyframes spin { to { transform: rotate(360deg); } }
.nav-active { color: #f0f4ff !important; }
.nav-active::after { width: 100% !important; }
`;
document.head.appendChild(s);
