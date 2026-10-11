---
name: eli5-video
description: 어렵거나 이해하기 힘든 내용을 "5살도 알아듣게" 풀어 효과음·배경음·한국어 내레이션(Supertonic TTS)·자막이 들어간 설명 영상(MP4)으로 만든다. Remotion으로 그림 위주 장면을 그리고 효과음은 코드로 합성한다. 사용자가 `/eli5-video <주제>`(Codex는 `$eli5-video`)를 입력하거나 "쉽게 설명하는 영상 만들어줘", "이거 영상으로 쉽게 풀어줘", "eli5 영상", "설명 애니메이션에 더빙 넣어서" 같은 요청을 하면 사용. 문서·URL·코드를 주며 쉬운 설명 영상을 원할 때도 사용. 영상이 아니라 HTML 그림 설명만 원하면 eli5 스킬을 쓴다.
---

# eli5-video — 쉬운 설명 영상 만들기

주제: $ARGUMENTS (비어 있으면 사용자 메시지에서 주제를 찾는다)

엔진: `{{ENGINE}}` (Remotion 4 + 코드 합성 효과음 `sfx.mjs` + Supertonic v3 `tts.py` + 발음 변환 `spoken.mjs`)
산출물: `{{ENGINE}}\projects\<slug>\<slug>.mp4` (1920×1080·30fps·h264/aac·-16 LUFS)

## 절차

1. **내용 이해** — 주제가 파일·URL·코드면 먼저 읽는다. 사실관계가 불확실하면 조사한다. 쉬운 말로 바꾸더라도 **틀린 말을 하면 안 된다**(숫자는 근거가 있을 때만, 모르면 숫자 장면을 쓰지 않는다).
2. **이야기 설계** — "아무것도 모르는 사람"을 기준으로 핵심 1개를 정하고, 6~10개 장면, 60~120초 분량으로 짠다. 기본 흐름:
   `title`(질문 던지기) → `analogy`(일상 비유) → 원리 장면 2~4개(`steps`/`flow`/`bars`/`compare`/`emoji`/`number`) → `quote` 또는 `recap`(정리)
3. **대본 작성** — `projects/<slug>/script.json`을 쓴다(아래 형식). slug는 영문 소문자·숫자·하이픈.
4. **TTS+타임라인만 먼저**:
   `cd {{ENGINE}}; node build.mjs projects/<slug>/script.json --no-render`
   출력의 문장별 발음(예: `AI→에이아이`)이 이상하면 대본의 `pron`에 교정을 넣는다.
5. **정지 화면 점검** — 글이 많은 장면 2~3개를 `node build.mjs projects/<slug>/script.json --still <장면번호>`로 뽑아 이미지로 열어 본다(`projects/<slug>/still_N.png`). 글 넘침·겹침이 있으면 글을 줄인다. 확인 후 still 파일은 지운다.
6. **렌더** — `node build.mjs projects/<slug>/script.json` (72초 영상 기준 약 1.5분, 백그라운드 실행 권장). 끝나면 mp4 경로와 길이를 알린다(파일 전송 도구가 있으면 함께 보낸다).
7. **수정 요청** — 대본만 고쳐 다시 빌드. 바뀐 문장만 다시 합성(해시 캐시 `tts_cache/`)되므로 빠르다.

## script.json 형식

(아래 `//` 주석은 설명용이다. 실제 JSON 파일에는 넣지 않는다. 완성 예시: `projects/llm/script.json`)

```json
{
  "title": "영상 제목",
  "voice": "F1",            // Supertonic 음성: F1~F5(여), M1~M5(남)
  "speed": 1.0,             // 말 속도(0.9 차분 ~ 1.15 빠름)
  "theme": "sky",           // sky | mint | peach | night
  "bgm": true,              // 코드로 만든 잔잔한 배경음(내레이션 중 자동으로 작아짐)
  "bgmVolume": 0.07,
  "captions": true,         // 하단 자막
  "pron": { "챗GPT": "챗지피티" },   // 발음 교정(원문 → 읽을 말)
  "scenes": [ { "type": "...", "say": ["문장1", "문장2"], ... } ]
}
```

**`say` = 내레이션 문장 배열.** 문장 하나하나가 따로 합성되어 정확한 시작 시점을 안다. 목록형 장면은 **"도입 문장 N개 + 항목당 1문장"** 으로 쓰면 각 항목이 그 문장을 말하는 순간 튀어나온다(요소 k는 `say[say.length - 항목수 + k]`와 함께 등장).

