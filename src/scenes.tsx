// 장면 종류별 화면. 모든 프레임은 장면 기준(0 = 장면 시작)
import React from 'react'
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import type { Scene } from './types'
import { BODY, Card, Emoji, HEAD, Heading, Pop, Sfx, beatIndex, countUp, revealAt, useBob, usePop, useTheme } from './ui'

const center: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' }
const Stage: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 200 }) => (
  // AbsoluteFill 은 width/height 100% 라 top/left 를 주면 밀려난다 → 일반 absolute 박스
  <div style={{ position: 'absolute', ...center, top, bottom: 190, left: 90, right: 90 }}>{children}</div>
)

// ── 제목 ──
const Title: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const bob = useBob(14, 0.07)
  const subAt = s.beats[Math.min(1, s.beats.length - 1)].start
  return (
    <AbsoluteFill style={{ ...center, flexDirection: 'column', paddingBottom: 120 }}>
      <Pop at={2}>
        <Emoji e={s.emoji} img={s.img} size={230} style={{ transform: `translateY(${bob}px)` }} />
      </Pop>
      <Pop at={8} from="up">
        <div style={{ fontFamily: HEAD, fontSize: 150, color: t.ink, marginTop: 20, letterSpacing: -2, textAlign: 'center' }}>{s.title}</div>
      </Pop>
      {s.subtitle && (
        <Pop at={subAt} from="up">
          <div style={{ fontFamily: BODY, fontSize: 60, color: t.sub, marginTop: 18, background: t.card, padding: '14px 44px', borderRadius: 999, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>{s.subtitle}</div>
        </Pop>
      )}
      <Sfx at={8} name="thud" volume={0.6} scene={s} />
      {s.subtitle && <Sfx at={subAt} name="sparkle" volume={0.35} scene={s} />}
    </AbsoluteFill>
  )
}

// ── 비유: 어려운 것 = 쉬운 것 ──
const Analogy: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const frame = useCurrentFrame()
  const [a, b, c] = [0, 1, 2].map((k) => revealAt(s, k, 3))
  const bobL = useBob(8, 0.06), bobR = useBob(8, 0.06, 2)
  const side = (x: Scene['left'], at: number, bob: number, hl: boolean) => (
    <Pop at={at}>
      <Card active={hl} style={{ width: 600, height: 520, ...center, flexDirection: 'column', gap: 24 }}>
        <Emoji e={x?.emoji} img={x?.img} size={200} style={{ transform: `translateY(${bob}px)` }} />
        <div style={{ fontFamily: HEAD, fontSize: 64, color: t.ink, textAlign: 'center', padding: '0 30px', lineHeight: 1.2 }}>{x?.label}</div>
      </Card>
    </Pop>
  )
  const now = frame >= c ? 2 : frame >= b ? 1 : 0
  return (
    <>
      <Heading text={s.title} />
      <Stage>
        <div style={{ display: 'flex', alignItems: 'center', gap: 50 }}>
          {side(s.left, a, bobL, now === 0)}
          <Pop at={b}>
            <div style={{ ...center, flexDirection: 'column' }}>
              <div style={{ fontFamily: HEAD, fontSize: 150, color: t.accent2, lineHeight: 1 }}>=</div>
              <div style={{ fontFamily: BODY, fontSize: 38, color: t.sub, marginTop: 8 }}>{(s.text as string) || '쉽게 말하면'}</div>
            </div>
          </Pop>
          {side(s.right, c, bobR, now === 2)}
        </div>
      </Stage>
      <Sfx at={a} name="pop" scene={s} />
      <Sfx at={b} name="click" scene={s} />
      <Sfx at={c} name="ding" volume={0.4} scene={s} />
    </>
  )
}

// ── 단계(1 → 2 → 3) ──
const Steps: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const frame = useCurrentFrame()
  const items = s.items || []
  const n = items.length
  const at = items.map((_, k) => revealAt(s, k, n))
  let cur = -1
  at.forEach((f, k) => (frame >= f ? (cur = k) : null))
  const w = n <= 3 ? 470 : n === 4 ? 380 : 310
  return (
    <>
      <Heading text={s.title} />
      <Stage>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {items.map((it, k) => (
            <React.Fragment key={k}>
              {k > 0 && (
                <Pop at={at[k] - 4}>
                  <div style={{ fontFamily: HEAD, fontSize: 70, color: t.accent2 }}>→</div>
                </Pop>
              )}
              <Pop at={at[k]} from="up">
                <Card active={k === cur} style={{ width: w, height: 470, ...center, flexDirection: 'column', gap: 18, position: 'relative', opacity: cur > k ? 0.75 : 1 }}>
                  <div style={{ position: 'absolute', top: -34, left: '50%', transform: 'translateX(-50%)', width: 76, height: 76, borderRadius: 99, background: t.accent, color: '#fff', fontFamily: HEAD, fontSize: 46, ...center }}>{k + 1}</div>
                  <Emoji e={it.emoji} img={it.img} size={n <= 3 ? 170 : 140} />
                  <div style={{ fontFamily: HEAD, fontSize: n <= 3 ? 52 : 44, color: t.ink, textAlign: 'center', padding: '0 22px', lineHeight: 1.25 }}>{it.text || it.label}</div>
                </Card>
              </Pop>
              <Sfx at={at[k]} name="pop" scene={s} />
            </React.Fragment>
          ))}
        </div>
      </Stage>
    </>
  )
}

