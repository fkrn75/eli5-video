// 전체 영상: 배경 → 장면들(내레이션·효과음 포함) → 자막 → 배경음(내레이션 중엔 자동으로 작아짐)
import React from 'react'
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion'
import type { Props, Scene } from './types'
import { SCENES, beatIndex } from './scenes'
import { BODY, Sfx, THEMES, ThemeCtx, useTheme } from './ui'

// 로컬 폰트(public/fonts) — 네트워크 없이도 렌더되도록
const FONTS: [string, string][] = [
  ['Jua', 'fonts/Jua-Regular.ttf'],
  ['Gowun Dodum', 'fonts/GowunDodum-Regular.ttf'],
]
function useFonts() {
  const [handle] = React.useState(() => delayRender('폰트 로드'))
  React.useEffect(() => {
    Promise.all(
      FONTS.map(async ([fam, file]) => {
        const ff = new FontFace(fam, `url(${staticFile(file)})`)
        await ff.load()
        document.fonts.add(ff)
      }),
    )
      .catch((e) => console.warn('폰트 로드 실패(시스템 폰트로 대체):', e))
      .finally(() => continueRender(handle))
  }, [handle])
}

// 은은하게 떠다니는 배경 원
const Background: React.FC = () => {
  const t = useTheme()
  const frame = useCurrentFrame()
  const blobs = [
    [0.12, 0.2, 340, 0], [0.85, 0.25, 260, 1.7], [0.75, 0.85, 380, 3.1], [0.2, 0.82, 220, 4.4], [0.5, 0.1, 180, 5.2],
  ]
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${t.bg1}, ${t.bg2})` }}>
      {blobs.map(([x, y, r, ph], k) => (
        <div
          key={k}
          style={{
            position: 'absolute',
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: r,
            height: r,
            borderRadius: '50%',
            background: t.blob,
            opacity: 0.45,
            filter: 'blur(6px)',
            transform: `translate(-50%,-50%) translate(${Math.sin(frame * 0.012 + ph) * 40}px, ${Math.cos(frame * 0.01 + ph) * 30}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  )
}

// 장면 하나: 들어올 때 살짝 커지며 나타나고, 나갈 때 흐려짐
const SceneView: React.FC<{ s: Scene; first: boolean; captions: boolean }> = ({ s, first, captions }) => {
  const frame = useCurrentFrame()
  const C = SCENES[s.type]
  const inP = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
  const outP = interpolate(frame, [s.dur - 8, s.dur], [1, 0], { extrapolateLeft: 'clamp' })
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: Math.min(inP, outP), transform: `scale(${0.96 + 0.04 * inP})` }}>
        <C s={s} />
      </AbsoluteFill>
      {s.beats.map((b, i) => (
        <Sequence key={i} from={b.start} durationInFrames={b.dur + 2} layout="none">
          <Audio src={staticFile(b.file)} />
        </Sequence>
      ))}
      {!first && <Sfx at={0} name="whoosh" volume={0.35} scene={s} />}
      {captions && <Caption s={s} />}
    </AbsoluteFill>
  )
}

// 자막: 지금 말하는 문장
const Caption: React.FC<{ s: Scene }> = ({ s }) => {
  const t = useTheme()
  const frame = useCurrentFrame()
  if (frame < s.beats[0].start - 3) return null
  const i = beatIndex(s, frame)
  const b = s.beats[i]
  const op = interpolate(frame, [b.start - 3, b.start + 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 52, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          maxWidth: 1600,
          fontFamily: BODY,
          fontWeight: 700,
          fontSize: 46,
          lineHeight: 1.35,
          color: '#fff',
          background: 'rgba(20,26,44,0.78)',
          padding: '14px 40px',
          borderRadius: 22,
          textAlign: 'center',
          wordBreak: 'keep-all',
          opacity: op,
        }}
      >
        {b.text}
      </div>
    </div>
  )
}

export const Eli5Video: React.FC<Props> = (p) => {
  useFonts()
  const theme = THEMES[p.theme] || THEMES.sky
  // 배경음 더킹: 내레이션 구간(절대 프레임) 동안 볼륨을 40%로
  const spans = p.scenes.flatMap((s) => s.beats.map((b) => [s.from + b.start, s.from + b.start + b.dur]))
  const bgmVol = (f: number) => {
    const speaking = spans.some(([a, b]) => f >= a - 6 && f <= b + 6)
    return p.bgmVolume * (speaking ? 0.4 : 1)
  }
  const last = p.scenes[p.scenes.length - 1]
  return (
    <ThemeCtx.Provider value={theme}>
      <AbsoluteFill style={{ wordBreak: 'keep-all' }}>
        <Background />
        {p.scenes.map((s, i) => (
          <Sequence key={i} from={s.from} durationInFrames={s.dur} name={`${i + 1}. ${s.type}`}>
            <SceneView s={s} first={i === 0} captions={p.captions} />
          </Sequence>
        ))}
        {p.bgm && <Audio src={staticFile(p.bgm)} volume={bgmVol} />}
        {/* 마지막 장면 끝에 마무리 종소리(정리 장면이 아니면) */}
        {last && last.type !== 'recap' && <Sfx at={p.total - 40} name="success" volume={0.35} />}
      </AbsoluteFill>
    </ThemeCtx.Provider>
  )
}