| type | 필드 | 등장 규칙 / 효과음 |
|---|---|---|
| `title` | `emoji`, `title`(≤14자), `subtitle`(≤16자) | 부제는 2번째 문장에 / 쿵+반짝 |
| `analogy` | `title?`, `left{emoji,label}`, `right{emoji,label}`, `text?`(= 아래 작은 글, 기본 "쉽게 말하면") | 왼쪽·=·오른쪽 3단계 → say 3문장 권장 / 톡·딸깍·딩 |
| `steps` | `title`, `items[{emoji,text≤12자}]` 2~5개 | 항목별 / 톡. 지금 말하는 카드 강조 |
| `flow` | `title`, `nodes[{emoji,label≤8자}]` 2~5개 | 화살표가 그려진 뒤 노드 등장, 끝나면 점이 흘러감 / 휙+톡 |
| `compare` | `title`, `left{emoji,title,items[≤14자]}`, `right{…}` | 왼쪽·오른쪽 2단계 → say 2문장 이상 / 톡·딸깍(VS) |
| `number` | `emoji`, `value`(숫자), `unit`, `label` | 첫 문장에 0부터 세어 올라감 / 똑똑똑+쿵 |
| `bars` | `title`, `bars[{label,emoji,value}]` 2~5개 | 막대별로 자람 / 뾰옹 |
| `emoji` | `title?`, `items[{emoji,label?,x,y,size?}]`(x,y는 0~1), `caption?` | 그림 자유 배치(이야기 장면용) / 톡 |
| `recap` | `title?`, `items[{emoji?,text≤16자}]` 또는 문자열 | 체크 하나씩, 마지막은 완료 화음 |
| `quote` | `emoji`, `text`(≤30자), `by?` | 핵심 한 문장 / 딩 |

장면 공통 옵션: `"sfx": false`(그 장면 효과음 끄기), `"hold": 1.5`(마지막 문장 뒤 머무는 시간 추가, 초)

## 대본 쓰는 규칙 (쉬운 설명의 핵심)

- **해요체, 한 문장 30자 안팎, 한 문장에 생각 하나.** 쉼표로 숨 쉴 곳을 만든다.
- 전문용어는 처음 나올 때 **일상 비유로 먼저** 말하고 이름은 나중에 붙인다("공책을 모두가 나눠 가진 것, 이걸 블록체인이라고 해요").
- 비유 대상은 집·학교·음식·장난감·우편·도로처럼 누구나 아는 것.
- 화면 글자는 내레이션보다 **훨씬 짧게**(핵심 단어만). 내레이션을 화면에 그대로 옮기지 않는다(자막이 따로 있다).
- 이모지는 뜻이 바로 보이는 것을 고른다. 장면마다 다른 이모지를 쓴다.
- 영어 약어는 `spoken.mjs`가 대부분 읽어 주지만(AI→에이아이, GPU→지피유), 고유명사는 `pron`으로 교정한다. 숫자·단위(3.5배, 2024년)는 자동 변환된다.
- 질문으로 시작하고, 마지막은 정리(`recap`)나 핵심 한 문장(`quote`)으로 닫는다.

## 문제 해결

- **TTS 실패**: `config.json`의 `python`(없으면 윈도우 `py -3`, 그 외 `python3`)에 `supertonic`·`soundfile`·`numpy`가 있어야 한다. 모델은 `~/.cache/supertonic3`를 재사용한다(없으면 약 380MB 자동 다운로드).
- **글 넘침**: 표의 글자 수 상한을 지키고, 항목 수를 줄이거나 장면을 둘로 나눈다.
- **효과음 바꾸기**: `sfx.mjs`의 `RECIPES`(whoosh·pop·ding·click·tick·sparkle·success·thud·rise·wrong·swipe)를 고친 뒤 `public/sfx/`를 지우면 다시 생성된다.
- **새 장면 종류 추가**: `src/scenes.tsx`에 컴포넌트를 만들어 `SCENES`에 등록하고, `src/types.ts`와 `build.mjs`의 `TYPES`에 이름을 추가한다.
- Remotion 라이선스: 개인·3인 이하 회사는 무료, 그 이상은 회사 라이선스가 필요하다.
