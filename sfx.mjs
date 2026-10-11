// 코드로 효과음을 합성해 WAV로 저장한다(외부 샘플·라이브러리 0개, 순수 수학).
// 사용: node sfx.mjs [출력폴더=public/sfx] [--bgm 초]
// 모든 소리는 결정적(같은 코드 → 같은 파일)이라 영상 재렌더 시 결과가 바뀌지 않는다.
import fs from 'node:fs'
import path from 'node:path'

const SR = 48000

// ── 기본 재료 ────────────────────────────────────────────────
// 결정적 난수(노이즈용) — Math.random 대신 써서 매번 같은 소리
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296 * 2 - 1
  }
}
const buf = (sec) => new Float32Array(Math.ceil(sec * SR))
// 지수 감쇠 엔벨로프(attack 짧게 → decay)
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d))
// 위상 누적 오실레이터(주파수가 시간에 따라 변해도 끊김 없음)
function osc(out, freqAt, ampAt, shape = 'sine', start = 0) {
  let ph = 0
  for (let i = 0; i < out.length; i++) {
    const t = i / SR
    if (t < start) continue
    const lt = t - start
    ph += (2 * Math.PI * freqAt(lt)) / SR
    let v
    if (shape === 'sine') v = Math.sin(ph)
    else if (shape === 'tri') v = (2 / Math.PI) * Math.asin(Math.sin(ph))
    else if (shape === 'square') v = Math.sin(ph) >= 0 ? 0.6 : -0.6
    else v = ((ph / Math.PI) % 2) - 1 // saw
    out[i] += v * ampAt(lt)
  }
  return out
}
// 1극 저역통과 필터(컷오프가 시간에 따라 변할 수 있음)
function lowpass(x, cutAt) {
  let y = 0
  for (let i = 0; i < x.length; i++) {
    const a = 1 - Math.exp((-2 * Math.PI * cutAt(i / SR)) / SR)
    y += a * (x[i] - y)
    x[i] = y
  }
  return x
}
function highpass(x, cut) {
  const a = Math.exp((-2 * Math.PI * cut) / SR)
  let prevX = 0, y = 0
  for (let i = 0; i < x.length; i++) {
    y = a * (y + x[i] - prevX)
    prevX = x[i]
    x[i] = y
  }
  return x
}
function noise(out, ampAt, seed = 1) {
  const r = rng(seed)
  for (let i = 0; i < out.length; i++) out[i] += r() * ampAt(i / SR)
  return out
}
// 피크 정규화 + 끝 클릭 방지 페이드
function finish(x, peak = 0.8) {
  let m = 0
  for (const v of x) m = Math.max(m, Math.abs(v))
  const g = m > 0 ? peak / m : 1
  const fade = Math.min(x.length, Math.floor(0.01 * SR))
  for (let i = 0; i < x.length; i++) {
    x[i] *= g
    const k = x.length - 1 - i
    if (k < fade) x[i] *= k / fade
  }
  return x
}

