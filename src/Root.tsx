import React from 'react'
import { Composition } from 'remotion'
import { Eli5Video } from './Video'
import type { Props } from './types'

// 빈 기본값(스튜디오에서 열 때) — 실제 값은 build.mjs 가 --props 로 넘긴다
const defaultProps: Props = {
  title: '미리보기',
  theme: 'sky',
  fps: 30,
  total: 90,
  bgm: null,
  bgmVolume: 0.07,
  captions: true,
  scenes: [{ type: 'title', emoji: '💡', title: '쉬운 설명 영상', subtitle: 'build.mjs 로 대본을 넣어 주세요', from: 0, dur: 90, beats: [{ text: '대본을 넣어 주세요', file: '', start: 10, dur: 60 }] }],
}

export const Root: React.FC = () => (
  <Composition
    id="Eli5"
    component={Eli5Video}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={90}
    defaultProps={defaultProps}
    // 영상 길이는 대본(내레이션 길이)에서 계산된 total 로 정한다
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, props.total), fps: props.fps })}
  />
)
