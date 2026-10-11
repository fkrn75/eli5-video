
## 직접 그린 그림 쓰기 (이미지 생성 에이전트 전용)

이 에이전트는 이미지 생성 도구가 있다. **이모지만으로는 와닿지 않는 장면에 직접 그린 일러스트를 넣는다.** 그림이 없는 장면은 지금처럼 이모지를 쓴다(섞어 써도 된다).

### 도구
| 에이전트 | 도구 | 쓰는 법 | 결과 위치 |
|---|---|---|---|
| Codex | 내장 `image_gen`(또는 `$imagegen` 스킬) | `prompt` + 아이콘이면 `transparent_background: true`. 크기·비율 인자가 없으므로 **비율은 프롬프트 문장으로** 지정("square 1:1 composition" / "wide 16:9 landscape composition") | `~/.codex/generated_images/<thread>/…png` → 프로젝트로 **복사** |
| Antigravity | `generate_image` | `Prompt`, `ImageName`(영문 소문자_밑줄, 3단어 이하), `AspectRatio`('1:1' 아이콘 / '16:9' 삽화). 투명 배경은 지원하지 않으므로 **흰 배경**으로 그린다 | 도구 응답에 나온 저장 경로 → 프로젝트로 **복사** |

이미지 생성 도구가 보이지 않으면 이 절은 건너뛰고 이모지만 쓴다. 생성이 실패하거나 너무 느리면 그 장면은 이모지로 대신한다.

### 몇 장, 어디에 (영상 1편 3~6장)
- **`picture` 장면(16:9 큰 삽화) 1~2장**: 비유나 이야기를 한 장면으로 보여 줄 때. 예: "도서관 사서가 책을 정리하는 모습" = 데이터베이스 비유.
- **아이콘(1:1) 2~4장**: 핵심 개념처럼 이모지로 표현하기 어려운 것. 예: `title`의 주인공, `analogy`의 양쪽, `steps` 핵심 단계.
- 장면마다 그리지 않는다. 생성은 장당 수십 초에서 몇 분이 걸린다.

### 스타일 (모든 프롬프트에 같은 스타일 문구 → 영상 전체 톤 통일)
모든 프롬프트 끝에 이 문구를 그대로 붙인다:
> `flat vector illustration, soft pastel colors, thick rounded dark outlines, cute friendly style, simple shapes, consistent character design, no text, no letters, no numbers, no watermark`

- **아이콘**: `single object centered, plain pure white background, generous empty margin around the object` (Codex는 여기에 `transparent_background: true`를 함께 쓴다)
- **삽화**: `wide 16:9 scene, simple background, main subject in the center, leave the bottom fifth calm and uncluttered` (아래쪽에 캡션이 올라간다)
- **그림 안에 글자를 넣지 않는다.** 한글이 깨지므로 글은 장면의 `title`·`label`·`caption` 필드로 쓴다.
- 실존 인물, 회사 로고, 브랜드 캐릭터는 그리지 않는다.
- 같은 캐릭터가 여러 장에 나오면 첫 그림을 참고 이미지로 넘긴다(Codex `referenced_image_paths`, Antigravity `ImagePaths`). 그래야 생김새가 유지된다.

### 저장과 대본 연결
1. 생성한 파일을 `projects/<slug>/images/<영문_이름>.png`로 **복사**한다. 이미 있으면 덮어쓰지 말고 `-v2`를 붙인다.
2. 대본에서 `"img": "images/<이름>.png"`로 쓴다. **`emoji`를 쓸 수 있는 곳이면 어디든** 쓸 수 있고, 둘 다 있으면 `img`가 우선이다.
   - 장면: `title`·`number`·`quote`의 `img`
   - 항목: `steps`의 `items[].img`, `flow`의 `nodes[].img`, `bars`의 `bars[].img`, `emoji`의 `items[].img`, `recap`의 `items[].img`
   - 양쪽: `analogy`·`compare`의 `left.img`·`right.img`
3. 큰 삽화 장면:
   ```json
   { "type": "picture", "img": "images/library.png", "title": "데이터베이스는 도서관", "caption": "사서가 책을 찾아 줘요",
     "say": ["데이터베이스는 커다란 도서관 같아요.", "필요한 책을 말하면 사서가 금방 찾아 주죠."] }
   ```
   - `title`과 `caption`은 선택이다. 캡션은 두 번째 문장과 함께 나온다.
   - 장면 내내 천천히 확대된다. 끄려면 `"zoom": false`.
4. **흰 배경 그림**은 밝은 테마(sky·mint·peach)에서 자동으로 배경에 녹는다(multiply 합성). `night` 테마에서는 투명 배경 그림을 쓰거나 대본에 `"imgBlend": "normal"`을 넣는다.
5. **정지 화면 점검**(절차 5)에서 그림이 들어간 장면을 꼭 본다. 잘림, 흰 박스, 글자가 섞인 그림이 보이면 프롬프트를 고쳐 다시 생성한다.