// ── 흐름(A → B → C, 점이 흘러감) ──
const Flow: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const frame = useCurrentFrame()
  const nodes = s.nodes || s.items || []
  const n = nodes.length
  const at = nodes.map((_, k) => revealAt(s, k, n))
  const W = 1700, nodeW = Math.min(300, (W - (n - 1) * 90) / n), gap = (W - n * nodeW) / Math.max(1, n - 1)
  const allIn = at[n - 1] + 15
  // 마지막 노드까지 다 나온 뒤 점이 처음 → 끝으로 반복 이동
  const loop = 50
  const p = frame > allIn ? ((frame - allIn) % loop) / loop : -1
  const dotX = p >= 0 ? nodeW / 2 + p * (W - nodeW) : -999
  return (
    <>
      <Heading text={s.title} />
      <Stage>
        <div style={{ position: 'relative', width: W, height: 420 }}>
          {nodes.map((nd, k) => {
            const x = k * (nodeW + gap)
            const arrowP = k > 0 ? interpolate(frame, [at[k] - 10, at[k]], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0
            return (
              <React.Fragment key={k}>
                {k > 0 && (
                  <div style={{ position: 'absolute', left: x - gap + 10, top: 200, width: (gap - 20) * arrowP, height: 12, borderRadius: 6, background: t.accent2 }}>
                    {arrowP > 0.95 && <div style={{ position: 'absolute', right: -14, top: -14, width: 0, height: 0, borderTop: '20px solid transparent', borderBottom: '20px solid transparent', borderLeft: `26px solid ${t.accent2}` }} />}
                  </div>
                )}
                <Pop at={at[k]} style={{ position: 'absolute', left: x, top: 40, width: nodeW }}>
                  <Card style={{ height: 330, ...center, flexDirection: 'column', gap: 14 }}>
                    <Emoji e={nd.emoji} img={nd.img} size={130} />
                    <div style={{ fontFamily: HEAD, fontSize: 44, color: t.ink, textAlign: 'center', padding: '0 14px', lineHeight: 1.2 }}>{nd.label || nd.text}</div>
                  </Card>
                </Pop>
                {k > 0 && <Sfx at={at[k] - 10} name="swipe" volume={0.35} scene={s} />}
                <Sfx at={at[k]} name="pop" scene={s} />
              </React.Fragment>
            )
          })}
          {p >= 0 && <div style={{ position: 'absolute', left: dotX - 22, top: 383, width: 44, height: 44, borderRadius: 99, background: t.accent, boxShadow: `0 0 24px ${t.accent}` }} />}
        </div>
      </Stage>
    </>
  )
}

// ── 비교(A vs B) ──
const Compare: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const [a, b] = [0, 1].map((k) => revealAt(s, k, 2))
  const col = (x: Scene['left'], at: number, color: string) => (
    <Pop at={at} from="up">
      <Card style={{ width: 700, minHeight: 540, padding: '40px 50px', boxSizing: 'border-box', borderTop: `14px solid ${color}` }}>
        <div style={{ ...center, gap: 20 }}>
          <Emoji e={x?.emoji} img={x?.img} size={110} />
          <div style={{ fontFamily: HEAD, fontSize: 64, color: t.ink }}>{x?.title || x?.label}</div>
        </div>
        <div style={{ marginTop: 26 }}>
          {(x?.items || []).map((it, k) => (
            <Pop key={k} at={at + 8 + k * 7} from="right">
              <div style={{ fontFamily: BODY, fontSize: 44, color: t.ink, margin: '16px 0', display: 'flex', gap: 16 }}>
                <span style={{ color }}>●</span>
                <span>{it}</span>
              </div>
            </Pop>
          ))}
        </div>
      </Card>
    </Pop>
  )
  return (
    <>
      <Heading text={s.title} />
      <Stage>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          {col(s.left, a, t.accent)}
          <Pop at={b - 6}>
            <div style={{ fontFamily: HEAD, fontSize: 80, color: t.accent2 }}>VS</div>
          </Pop>
          {col(s.right, b, t.accent2)}
        </div>
      </Stage>
      <Sfx at={a} name="pop" scene={s} />
      <Sfx at={b - 6} name="click" scene={s} />
      <Sfx at={b} name="pop" scene={s} />
    </>
  )
}

