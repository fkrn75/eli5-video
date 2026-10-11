// build.mjs 가 만드는 props.json 의 모양
export type Beat = { text: string; file: string; start: number; dur: number }

export type Item = { emoji?: string; img?: string; text?: string; label?: string; value?: number; x?: number; y?: number; size?: number }

export type Scene = {
  type: 'title' | 'analogy' | 'steps' | 'flow' | 'compare' | 'number' | 'bars' | 'emoji' | 'recap' | 'quote' | 'picture'
  from: number
  dur: number
  beats: Beat[]
  emoji?: string
  img?: string
  zoom?: boolean
  title?: string
  subtitle?: string
  caption?: string
  items?: Item[]
  nodes?: Item[]
  bars?: Item[]
  left?: { emoji?: string; img?: string; label?: string; title?: string; items?: string[] }
  right?: { emoji?: string; img?: string; label?: string; title?: string; items?: string[] }
  value?: number
  unit?: string
  label?: string
  text?: string
  by?: string
  sfx?: boolean
  [k: string]: unknown
}

export type Props = {
  title: string
  theme: string
  fps: number
  total: number
  bgm: string | null
  bgmVolume: number
  captions: boolean
  imgBlend?: 'multiply' | 'normal'
  scenes: Scene[]
}
