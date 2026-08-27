# charts — 수치를 형태로

차트는 **사람이 읽고 엔진이 그린다.** 여기 있는 건 취향이 아니라 절차다.
dataviz 스킬의 지침을 이 스킬의 조건(자동재생 영상, 1920px 스테이지, 테마 팔레트)에
맞춰 적용했다.

## 0. 순서 — 색은 마지막이다

```
데이터의 일이 무엇인가      크기? 정체? 극성? 한 줄 헤드라인? 시간 변화?
        ↓
형태를 고른다              그 일이 차트 종류를 정한다. 때로는 차트가 답이 아니다
        ↓
색을 일에 맞게 고른다        sequential / categorical / diverging / emphasis
        ↓
렌더하고 눈으로 본다         라벨 충돌·넘침은 스크린샷에서만 보인다
```

## 1. 차트가 맞나

| 데이터가… | 쓸 것 | 쓰지 말 것 |
|---|---|---|
| 현재 값 하나 (+추세) | `dataCounter` 패턴 · 카드에 `spark` | 막대 하나짜리 차트 |
| 헤드라인 숫자 몇 개 | `dataCounter` (1~4개) | 그룹 막대 |
| 한계선 대비 비율 하나 | `gauge` | 조각 2개짜리 도넛 |
| 의미 있는 분류가 7개 넘음 | 씬을 나눈다 | 색을 더 만든다 |

**차트는 하나의 씬에 하나.** 두 개를 나란히 놓고 싶으면 씬이 두 개다.

## 2. 일 → 형태

| 읽는 사람이 해야 할 일 | 차트 | 색의 일 |
|---|---|---|
| 크기를 견준다 | `bar` · 이름이 길면 `barH` | sequential |
| 격자 위 밀도 | `heatmap` | sequential |
| 시간에 따른 추세 | `line` · 단일 시리즈면 `area` | 1색 또는 categorical |
| 시리즈를 구분한다 | `barGroup` · 다중 `line` | **categorical** |
| 하나가 요점, 나머지는 맥락 | `bar` + `options.emphasis` | 1색 + 회색 |
| 부분과 전체 | `barStack` · 조각 5개 이하면 `donut` | categorical |
| 무엇이 더하고 뺐나 | `waterfall` | diverging(자동) |
| 목표 대비 | `bullet` | 상태색(자동) |
| 두 시점 사이 이동 | `slope` · 항목 많으면 `dumbbell` | diverging(자동) |
| 여러 축의 프로필 | `radar` | categorical |
| 두 값의 관계 | `scatter` | categorical(3개까지) |
| 비율을 사람 수로 | `isotype` | 1색 |
| 카드 안 미니 추이 | 항목의 `spark` | 자동 |

## 3. 색 — 네 가지 일, 각각 하나의 규칙

**sequential 이 기본이다.** 한 색조, 값이 클수록 배경에서 멀어진다. 가장 안 틀린다.
데이터의 일이 *정체*나 *극성*일 때만 다른 걸 쓴다.

```jsonc
"options": {}                        // sequential — 테마 accent 한 색조 (기본)
"options": { "emphasis": 2 }         // 2번만 accent, 나머지 회색. 가장 저평가된 형태
"options": { "categorical": true }   // 시리즈가 주제일 때만
```

- **categorical 은 고정 순서이고 절대 순환하지 않는다.** 검증 통과한 8색이며
  (`validate_palette.js` 5개 검사 PASS, light/dark 양쪽) 9번째 시리즈는 만들지 않는다 —
  "기타"로 접거나 씬을 나눈다. 엔진이 9개 이상이면 오류로 막는다.
- **diverging 은 엔진이 알아서 쓴다.** `waterfall`(증가/감소), `slope`·`dumbbell`(오름/내림)이
  그렇다. 중간은 중립이고 무지개는 없다.
- **상태색(good/warn/bad)은 예약이다.** "시리즈 4번"으로 쓰지 않는다.
- **텍스트는 데이터 색을 입지 않는다.** 값·라벨·범례는 잉크 색이고, 옆의 마크가 정체를 진다.

## 4. 엔진이 지키는 것

스펙에 쓰지 않아도 자동으로 적용된다. 어길 수 없다.

