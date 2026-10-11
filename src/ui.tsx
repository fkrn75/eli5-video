// 공통 재료: 테마 색, 등장 애니메이션, 효과음, 등장 시점 계산
import React from 'react'
import { Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import type { Scene } from './types'

export type Theme = { bg1: string; bg2: string; ink: string; sub: string; card: string; accent: string; accent2: string; good: string; blob: string }

export const THEMES: Record<string, Theme> = {
  sky: { bg1: '#eaf4ff', bg2: '#fdf6ec', ink: '#1d2a44', sub: '#55617a', card: '#ffffff', accent: '#3b7cf4', accent2: '#ff8a3d', good: '#22a06b', blob: '#b9d8ff' },
  mint: { bg1: '#e7f8f1', bg2: '#f4f1ff', ink: '#173a33', sub: '#4d6b64', card: '#ffffff', accent: '#14a37f', accent2: '#7c5cff', good: '#14a37f', blob: '#b5ead7' },
  peach: { bg1: '#fff0e8', bg2: '#fff9e6', ink: '#3f2418', sub: '#7a5a4b', card: '#ffffff', accent: '#f26b3a', accent2: '#2f8fd8', good: '#2f9e5b', blob: '#ffd2bd' },
  night: { bg1: '#141a2e', bg2: '#1f1838', ink: '#f2f4ff', sub: '#a9b2d3', card: '#232b47', accent: '#7aa7ff', accent2: '#ffb35c', good: '#4fd39a', blob: '#2c3966' },
}

export const ThemeCtx = React.createContext<Theme>(THEMES.sky)
export const useTheme = () => React.useContext(ThemeCtx)

export const HEAD = '"Jua", "Malgun Gothic", sans-serif'
export const BODY = '"Gowun Dodum", "Malgun Gothic", sans-serif'

// 목록형 장면에서 k번째 요소가 나타나는 프레임(장면 기준).
// 문장 수가 요소 수보다 많으면 앞 문장들은 '도입'으로 보고, 요소 k 는 (도입 수 + k)번째 문장과 함께 등장.
// 문장이 더 적으면 내레이션 구간에 고르게 나눠 등장.
export function revealAt(scene: Scene, k: number, n: number): number {
  const b = scene.beats
  const intro = b.length - n
  if (intro >= 0) return b[intro + k].start
  const s = b[0].start
  const e = b[b.length - 1].start + b[b.length - 1].dur
  return Math.round(s + ((e - s) * k) / n)
}

// 지금 말하고 있는 문장 번호(장면 기준 프레임)
export function beatIndex(scene: Scene, frame: number): number {
  let idx = 0
  scene.beats.forEach((b, i) => {
    if (frame >= b.start - 2) idx = i
  })
  return idx
}

// 튀어나오는 등장(스프링). at 이전엔 0
export function usePop(at: number, damping = 11): number {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - at, fps, config: { damping, mass: 0.7, stiffness: 140 } })
}

export const Pop: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; from?: 'up' | 'down' | 'left' | 'right' | 'zoom' }> = ({ at, children, style, from = 'zoom' }) => {
  const p = usePop(at)
  const d = (1 - p) * 60
  const tr = from === 'zoom' ? `scale(${0.4 + 0.6 * p})` : from === 'up' ? `translateY(${d}px)` : from === 'down' ? `translateY(${-d}px)` : from === 'left' ? `translateX(${d}px)` : `translateX(${-d}px)`
  return <div style={{ opacity: Math.min(1, p * 1.4), transform: tr, ...style }}>{children}</div>
}

// 둥실둥실(대기 중 살아 있는 느낌)
export function useBob(amp = 8, speed = 0.06, phase = 0): number {
  const frame = useCurrentFrame()
  return Math.sin(frame * speed + phase) * amp
}

// 효과음: 장면 기준 at 프레임에 재생. 장면에 sfx:false 면 무음
export const Sfx: React.FC<{ at: number; name: string; volume?: number; scene?: Scene }> = ({ at, name, volume = 0.5, scene }) => {
  if (scene && scene.sfx === false) return null
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={60} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  )
}

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; active?: boolean }> = ({ children, style, active }) => {
  const t = useTheme()
  return (
    <div
      style={{
        background: t.card,
        borderRadius: 36,
        boxShadow: active ? `0 18px 50px ${t.accent}55` : '0 12px 34px rgba(20,30,60,0.12)',
        border: `5px solid ${active ? t.accent : 'transparent'}`,
        transform: active ? 'scale(1.04)' : 'scale(1)',
        transition: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export const Heading: React.FC<{ text?: string; at?: number }> = ({ text, at = 0 }) => {
  const t = useTheme()
  if (!text) return null
  return (
    <Pop at={at} from="down" style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center' }}>
      <div style={{ fontFamily: HEAD, fontSize: 84, color: t.ink, letterSpacing: -1 }}>{text}</div>
    </Pop>
  )
}

export const Emoji: React.FC<{ e?: string; size: number; style?: React.CSSProperties }> = ({ e, size, style }) =>
  e ? <div style={{ fontSize: size, lineHeight: 1.1, fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif', ...style }}>{e}</div> : null

// 숫자를 0 → 목표값으로 세는 보간(감속)
export function countUp(frame: number, at: number, len: number, value: number): number {
  const p = interpolate(frame, [at, at + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return value * (1 - Math.pow(1 - p, 3))
}
