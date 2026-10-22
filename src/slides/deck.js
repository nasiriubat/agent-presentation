// The deck: reveal.js slides, a three.js backdrop, demos mounted per slide, and stage/phone modes.
import Reveal from 'reveal.js';
import RevealNotes from 'reveal.js/plugin/notes/notes.esm.js';
import 'reveal.js/dist/reveal.css';
import './slides.css';
import { liveAvailable, isPublic, forcedReplay, setForcedReplay } from '../core/modes.js';
import { withTimeout } from '../core/timeout.js';
import { icon } from '../ui/icons.js';

const DEMOS = {
  coldopen: () => import('../demos/coldopen.js').then((m) => m.mount),
  demo1: () => import('../demos/demo1.js').then((m) => m.mount),
  memory: () => import('../demos/memory.js').then((m) => m.mount),
  demo2: () => import('../demos/demo2.js').then((m) => m.mount),
  finale: () => import('../voice/finale.js').then((m) => (el, opts) => m.mountFinale(el, opts)),
};

const NEXT = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Spacebar']);
const params = new URLSearchParams(location.search);
const mobile = matchMedia('(max-width: 760px)').matches && !params.has('deck');
let mode = 'replay';
const mounted = new Map(); // section -> demo controller (or a promise of one)

async function demoFor(section) {
  if (!section?.dataset.demo) return null;
  if (!mounted.has(section)) {
    const host = section.querySelector('.demo-host');
    mounted.set(section, DEMOS[section.dataset.demo]().then((mount) => mount(host, { mode })));
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

// Leaving a demo slide pauses it but keeps its state, so stepping back by mistake costs nothing:
// the demo is still where it was, and → moves on again. Only ↺ starts a demo over.
function pauseDemo(section) {
  mounted.get(section)?.then((d) => d?.pause?.());
}

// A small notice near the mode badge, e.g. when live mode isn't available.
let toastTimer;
function toast(text) {
  let el = document.querySelector('.deck-toast');
  if (!el) { el = document.createElement('div'); el.className = 'deck-toast'; document.body.append(el); }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function renderBadges() {
  const badge = document.getElementById('mode-badge');
  badge.textContent = mode === 'live' ? '● LIVE' : '▶ REPLAY';
  badge.title = mode === 'live' ? 'Live: demos call the model. Click to force replay.' : 'Replay: demos play recordings. Click to go live (needs the local server: npm run stage).';
  badge.className = mode;
}

function remountAll() {
  for (const section of [...mounted.keys()]) unmount(section);
  if (!mobile) demoFor(Reveal.getCurrentSlide());
}

function wireBadges() {
  document.getElementById('mode-badge').onclick = async () => {
    if (isPublic()) return;
    if (mode === 'live') { setForcedReplay(true); mode = 'replay'; toast('Replay mode: every demo plays its recording.'); }
    else {
      setForcedReplay(false);
      mode = (await liveAvailable()) ? 'live' : 'replay';
      toast(mode === 'live' ? 'Live mode: demos call the model.' : 'The local server is not running. Start it with: npm run stage');
    }
    renderBadges();
    remountAll();
  };
}

// <i data-icon="name"> placeholders in the HTML become inline SVGs
function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
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
    io.observe(s);
    const play = document.createElement('button');
    play.className = 'phone-play';
    play.type = 'button';
    const label = (text) => { play.innerHTML = `${icon('play')} ${text}`; };
    label('Play this demo');
    play.onclick = async () => {
      play.disabled = true;
      label('Loading…');
      try {
        const d = await withTimeout(demoFor(s), 15000, 'demo load timed out');
        play.remove();
        d.autoplay();
      } catch (err) {
        console.warn(err);
        mounted.delete(s); // the next tap mounts again
        play.disabled = false;
        play.classList.add('error');
        label('Could not load. Tap to retry');
      }
    };
    s.querySelector('.demo-host').before(play);
  });
}

async function deckView() {
  const { createStage3d } = await import('../scene/stage3d.js');
  const stage = createStage3d(document.getElementById('stage3d'));

  // the public site gets on-screen arrows for laptop visitors; on stage the clicker is the only control
  const controls = isPublic();
  document.body.classList.toggle('has-controls', controls);
  Reveal.initialize({
    hash: true, width: 1600, height: 900, margin: 0.03, minScale: 0.2, maxScale: 2,
    transition: 'fade', backgroundTransition: 'fade', transitionSpeed: 'fast', controls, progress: true, center: true,
    keyboard: { 33: 'prev', 34: 'next' },
    plugins: [RevealNotes],
  });

  // the footer on every slide: talk title left, slide number in the middle, organiser × host on the right
  const footer = document.createElement('div');
  footer.className = 'deck-footer';
  footer.innerHTML = `<span class="deck-title">${document.title}</span><span class="deck-page"></span><span class="deck-credit">GPT-Lab × Crazytown Tampere</span>`;
  document.body.append(footer);
  const all = [...document.querySelectorAll('.slides > section')];
  const updateFooter = (slide) => {
    footer.querySelector('.deck-page').textContent = `${all.indexOf(slide) + 1} / ${all.length}`;
    footer.classList.toggle('off', slide.dataset.footer === 'off');
  };

  const sync = (slide) => {
    stage.show(slide.dataset.scene ?? null);
    if (slide.dataset.scene === 'brain') stage.setBrainStage(slide.querySelectorAll('.fragment.visible[data-brain]').length);
    updateFooter(slide);
    demoFor(slide);
  };
  Reveal.on('ready', (e) => sync(e.currentSlide));
  // Arriving on a demo slide by stepping back means the presenter wants to go forward again, not
  // re-run the demo: the next → leaves the slide. Clicking any demo control re-engages the demo.
  const arrivedBackwards = new WeakSet();
  Reveal.on('slidechanged', (e) => {
    sync(e.currentSlide);
    if (e.previousSlide) pauseDemo(e.previousSlide);
    if (e.previousSlide && e.currentSlide.dataset.demo && e.indexh < Reveal.getIndices(e.previousSlide).h) arrivedBackwards.add(e.currentSlide);
  });
  addEventListener('click', (e) => { const s = e.target.closest?.('section[data-demo]'); if (s) arrivedBackwards.delete(s); }, true);
  globalThis.__deck = { mounted, arrivedBackwards, Reveal }; // for the preflight page and debugging in the console
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
    if (arrivedBackwards.has(slide)) { arrivedBackwards.delete(slide); Reveal.next(); return; }
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
  fillIcons();
  if (params.has('notes')) return notesView();
  mode = (await liveAvailable()) ? 'live' : 'replay';
  renderBadges();
  wireBadges();
  if (isPublic()) document.querySelector('.mode-bar').hidden = true;
  if (mobile) return phoneView();
  await deckView();
})();

export { forcedReplay };
