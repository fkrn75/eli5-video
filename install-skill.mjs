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
// [에이전트, 스킬 폴더, 설치 여부 판단용 폴더]
const TARGETS = [
  ['claude', path.join(HOME, '.claude', 'skills'), path.join(HOME, '.claude')],
  ['codex', path.join(HOME, '.codex', 'skills'), path.join(HOME, '.codex')], // Codex CLI/데스크탑
  ['shared', path.join(HOME, '.agents', 'skills'), null], // Agent Skills 공용 위치(최신 Codex·Antigravity 도 읽음)
  ['antigravity', path.join(HOME, '.gemini', 'config', 'skills'), path.join(HOME, '.gemini')],
]

const args = process.argv.slice(2)
const ai = args.indexOf('--agents')
const want = ai >= 0 ? new Set(args[ai + 1].split(',').map((x) => x.trim())) : null
const uninstall = args.includes('--uninstall')
const tpl = fs.readFileSync(path.join(HERE, 'skill', NAME, 'SKILL.md'), 'utf8')
const body = tpl.split('{{ENGINE}}').join(HERE)

for (const [agent, dir, marker] of TARGETS) {
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
  fs.writeFileSync(path.join(dst, 'SKILL.md'), body)
  console.log(`[설치]   ${agent.padEnd(12)} ${dst}`)
}
if (!uninstall) console.log('\n호출: Claude Code `/eli5-video <주제>` · Codex `$eli5-video <주제>` 또는 /skills · Antigravity 는 "쉬운 설명 영상 만들어줘"처럼 요청')
