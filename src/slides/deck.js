// The deck: reveal.js slides, a three.js backdrop, demos mounted per slide, and stage/phone modes.
import Reveal from 'reveal.js';
import RevealNotes from 'reveal.js/plugin/notes/notes.esm.js';
import 'reveal.js/dist/reveal.css';
import './slides.css';
import { liveAvailable, isPublic, forcedReplay, setForcedReplay } from '../core/modes.js';
import { withTimeout } from '../core/timeout.js';

const DEMOS = {
  coldopen: () => import('../demos/coldopen.js').then((m) => m.mount),
  demo1: () => import('../demos/demo1.js').then((m) => m.mount),
  memory: () => import('../demos/memory.js').then((m) => m.mount),
  demo2: () => import('../demos/demo2.js').then((m) => m.mount),
  finale: () => import('../voice/finale.js').then((m) => (el, opts) => m.mountFinale(el, opts)),
  qa: () => import('../voice/finale.js').then((m) => (el, opts) => {
    const f = m.mountFinale(el, { ...opts });
    let started = false;
    return {
      step: async () => { if (started || opts.mode !== 'live') return false; started = true; await f.startQa(); return true; },
      autoplay: async () => {},
      reset: () => { started = false; f.reset(); },
    };
  }),
};

const NEXT = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Spacebar']);
const params = new URLSearchParams(location.search);
const mobile = matchMedia('(max-width: 760px)').matches && !params.has('deck');
let mode = 'replay';
let who = localStorage.getItem('buzz') === 'nasir' ? 'nasir' : 'aidul';
const mounted = new Map(); // section -> demo controller (or a promise of one)

async function demoFor(section) {
  if (!section?.dataset.demo) return null;
  if (!mounted.has(section)) {
    const host = section.querySelector('.demo-host');
    mounted.set(section, DEMOS[section.dataset.demo]().then((mount) => mount(host, { mode, who })));
  }
  return mounted.get(section);
}

function unmount(section) {
  const p = mounted.get(section);
  if (!p) return;
  mounted.delete(section);
  p.then((d) => d?.reset?.());
  section.querySelector('.demo-host').innerHTML = '';
}

function renderBadges() {
  const badge = document.getElementById('mode-badge');
  badge.textContent = mode === 'live' ? '● LIVE' : '▶ REPLAY';
  badge.className = mode;
  document.getElementById('buzz-badge').textContent = `📱 ${who === 'nasir' ? 'Nasir' : 'Aidul'}`;
  document.getElementById('buzz-badge').hidden = mode !== 'live';
}

function remountAll() {
  for (const section of [...mounted.keys()]) unmount(section);
  if (!mobile) demoFor(Reveal.getCurrentSlide());
}

function wireBadges() {
  document.getElementById('mode-badge').onclick = async () => {
    if (isPublic()) return;
    if (mode === 'live') { setForcedReplay(true); mode = 'replay'; }
    else { setForcedReplay(false); mode = (await liveAvailable()) ? 'live' : 'replay'; }
    renderBadges();
    remountAll();
  };
  document.getElementById('buzz-badge').onclick = () => {
    who = who === 'nasir' ? 'aidul' : 'nasir';
    localStorage.setItem('buzz', who);
    renderBadges();
    remountAll();
  };
}

// ?notes : every slide's speaker notes as one scrolling page (for a phone when the screen is mirrored)
function notesView() {
  document.body.classList.add('notes-view');
  const list = document.createElement('main');
  list.className = 'notes-list';
  document.querySelectorAll('.slides > section').forEach((s, i) => {
    const notes = s.querySelector('aside.notes');
    list.insertAdjacentHTML('beforeend', `<article><h2>${i + 1}. ${s.dataset.title ?? ''}</h2>${notes?.innerHTML ?? ''}</article>`);
  });
  document.body.replaceChildren(list);
}

// Phones get a plain scrolling page with every demo playable, instead of a scaled-down deck.
async function phoneView() {
  document.body.classList.add('phone');
  const intro = document.createElement('p');
  intro.className = 'phone-intro';
  intro.textContent = 'Tap ▶ on any demo to watch the agent at work.';
  document.querySelector('.slides').prepend(intro);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { demoFor(e.target); io.unobserve(e.target); }
  }, { rootMargin: '300px' });
  document.querySelectorAll('section[data-demo]').forEach((s) => {
    if (s.dataset.demo === 'qa') { s.remove(); return; }
    io.observe(s);
    const play = document.createElement('button');
    play.className = 'phone-play';
    play.textContent = '▶ Play this demo';
    play.onclick = async () => { const d = await demoFor(s); play.remove(); d.autoplay(); };
    s.querySelector('.demo-host').before(play);
  });
}

async function deckView() {
  const { createStage3d } = await import('../scene/stage3d.js');
  const stage = createStage3d(document.getElementById('stage3d'));

  Reveal.initialize({
    hash: true, width: 1600, height: 900, margin: 0.03, minScale: 0.2, maxScale: 2,
    transition: 'fade', backgroundTransition: 'fade', controls: true, progress: true, center: true,
    keyboard: { 33: 'prev', 34: 'next' },
    plugins: [RevealNotes],
  });

  const sync = (slide) => {
    stage.show(slide.dataset.scene ?? null);
    if (slide.dataset.scene === 'brain') stage.setBrainStage(slide.querySelectorAll('.fragment.visible[data-brain]').length);
    demoFor(slide);
  };
  Reveal.on('ready', (e) => sync(e.currentSlide));
  Reveal.on('slidechanged', (e) => { sync(e.currentSlide); if (e.previousSlide) unmount(e.previousSlide); });
  Reveal.on('fragmentshown', () => sync(Reveal.getCurrentSlide()));
  Reveal.on('fragmenthidden', () => sync(Reveal.getCurrentSlide()));

  // On a demo slide, "next" steps the demo; the slide only advances once the demo is finished.
  let busy = false;
  addEventListener('keydown', async (e) => {
    if (!NEXT.has(e.key) || e.target.closest?.('input, textarea')) return;
    const slide = Reveal.getCurrentSlide();
    if (!slide?.dataset.demo) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (busy) return;
    busy = true;
    try {
      // a step that hangs (network) must never lock the clicker: give up waiting after 15 s
      const demo = await withTimeout(demoFor(slide), 15000, 'demo load timed out');
      const more = await withTimeout(demo.step(), 15000, 'demo step timed out').catch((err) => { console.warn(err.message); return true; });
      if (!more) Reveal.next();
    } catch (err) {
      console.warn(err.message);
      mounted.delete(slide); // let the next press retry the mount
    } finally {
      busy = false;
    }
  }, true);
}

(async function main() {
  if (params.has('notes')) return notesView();
  mode = (await liveAvailable()) ? 'live' : 'replay';
  renderBadges();
  wireBadges();
  if (isPublic()) document.querySelector('.mode-bar').hidden = true;
  if (mobile) return phoneView();
  await deckView();
})();

export { forcedReplay };