// ── 큰 숫자(0부터 세어 올라감) ──
const NumberScene: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const frame = useCurrentFrame()
  const at = s.beats[0].start
  const len = 36
  const v = countUp(frame, at, len, s.value || 0)
  const dec = Number.isInteger(s.value) ? 0 : 1
  const shown = v.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  const done = usePop(at + len, 8)
  const ticks = Array.from({ length: Math.floor(len / 3) }, (_, k) => at + k * 3)
  return (
    <>
      <Heading text={s.title} />
      <Stage>
        <div style={{ ...center, flexDirection: 'column' }}>
          <Pop at={2}>
            <Emoji e={s.emoji} img={s.img} size={170} style={{ marginBottom: 24 }} />
          </Pop>
          <div style={{ fontFamily: HEAD, fontSize: 210, color: t.accent, lineHeight: 1.05, transform: `scale(${1 + 0.08 * Math.sin(Math.PI * Math.min(1, done))})` }}>
            {shown}
            <span style={{ fontSize: 100, color: t.ink, marginLeft: 12 }}>{s.unit}</span>
          </div>
          <Pop at={at + len} from="up">
            <div style={{ fontFamily: BODY, fontSize: 58, color: t.sub, marginTop: 10 }}>{s.label}</div>
          </Pop>
        </div>
      </Stage>
      {ticks.map((f, k) => (
        <Sfx key={k} at={f} name="tick" volume={0.3} scene={s} />
      ))}
      <Sfx at={at + len} name="thud" volume={0.6} scene={s} />
    </>
  )
}

// ── 막대그래프 ──
const Bars: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const frame = useCurrentFrame()
  const bars = s.bars || s.items || []
  const n = bars.length
  const max = Math.max(...bars.map((b) => b.value || 0), 1)
  const at = bars.map((_, k) => revealAt(s, k, n))
  const H = 380
  return (
    <>
      <Heading text={s.title} />
      <Stage>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 70, height: H + 230 }}>
          {bars.map((b, k) => {
            const p = interpolate(frame, [at[k], at[k] + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3) })
            const h = ((b.value || 0) / max) * H * p
            const color = k % 2 ? t.accent2 : t.accent
            return (
              <div key={k} style={{ ...center, flexDirection: 'column', justifyContent: 'flex-end', width: 220 }}>
                <div style={{ fontFamily: HEAD, fontSize: 56, color: t.ink, opacity: p }}>{Math.round((b.value || 0) * p).toLocaleString('ko-KR')}</div>
                <div style={{ width: 170, height: h, background: color, borderRadius: '24px 24px 8px 8px', marginTop: 8 }} />
                <Emoji e={b.emoji} img={b.img} size={80} style={{ marginTop: 14, opacity: p }} />
                <div style={{ fontFamily: HEAD, fontSize: 42, color: t.sub, marginTop: 4, textAlign: 'center' }}>{b.label}</div>
                <Sfx at={at[k]} name="rise" volume={0.35} scene={s} />
              </div>
            )
          })}
        </div>
      </Stage>
    </>
  )
}

// ── 이모지 장면(자유 배치 그림) ──
const EmojiScene: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const items = s.items || []
  const n = items.length
  const at = items.map((_, k) => revealAt(s, k, n))
  return (
    <>
      <Heading text={s.title} />
      <div style={{ position: 'absolute', top: 180, bottom: 190, left: 0, right: 0 }}>
        {items.map((it, k) => (
          <EmojiItem key={k} it={it} at={at[k]} k={k} />
        ))}
        {s.caption && (
          <Pop at={at[n - 1] + 10} from="up" style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontFamily: HEAD, fontSize: 60, color: t.ink, background: t.card, padding: '12px 40px', borderRadius: 999 }}>{s.caption}</span>
          </Pop>
        )}
      </div>
      {at.map((f, k) => (
        <Sfx key={k} at={f} name="pop" scene={s} />
      ))}
    </>
  )
}
const EmojiItem: React.FC<{ it: NonNullable<Scene['items']>[number]; at: number; k: number }> = ({ it, at, k }) => {
  const t = useTheme()
  const bob = useBob(10, 0.05, k * 1.3)
  return (
    <Pop at={at} style={{ position: 'absolute', left: `${(it.x ?? 0.5) * 100}%`, top: `${(it.y ?? 0.5) * 100}%` }}>
      <div style={{ ...center, flexDirection: 'column', transform: `translate(-50%,-50%) translateY(${bob}px)` }}>
        <Emoji e={it.emoji} img={it.img} size={it.size || 180} />
        {(it.label || it.text) && <div style={{ fontFamily: HEAD, fontSize: 44, color: t.ink, marginTop: 6, whiteSpace: 'nowrap' }}>{it.label || it.text}</div>}
      </div>
    </Pop>
  )
}