- **축은 하나.** 두 y축 차트는 만들 수 없다 — 서로 다른 스케일이면 씬을 나눈다
- 막대는 24px 상한(스테이지 크기에 비례 확대), 밴드를 채우지 않는다 — 남는 건 공기
- 선 2px·둥근 조인, 마커 반지름 4px 이상, 영역 채움은 10% 워시
- 접하는 마크 사이 2px 간격, 점·끝마커에 배경색 링
- 격자·축은 1px 실선이고 뒤로 물러난다(점선 아님)
- 값 라벨은 **선택적** — 막대 캡, 선 끝점에만. 모든 점에 숫자를 달지 않는다
- **끝 라벨이 겹치면 밀어낸다** — 포개서 쌓지 않는다
- 시리즈 2개 이상이면 **범례가 항상 있다**. 색만으로 정체를 알게 두지 않는다
- 축 눈금은 깔끔한 수로 반올림하고 천 단위 쉼표를 넣는다
- 차트 씬은 배경 장식이 한 단계 약해진다 — 데이터 위에 무늬가 겹치면 읽는 속도가 떨어진다

hover 툴팁은 없다. **자동재생 영상이라 마우스가 없다** — 그래서 직접 라벨이 기본이다.

## 5. 스펙

```jsonc
{ "pattern": "chart",
  "chart": "bar",                    // 17종 중 하나 (필수)
  "title": "3월에 꺾였다",             // 결론을 제목에 쓴다. "월별 추이"가 아니라
  "kicker": "월별", "sub": "…",
  "data": {                          // 형태는 차트가 정한다 (아래)
    "items": [ { "label": "1월", "value": 1240 } ]
  },
  "options": { "emphasis": 2, "unit": "%", "dec": 1, "max": 100 },
  "caption": "차트 아래 한 줄" }
```

### 데이터 형태

```jsonc
// 단일 시리즈 — bar · barH · donut · area · isotype · gauge · bullet
"data": { "items": [ { "label": "1월", "value": 1240 } ] }
"data": { "items": [41] }                                   // 값만
"data": { "items": [ { "label": "가입", "value": 82, "target": 100 } ] }   // bullet

// 다중 시리즈 — line · barGroup · barStack · radar · slope · dumbbell
"data": { "categories": ["1월","2월","3월"],
          "series": [ { "name": "가입", "values": [820, 1100, 1340] },
                      { "name": "정착", "values": [410, 480, 470] } ] }

// heatmap
"data": { "categories": ["월","화","수"], "rows": ["오전","오후"],
          "grid": [ [12,18,22], [28,34,41] ] }

// scatter
"data": { "points": [ { "x": 12, "y": 4.2, "size": 900, "label": "A", "group": "국내" } ] }
```

### options

| 필드 | 어디에 | 뜻 |
|---|---|---|
| `emphasis` | bar barH slope | 이 인덱스만 accent, 나머지 회색 |
| `categorical` | 단일 시리즈 차트 | 항목마다 다른 색 (시리즈가 주제일 때만) |
| `unit` `dec` | 전부 | 단위 문자열 · 소수 자릿수 |
| `max` | gauge bullet radar | 축의 상한 |
| `tone` | gauge | `good` `warn` `bad` — 채움이 심각도를 진다 |
| `label` `center` `centerLabel` | gauge donut | 가운데 글자 |
| `sort` | barH | `false` 면 정렬하지 않는다 (기본은 큰 값부터) |
| `horizontal` | barStack | 가로로 눕힌다 — 이름이 길거나 항목이 많을 때 |
| `totals` | waterfall | 합계로 취급할 인덱스 배열 (예: `[0, 4]`) |
| `icon` | isotype | 칸에 쓸 픽토그램 (기본은 원) |
| `cols` | isotype | 한 줄 칸 수 (기본 10) |
| `values` | heatmap | `false` 면 셀 안 숫자를 뺀다 |
| `labels` | bar line | `false` 면 값 라벨을 뺀다 |
| `sharedScale` | bullet | `true` 면 모든 행이 같은 축을 쓴다 (기본은 행마다 자기 축) |

## 6. 하지 말 것

1. **두 y축** — 스케일이 다르면 씬을 나눈다. 가장 흔한 차트 실수다
2. **색을 더 만들기** — 시리즈가 많으면 접거나 나눈다
3. **모든 점에 숫자** — 읽히지 않고 그림만 더러워진다
4. **도넛 조각 6개 이상** — 누적 가로 막대(`barStack` + `horizontal`)가 낫다
5. **제목에 "월별 추이"** — 제목은 결론이다. "3월에 꺾였다"
6. **막대 10개 넘게 세로로** — `barH` 로 눕히거나 상위만 남긴다
7. **차트 씬 연속 3개** — 숫자만 이어지면 아무것도 안 남는다. 사이에 `quote` 나 `heroReveal` 을 둔다
8. **스크린샷을 안 보기** — 라벨 충돌과 넘침은 눈으로만 보인다
