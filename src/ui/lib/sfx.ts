let audioCtx: AudioContext | null = null
let muted = readMutedFromStorage()

function readMutedFromStorage(): boolean {
  try {
    return localStorage.getItem('fs:muted') === '1'
  } catch {
    return false
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

export function setMuted(m: boolean) {
  muted = m
  try {
    localStorage.setItem('fs:muted', m ? '1' : '0')
  } catch {
    // ignore storage failures
  }
}

export function isMuted(): boolean {
  return muted
}

function envelope(
  param: AudioParam,
  ctx: AudioContext,
  attack: number,
  decay: number,
  peak: number,
) {
  const t = ctx.currentTime
  param.setValueAtTime(0.0001, t)
  param.exponentialRampToValueAtTime(peak, t + attack)
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

function tone(freq: number, duration: number, type: OscillatorType, peak: number, delay = 0) {
  if (muted) return
  const ctx = getCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain).connect(ctx.destination)
  const startAt = ctx.currentTime + delay
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.05)
}

function noise(duration: number, peak: number, lowpass?: number) {
  if (muted) return
  const ctx = getCtx()
  if (!ctx) return
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const gain = ctx.createGain()
  let chain: AudioNode = src
  if (lowpass) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = lowpass
    src.connect(filter)
    chain = filter
  }
  chain.connect(gain).connect(ctx.destination)
  envelope(gain.gain, ctx, 0.005, duration, peak)
  src.start()
}

export function playGoalMine() {
  // Bright ascending arpeggio C-E-G-C
  tone(523.25, 0.18, 'sine', 0.22, 0.0)
  tone(659.25, 0.18, 'sine', 0.22, 0.08)
  tone(783.99, 0.35, 'sine', 0.25, 0.16)
  tone(1046.5, 0.5, 'triangle', 0.2, 0.32)
}

export function playGoalOpp() {
  // Descending minor + low rumble
  tone(293.66, 0.22, 'sawtooth', 0.18, 0.0) // D4
  tone(246.94, 0.25, 'sawtooth', 0.18, 0.12) // B3
  tone(196.0, 0.55, 'sawtooth', 0.22, 0.26) // G3
  noise(0.35, 0.07, 600)
}

export function playSave() {
  // Bright ping
  tone(880, 0.1, 'sine', 0.2, 0.0)
  tone(1320, 0.1, 'sine', 0.13, 0.04)
}

export function playHalftime() {
  // Whistle
  tone(1500, 0.55, 'square', 0.13, 0.0)
}

export function playExtraTime() {
  // Tense double-whistle
  tone(880, 0.18, 'square', 0.13, 0.0)
  tone(880, 0.25, 'square', 0.13, 0.25)
}

export function playKick() {
  // Thud
  noise(0.06, 0.13, 250)
  tone(140, 0.08, 'triangle', 0.1, 0.0)
}

export function playCardPlace() {
  tone(680, 0.04, 'sine', 0.07, 0.0)
}
