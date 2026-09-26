/**
 * Звук: чиптюн-эффекты и музыка синтезируются WebAudio (без файлов — лёгкая первая загрузка).
 * По умолчанию звук молчит до первого касания (политики браузеров и требование ТЗ).
 */
import { useGame } from '../store/game';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let noise: AudioBuffer | null = null;
let unlocked = false;
let musicTimer: number | null = null;
let musicAct = 0;

function vol() {
  const s = useGame.getState().state?.settings;
  return { sfx: s?.sfx ?? 0.8, music: s?.music ?? 0.6 };
}

export function initAudio() {
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
      sfxGain = ctx.createGain();
      musicGain = ctx.createGain();
      sfxGain.connect(master);
      musicGain.connect(master);
      applyVolumes();
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      startMusic(1);
    } catch {
      /* без звука */
    }
    removeEventListener('pointerdown', unlock);
  };
  addEventListener('pointerdown', unlock);
  useGame.subscribe((g, prev) => {
    if (g.state?.settings !== prev.state?.settings) applyVolumes();
  });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
}

function applyVolumes() {
  if (!sfxGain || !musicGain) return;
  const v = vol();
  sfxGain.gain.value = v.sfx * 0.5;
  musicGain.gain.value = v.music * 0.16;
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.5, slide = 0, delay = 0, dest?: AudioNode) {
  if (!ctx || !sfxGain) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest ?? sfxGain);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function hiss(dur: number, gain = 0.3, freq = 2000, delay = 0) {
  if (!ctx || !sfxGain || !noise) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(sfxGain);
  src.start(t0);
  src.stop(t0 + dur);
}

let lastPlayed: Record<string, number> = {};

export function sfx(name: string) {
  if (!ctx || vol().sfx <= 0) return;
  const now = performance.now();
  // не спамим одинаковыми звуками на ускоренном бою
  if (now - (lastPlayed[name] ?? 0) < 60) return;
  lastPlayed[name] = now;
  switch (name) {
    case 'hit':
      hiss(0.08, 0.35, 1200);
      tone(140, 0.08, 'square', 0.15, -60);
      break;
    case 'arrow':
      hiss(0.1, 0.2, 4000);
      break;
    case 'magic':
      tone(660, 0.12, 'triangle', 0.18, 300);
      break;
    case 'skill':
      tone(440, 0.1, 'square', 0.15, 220);
      tone(880, 0.12, 'triangle', 0.12, 0, 0.06);
      break;
    case 'ult':
      tone(220, 0.35, 'sawtooth', 0.18, 440);
      hiss(0.35, 0.25, 800);
      tone(880, 0.3, 'square', 0.1, 0, 0.12);
      break;
    case 'coin':
      tone(988, 0.06, 'square', 0.12);
      tone(1318, 0.12, 'square', 0.12, 0, 0.06);
      break;
    case 'summon':
      tone(300, 0.25, 'triangle', 0.18, 300);
      break;
    case 'mech':
      tone(180, 0.4, 'sawtooth', 0.14, -80);
      break;
    case 'wave':
      tone(523, 0.08, 'square', 0.12);
      tone(784, 0.14, 'square', 0.12, 0, 0.08);
      break;
    case 'bossStart':
      tone(110, 0.5, 'sawtooth', 0.2, 0);
      tone(98, 0.6, 'square', 0.12, 0, 0.2);
      break;
    case 'victory':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.14, 0, i * 0.1));
      break;
    case 'defeat':
      [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, 0, i * 0.15));
      break;
    case 'levelup':
      [523, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.12, 0, i * 0.06));
      break;
    case 'click':
      tone(700, 0.03, 'square', 0.06);
      break;
    case 'loot':
      for (let i = 0; i < 6; i++) tone(900 + i * 120, 0.06, 'square', 0.08, 0, i * 0.04);
      break;
    case 'enhanceOk':
      tone(660, 0.1, 'square', 0.12);
      tone(990, 0.2, 'triangle', 0.14, 0, 0.08);
      hiss(0.15, 0.15, 5000, 0.05);
      break;
    case 'enhanceFail':
      tone(200, 0.3, 'sawtooth', 0.12, -100);
      break;
    case 'rare':
      [659, 784, 988, 1318, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.14, 0, i * 0.08));
      break;
  }
}

// ——— музыка: генеративный чиптюн-луп, своя тональность на акт ———
const ROOTS = [0, 220, 196, 233, 207, 174, 185, 262, 247, 165, 155];
const MINOR = [0, 3, 5, 7, 10, 12, 15];

function startMusic(act: number) {
  if (!ctx || !musicGain) return;
  if (musicAct === act && musicTimer) return;
  musicAct = act;
  if (musicTimer) clearInterval(musicTimer);
  const root = ROOTS[act] ?? 220;
  let step = 0;
  const beat = 0.22;
  let next = ctx.currentTime + 0.1;
  const pattern = [0, 2, 4, 2, 5, 4, 2, 1];
  const bass = [0, 0, -5, -5, -2, -2, -7, -7];
  musicTimer = window.setInterval(() => {
    if (!ctx || !musicGain || vol().music <= 0) return;
    while (next < ctx.currentTime + 0.5) {
      const bar = Math.floor(step / 8) % 8;
      const n = pattern[(step + bar) % 8];
      const f = root * Math.pow(2, MINOR[n] / 12);
      tone(f * 2, beat * 0.9, 'square', 0.25, 0, next - ctx.currentTime, musicGain);
      if (step % 2 === 0) tone((root / 2) * Math.pow(2, bass[bar] / 12), beat * 1.8, 'triangle', 0.5, 0, next - ctx.currentTime, musicGain);
      next += beat;
      step++;
    }
  }, 120);
}