// ── 정리(체크리스트) ──
const Recap: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const items = (s.items || []).map((x) => (typeof x === 'string' ? { text: x } : x))
  const n = items.length
  const at = items.map((_, k) => revealAt(s, k, n))
  return (
    <>
      <Heading text={s.title || '한눈에 정리'} />
      <Stage>
        <Card style={{ padding: '40px 70px', minWidth: 1100 }}>
          {items.map((it, k) => (
            <Pop key={k} at={at[k]} from="right">
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, margin: '22px 0' }}>
                <div style={{ width: 70, height: 70, borderRadius: 20, background: t.good, color: '#fff', fontSize: 50, fontFamily: HEAD, ...center, flex: 'none' }}>✓</div>
                {(it.emoji || it.img) && <Emoji e={it.emoji} img={it.img} size={64} />}
                <div style={{ fontFamily: HEAD, fontSize: 58, color: t.ink }}>{it.text || it.label}</div>
              </div>
            </Pop>
          ))}
        </Card>
      </Stage>
      {at.map((f, k) => (
        <Sfx key={k} at={f} name={k === n - 1 ? 'success' : 'click'} volume={k === n - 1 ? 0.45 : 0.5} scene={s} />
      ))}
    </>
  )
}

// ── 핵심 한 문장 ──
const Quote: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const bob = useBob(10, 0.06)
  return (
    <Stage top={120}>
      <div style={{ ...center, flexDirection: 'column', gap: 30 }}>
        <Pop at={2}>
          <Emoji e={s.emoji} img={s.img} size={190} style={{ transform: `translateY(${bob}px)` }} />
        </Pop>
        <Pop at={8} from="up">
          <div style={{ fontFamily: HEAD, fontSize: 96, color: t.ink, textAlign: 'center', lineHeight: 1.3, maxWidth: 1500 }}>
            “<span style={{ color: t.accent }}>{s.text}</span>”
          </div>
        </Pop>
        {s.by && (
          <Pop at={16}>
            <div style={{ fontFamily: BODY, fontSize: 44, color: t.sub }}>{s.by}</div>
          </Pop>
        )}
      </div>
      <Sfx at={8} name="ding" volume={0.4} scene={s} />
    </Stage>
  )
}

// ── 큰 그림(직접 만든 16:9 삽화, 천천히 확대) ──
const Picture: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const frame = useCurrentFrame()
  const w = s.title ? 1120 : 1280
  const zoom = s.zoom === false ? 1 : interpolate(frame, [0, s.dur], [1, 1.08])
  const capAt = s.beats[Math.min(1, s.beats.length - 1)].start
  return (
    <>
      <Heading text={s.title} />
      <Stage top={s.title ? 200 : 70}>
        <Pop at={2}>
          <div style={{ position: 'relative', width: w, height: Math.round((w * 9) / 16), borderRadius: 40, overflow: 'hidden', background: t.card, boxShadow: '0 18px 50px rgba(20,30,60,0.18)', border: `8px solid ${t.card}` }}>
            {s.img && <Img src={staticFile(s.img)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />}
            {s.caption && (
              <Pop at={capAt} from="up" style={{ position: 'absolute', left: 0, right: 0, bottom: 26, textAlign: 'center' }}>
                <span style={{ fontFamily: HEAD, fontSize: 54, color: t.ink, background: t.card, padding: '10px 36px', borderRadius: 999, boxShadow: '0 6px 18px rgba(0,0,0,.12)' }}>{s.caption}</span>
              </Pop>
            )}
          </div>
        </Pop>
      </Stage>
      <Sfx at={2} name="sparkle" volume={0.3} scene={s} />
      {s.caption && <Sfx at={capAt} name="pop" scene={s} />}
    </>
  )
}

export const SCENES: Record<Scene['type'], React.FC<{ s: Scene }>> = {
  picture: Picture,
  title: Title,
  analogy: Analogy,
  steps: Steps,
  flow: Flow,
  compare: Compare,
  number: NumberScene,
  bars: Bars,
  emoji: EmojiScene,
  recap: Recap,
  quote: Quote,
}

export { beatIndex }
