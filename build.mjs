// 대본(script.json) → 내레이션 합성 → 효과음/배경음 생성 → 타임라인 계산 → Remotion 렌더(MP4)
// 사용: node build.mjs projects/<이름>/script.json [--no-render] [--still 장면번호] [--out 파일.mp4]
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { writeAll, writeWav, bgm } from './sfx.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FPS = 30
const LEAD = 0.45 // 장면 시작 → 첫 내레이션까지(초): 화면이 먼저 등장할 시간
const GAP = 0.32 // 문장 사이 쉼(초)
const TAIL = 0.7 // 마지막 문장 → 다음 장면까지(초)

const args = process.argv.slice(2)
const scriptPath = path.resolve(args.find((a) => !a.startsWith('--')) || '')
if (!fs.existsSync(scriptPath)) {
  console.error('사용: node build.mjs projects/<이름>/script.json [--no-render] [--still N] [--out 파일.mp4]')
  process.exit(1)
}
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined)
const projDir = path.dirname(scriptPath)
const slug = path.basename(projDir).replace(/[^\w-]/g, '_') || 'video'
const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8').replace(/^﻿/, ''))
const pubDir = path.join(HERE, 'public', slug)
fs.mkdirSync(pubDir, { recursive: true })

// ── 0. 대본 검증(흔한 실수를 렌더 전에 잡는다) ─────────────────
const TYPES = ['title', 'analogy', 'steps', 'flow', 'compare', 'number', 'bars', 'emoji', 'recap', 'quote']
script.scenes.forEach((s, i) => {
  if (!TYPES.includes(s.type)) throw new Error(`장면 ${i + 1}: 알 수 없는 type "${s.type}" (가능: ${TYPES.join(', ')})`)
  if (typeof s.say === 'string') s.say = [s.say]
  if (!Array.isArray(s.say) || s.say.length === 0) throw new Error(`장면 ${i + 1}: say(내레이션 문장 배열)가 비었습니다`)
})

// ── 1. 발음 변환(숫자·영문 약어 → 한국어 읽기) ─────────────────
const beats = script.scenes.flatMap((s, i) => s.say.map((text, j) => ({ id: `s${String(i + 1).padStart(2, '0')}_b${j}`, text })))
const conv = spawnSync(process.execPath, [path.join(HERE, 'spoken.mjs')], { input: JSON.stringify(beats.map((b) => b.text)), encoding: 'utf8' })
if (conv.status !== 0) throw new Error('발음 변환 실패: ' + conv.stderr)
const spoken = JSON.parse(conv.stdout)
// 대본의 "pron" 사전으로 직접 교정(예: {"Remotion":"리모션"})
const pron = script.pron || {}
beats.forEach((b, k) => {
  let t = spoken[k]
  for (const [from, to] of Object.entries(pron)) t = t.split(from).join(to)
  b.spoken = t
})

// ── 2. TTS(Supertonic v3) ────────────────────────────────────
const cfgPath = path.join(HERE, 'config.json')
const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8').replace(/^﻿/, '')) : {}
// 파이썬 경로: 환경변수 > config.json > 기본(윈도우 py 런처, 그 외 python3)
const py = process.env.ELI5_PY || cfg.python || (process.platform === 'win32' ? 'py' : 'python3')
const pyArgs = py === 'py' ? ['-3'] : []
const ttsIn = path.join(pubDir, 'tts_in.json')
fs.writeFileSync(ttsIn, JSON.stringify({ voice: script.voice || 'F1', speed: script.speed ?? 1.0, steps: script.steps ?? 10, items: beats.map((b) => ({ id: b.id, text: b.spoken })) }, null, 1))
const tts = spawnSync(py, [...pyArgs, path.join(HERE, 'tts.py'), ttsIn, pubDir], { stdio: 'inherit' })
if (tts.status !== 0) throw new Error(`TTS 실패(파이썬: ${py}). config.json 의 python 경로에 supertonic·soundfile·numpy 가 설치돼 있어야 합니다`)
const durs = JSON.parse(fs.readFileSync(path.join(pubDir, 'durations.json'), 'utf8'))