// ── 효과음 레시피 ────────────────────────────────────────────
export const RECIPES = {
  // 장면 전환: 대역이 위로 쓸려 올라가는 바람 소리
  whoosh() {
    const d = 0.55, x = buf(d)
    noise(x, (t) => Math.sin(Math.PI * Math.min(1, t / d)) ** 2, 7)
    lowpass(x, (t) => 300 + 5000 * (t / d) ** 1.5)
    return finish(highpass(x, 120), 0.6)
  },
  // 요소 등장: 짧게 톡 튀는 소리(음높이 급하강)
  pop() {
    const d = 0.14, x = buf(d)
    osc(x, (t) => 900 * Math.exp(-t * 28) + 260, (t) => env(t, 0.002, 0.035))
    return finish(x, 0.7)
  },
  // 강조·정답: 맑은 종소리(배음 3개)
  ding() {
    const d = 1.2, x = buf(d)
    for (const [f, a, dc] of [[1318.5, 1, 0.35], [2637, 0.35, 0.18], [3955.5, 0.15, 0.1]]) osc(x, () => f, (t) => a * env(t, 0.003, dc))
    return finish(x, 0.55)
  },
  // 가벼운 클릭(UI)
  click() {
    const d = 0.05, x = buf(d)
    noise(x, (t) => env(t, 0.0005, 0.006), 3)
    osc(x, () => 2200, (t) => 0.5 * env(t, 0.0005, 0.01))
    return finish(highpass(x, 800), 0.5)
  },
  // 숫자 올라갈 때: 아주 짧은 똑
  tick() {
    const d = 0.04, x = buf(d)
    osc(x, () => 1800, (t) => env(t, 0.0005, 0.008), 'tri')
    return finish(x, 0.35)
  },
  // 반짝: 높은 음 4개가 빠르게 올라감
  sparkle() {
    const d = 0.8, x = buf(d)
    ;[2093, 2637, 3136, 4186].forEach((f, k) => osc(x, () => f, (t) => env(t, 0.002, 0.12) * 0.6, 'sine', k * 0.06))
    return finish(x, 0.45)
  },
  // 완료·마무리: 장3화음 아르페지오(도-미-솔-도)
  success() {
    const d = 1.4, x = buf(d)
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, k) => {
      osc(x, () => f, (t) => env(t, 0.005, 0.45), 'tri', k * 0.09)
      osc(x, () => f * 2, (t) => 0.2 * env(t, 0.005, 0.2), 'sine', k * 0.09)
    })
    return finish(x, 0.6)
  },
  // 쿵: 무게감 있는 낮은 타격(큰 숫자·핵심 등장)
  thud() {
    const d = 0.6, x = buf(d)
    osc(x, (t) => 50 + 110 * Math.exp(-t * 18), (t) => env(t, 0.002, 0.16))
    noise(x, (t) => 0.25 * env(t, 0.001, 0.015), 11)
    return finish(lowpass(x, () => 2000), 0.85)
  },
  // 뾰옹: 위로 올라가는 질문/호기심 소리
  rise() {
    const d = 0.35, x = buf(d)
    osc(x, (t) => 300 + 900 * (t / d) ** 2, (t) => Math.sin(Math.PI * Math.min(1, t / d)) * 0.8, 'tri')
    return finish(x, 0.45)
  },
  // 띠용: 틀림/주의(내려가는 두 음)
  wrong() {
    const d = 0.5, x = buf(d)
    osc(x, () => 311, (t) => (t < 0.18 ? env(t, 0.004, 0.2) : 0), 'square')
    osc(x, () => 233, (t) => env(t, 0.004, 0.18), 'square', 0.2)
    return finish(lowpass(x, () => 2500), 0.4)
  },
  // 휙: 짧고 날카로운 스와이프(화살표·이동)
  swipe() {
    const d = 0.25, x = buf(d)
    noise(x, (t) => Math.sin(Math.PI * Math.min(1, t / d)), 5)
    lowpass(x, (t) => 1500 + 9000 * (t / d))
    return finish(highpass(x, 1200), 0.4)
  },
}

// 배경음악: 잔잔한 패드(C-Am-F-G 진행) — 내레이션을 가리지 않게 저역·고역을 깎고 아주 작게 쓴다
export function bgm(seconds) {
  const bar = 4, x = buf(seconds)
  const chords = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]]
  const nBars = Math.ceil(seconds / bar)
  for (let b = 0; b < nBars; b++) {
    const ch = chords[b % 4], s = b * bar
    for (const f of ch) {
      for (const det of [-0.6, 0.6]) {
        // 마디마다 부드럽게 들어왔다 빠지는 패드(겹쳐서 이어짐)
        osc(x, () => f + det, (t) => (t > bar + 1 ? 0 : 0.18 * Math.sin(Math.PI * Math.min(1, t / (bar + 1)))), 'tri', s)
      }
    }
    // 마디 첫 박에 낮은 베이스
    osc(x, () => ch[0] / 2, (t) => (t > bar ? 0 : 0.25 * env(t, 0.05, 1.2)), 'sine', s)
  }
  lowpass(x, () => 1800)
  // 전체 페이드 인/아웃
  for (let i = 0; i < x.length; i++) {
    const t = i / SR
    x[i] *= Math.min(1, t / 2, (seconds - t) / 2.5)
  }
  return finish(x, 0.5)
}

// 16비트 PCM 모노 WAV 쓰기
export function writeWav(file, x) {
  const n = x.length, b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, b)
}

export function writeAll(dir) {
  for (const [name, fn] of Object.entries(RECIPES)) writeWav(path.join(dir, `${name}.wav`), fn())
  return Object.keys(RECIPES)
}

// 직접 실행 시: 효과음 전체(+선택적 BGM) 생성
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const dir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'public/sfx'
  const names = writeAll(dir)
  const bi = process.argv.indexOf('--bgm')
  if (bi > 0) writeWav(path.join(dir, 'bgm.wav'), bgm(Number(process.argv[bi + 1] || 60)))
  console.log(`[효과음] ${names.length}종 → ${dir}: ${names.join(', ')}`)
}
