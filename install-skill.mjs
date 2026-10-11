// eli5-video 스킬을 이 PC의 AI 에이전트들에 설치한다(skill/eli5-video/SKILL.md 의 {{ENGINE}} 를 이 폴더 경로로 바꿔 복사).
// 사용: node install-skill.mjs                  감지된 에이전트 전부(Claude Code·Codex·Antigravity)
//       node install-skill.mjs --agents claude,codex
//       node install-skill.mjs --uninstall
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const HOME = os.homedir()
const NAME = 'eli5-video'
// [에이전트, 스킬 폴더, 설치 여부 판단용 폴더, 이미지 생성 절 포함 여부]
// Codex(image_gen)·Antigravity(generate_image)는 자체 이미지 생성이 있어 '직접 그린 그림' 절을 덧붙인다. Claude 용은 기본판 그대로
const TARGETS = [
  ['claude', path.join(HOME, '.claude', 'skills'), path.join(HOME, '.claude'), false],
  ['codex', path.join(HOME, '.codex', 'skills'), path.join(HOME, '.codex'), true], // Codex CLI/데스크탑
  ['shared', path.join(HOME, '.agents', 'skills'), null, true], // Agent Skills 공용 위치(최신 Codex·Antigravity 가 읽음)
  ['antigravity', path.join(HOME, '.gemini', 'config', 'skills'), path.join(HOME, '.gemini'), true],
]

const args = process.argv.slice(2)
const ai = args.indexOf('--agents')
const want = ai >= 0 ? new Set(args[ai + 1].split(',').map((x) => x.trim())) : null
const uninstall = args.includes('--uninstall')
const tpl = fs.readFileSync(path.join(HERE, 'skill', NAME, 'SKILL.md'), 'utf8')
const body = tpl.split('{{ENGINE}}').join(HERE)

// 이미지 생성판: 설명 한 줄 추가 + '문제 해결' 앞에 그림 절 삽입
function withImagegen(md) {
  const extra = fs.readFileSync(path.join(HERE, 'skill', NAME, 'imagegen.md'), 'utf8')
  const out = md
    .replace(/^(description: .*)$/m, '$1 이미지 생성 도구로 직접 그린 일러스트도 영상에 넣는다.')
    .replace('3. **대본 작성** —', '3. **(그림) → 대본 작성** — 그림을 쓸 장면이 있으면 아래 "직접 그린 그림 쓰기"대로 먼저 그림을 만든다. 그다음')
    .replace('\n## 문제 해결', `${extra}\n## 문제 해결`)
  if (out === md || !out.includes('직접 그린 그림 쓰기')) throw new Error('SKILL.md 구조가 바뀌어 그림 절을 넣지 못했습니다')
  return out
}

for (const [agent, dir, marker, imagegen] of TARGETS) {
  // shared 는 codex/antigravity 를 고르면 같이 설치
  const picked = !want || want.has(agent) || (agent === 'shared' && (want.has('codex') || want.has('antigravity')))
  if (!picked) continue
  if (marker && !fs.existsSync(marker)) {
    console.log(`[건너뜀] ${agent.padEnd(12)} ${dir} (설치되지 않은 것으로 보임)`)
    continue
  }
  const dst = path.join(dir, NAME)
  if (uninstall) {
    fs.rmSync(dst, { recursive: true, force: true })
    console.log(`[삭제]   ${agent.padEnd(12)} ${dst}`)
    continue
  }
  fs.mkdirSync(dst, { recursive: true })
  fs.writeFileSync(path.join(dst, 'SKILL.md'), imagegen ? withImagegen(body) : body)
  console.log(`[설치]   ${agent.padEnd(12)} ${dst}${imagegen ? '  (+직접 그린 그림)' : ''}`)
}
if (!uninstall) console.log('\n호출: Claude Code `/eli5-video <주제>` · Codex `$eli5-video <주제>` 또는 /skills · Antigravity 는 "쉬운 설명 영상 만들어줘"처럼 요청')