// ── 3. 타임라인 계산(문장마다 정확한 시작 프레임) ───────────────
const f = (sec) => Math.round(sec * FPS)
let cursor = 0
const scenes = script.scenes.map((s, i) => {
  let t = LEAD
  const sb = s.say.map((text, j) => {
    const id = `s${String(i + 1).padStart(2, '0')}_b${j}`
    const b = { text, file: `${slug}/${id}.wav`, start: f(t), dur: f(durs[id]) }
    t += durs[id] + GAP
    return b
  })
  const dur = f(t - GAP + TAIL + (s.hold || 0))
  const out = { ...s, beats: sb, from: cursor, dur }
  delete out.say
  cursor += dur
  return out
})
const total = cursor

// ── 4. 효과음·배경음 ─────────────────────────────────────────
const sfxDir = path.join(HERE, 'public', 'sfx')
if (!fs.existsSync(path.join(sfxDir, 'swipe.wav'))) writeAll(sfxDir)
const useBgm = script.bgm !== false
if (useBgm) writeWav(path.join(pubDir, 'bgm.wav'), bgm(total / FPS + 0.5))

const props = { title: script.title || '', theme: script.theme || 'sky', fps: FPS, total, bgm: useBgm ? `${slug}/bgm.wav` : null, bgmVolume: script.bgmVolume ?? 0.07, captions: script.captions !== false, scenes }
const propsPath = path.join(pubDir, 'props.json')
fs.writeFileSync(propsPath, JSON.stringify(props, null, 1))
console.log(`[타임라인] 장면 ${scenes.length}개 · 문장 ${beats.length}개 · 총 ${(total / FPS).toFixed(1)}초 → ${path.relative(HERE, propsPath)}`)

// ── 5. 렌더 ──────────────────────────────────────────────────
if (args.includes('--no-render')) process.exit(0)
const cli = path.join(HERE, 'node_modules', '@remotion', 'cli', 'remotion-cli.js')
const still = opt('--still')
if (still) {
  // 장면 N 의 마지막 문장 중간 프레임 정지 화면(빠른 미리보기용)
  const s = scenes[Number(still) - 1]
  const lb = s.beats[s.beats.length - 1]
  const frame = s.from + lb.start + Math.floor(lb.dur / 2)
  const png = path.join(projDir, `still_${still}.png`)
  const r = spawnSync(process.execPath, [cli, 'still', 'src/index.ts', 'Eli5', png, `--props=${propsPath}`, `--frame=${frame}`], { cwd: HERE, stdio: 'inherit' })
  process.exit(r.status ?? 1)
}
const outFile = path.resolve(opt('--out') || path.join(projDir, `${slug}.mp4`))
const r = spawnSync(process.execPath, [cli, 'render', 'src/index.ts', 'Eli5', outFile, `--props=${propsPath}`, '--codec=h264', '--audio-codec=aac'], { cwd: HERE, stdio: 'inherit' })
if (r.status !== 0) process.exit(r.status ?? 1)

// ── 6. 음량 정규화(-16 LUFS, 영상은 재인코딩 없이 복사) ─────────
// Remotion 믹스는 -25 LUFS 안팎으로 작게 나와 유튜브·폰에서 소리가 작다
const tmp = outFile.replace(/\.mp4$/i, '.norm.mp4')
const ln = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', outFile, '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', tmp], { stdio: 'inherit' })
if (ln.status === 0) {
  fs.renameSync(tmp, outFile)
  console.log('[음량] -16 LUFS 로 정규화')
} else console.warn('[음량] ffmpeg 가 없거나 실패 → 정규화 생략(영상은 정상)')
console.log(`[완료] ${outFile}`)
