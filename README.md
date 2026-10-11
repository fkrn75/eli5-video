# eli5-video

어려운 내용을 5살도 알아듣게 풀어서, **효과음, 배경음, 한국어 내레이션, 자막이 들어간 설명 영상(MP4)** 으로 만드는 AI 에이전트 스킬입니다.
Claude Code, Codex, Antigravity에서 쓸 수 있습니다.

![미리보기](docs/preview.jpg)

> 샘플 영상: "AI는 어떻게 말을 할까?" (72초) — [Releases](../../releases)에서 받을 수 있습니다.

## 특징

- **그림 위주 장면 10종**: 제목, 비유(A = B), 단계, 흐름, 비교, 큰 숫자, 막대그래프, 이모지 배치, 정리, 핵심 한 문장. 그리는 엔진은 [Remotion](https://www.remotion.dev)입니다.
- **효과음을 코드로 합성**: 휙, 톡, 딩, 쿵, 반짝 등 11종과 잔잔한 배경음을 외부 샘플 없이 순수 수학으로 만듭니다(`sfx.mjs`). 같은 코드에서는 늘 같은 소리가 나옵니다.
- **한국어 내레이션**: 로컬에서 무료로 도는 [Supertonic v3](https://huggingface.co/Supertone/supertonic-3) TTS를 씁니다. 숫자와 영문 약어는 한국어 읽기로 자동 변환합니다(예: 2024년 → 이천이십사년, GPU → 지피유).
- **문장 단위 싱크**: 대본의 문장 하나를 따로 합성하므로 각 문장이 시작하는 프레임을 정확히 압니다. 항목은 그 문장을 말하는 순간 효과음과 함께 나타납니다.
- **마무리 처리**: 내레이션이 나오는 동안 배경음이 자동으로 작아지고(덕킹), 자막이 붙으며, 최종 음량을 -16 LUFS로 맞춥니다.
- **빠른 수정**: 바뀐 문장만 다시 합성합니다(해시 캐시).

## 설치

필요한 것: Node.js 22.18 이상(24 권장), Python 3.10 이상, ffmpeg(음량 정규화용, 없으면 이 단계만 건너뜀)

```bash
git clone https://github.com/fkrn75/eli5-video.git
cd eli5-video
npm install
pip install -r requirements.txt     # supertonic, soundfile, numpy (Supertonic 모델 약 380MB는 처음 실행할 때 자동 다운로드)
node install-skill.mjs              # 이 PC의 Claude Code / Codex / Antigravity 에 스킬 설치
```

Supertonic을 가상환경에 설치했다면 `config.example.json`을 `config.json`으로 복사한 뒤 `python` 경로를 그 가상환경의 파이썬으로 바꿔 주세요.

## 사용

에이전트에게 요청합니다.

| 에이전트 | 호출 |
|---|---|
| Claude Code | `/eli5-video 블록체인` |
| Codex | `$eli5-video 블록체인` 또는 `/skills` |
| Antigravity | "블록체인을 쉬운 설명 영상으로 만들어줘" |

에이전트가 대본(`projects/<이름>/script.json`)을 쓰고 아래 명령으로 영상을 만듭니다. 사람이 직접 대본을 써서 돌려도 됩니다.

```bash
node build.mjs projects/llm/script.json              # 전체: TTS → 효과음 → 렌더 → 음량 정규화
node build.mjs projects/llm/script.json --no-render  # TTS와 타임라인만
node build.mjs projects/llm/script.json --still 3    # 3번 장면 정지 화면 PNG
```

대본 형식과 쓰는 규칙은 [skill/eli5-video/SKILL.md](skill/eli5-video/SKILL.md)에 있습니다. 완성된 예시는 [projects/llm/script.json](projects/llm/script.json)입니다.

## 구조

| 파일 | 역할 |
|---|---|
| `build.mjs` | 대본 검증 → 발음 변환 → TTS → 타임라인(문장별 시작 프레임) → 렌더 → loudnorm |
| `tts.py` | Supertonic v3 합성, 앞뒤 무음 자르기, 해시 캐시 |
| `sfx.mjs` | 효과음 11종과 배경음 합성 |
| `spoken.mjs` + `speak/` | 숫자·영문 → 한국어 읽기([MarkdownRadio](https://github.com/fkrn75/MarkdownRadio)에서 가져옴) |
| `src/scenes.tsx` | 장면 10종 |
| `src/Video.tsx` | 배경, 장면 전환, 자막, 배경음 덕킹 |
| `install-skill.mjs` | 에이전트별 스킬 폴더에 설치(`--agents claude,codex`, `--uninstall`) |

## 라이선스

- 이 저장소의 코드: [MIT](LICENSE)
- 폰트 [Jua](https://fonts.google.com/specimen/Jua), [Gowun Dodum](https://fonts.google.com/specimen/Gowun+Dodum): SIL Open Font License(`public/fonts/OFL-*.txt`)
- **Remotion**은 별도 라이선스입니다. 개인과 3인 이하 회사는 무료이고, 그보다 큰 조직은 [회사 라이선스](https://www.remotion.dev/license)가 필요합니다.
- Supertonic 모델의 이용 조건은 [Supertone 모델 카드](https://huggingface.co/Supertone/supertonic-3)를 따릅니다.
