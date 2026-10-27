# 의도 선택 재검색 UI 작업 정리

관련 이슈: [UBot-FE #29](https://github.com/ureca-UBot/UBot-FE/issues/29)

> 백엔드 재검색 API는 아직 병합되지 않았습니다. 이 문서의 엔드포인트 경로와 응답 형식은 프론트가 가정한 계약이며, 백엔드가 병합되면 실제 값과 맞춰 확인해야 합니다.

## 구현 범위

- 로그인한 사용자가 질문에 성공한 답변을 받으면, 답변 아래에 "혹시 질문이 다른 의도였나요?"와 의도 버튼 3개(일반 문의 / 매장 찾기 / 내 정보 확인)를 보여줍니다.
- 버튼을 누르면 같은 질문을 선택한 의도로 다시 검색하고, 결과를 원래 답변 아래에 의도별로 쌓아 보여줍니다.
- 한 질문에서 의도마다 한 번만 재검색할 수 있습니다. 이미 사용한 의도의 버튼은 비활성화됩니다.
- 위치는 매장 찾기 버튼을 눌렀을 때만 요청합니다. 위치를 얻지 못하면 안내 문구를 보여주고 위치 없이 검색합니다.
- 비회원에게는 버튼을 보여주지 않습니다.
- 재검색은 원래 답변의 결과를 바꾸지 않습니다. 재검색 중에는 입력창과 다른 요청을 막아 연속 요청을 방지합니다.

## 백엔드 연동 가정

| 항목 | 내용 |
| --- | --- |
| 요청 | `POST /chat/questions/research` (프론트 호출 경로는 `/api/chat/questions/research`) |
| 헤더 | `Idempotency-Key`: 재검색할 원래 성공 답변의 `idempotencyKey` |
| 본문 | `{ "intent": "GENERAL" \| "STORE_DATA" \| "USER_DATA", "latitude"?: number, "longitude"?: number }` |
| 응답 | 기존 `ChatResponse`와 같은 형식 (`answer`, `status`, `idempotencyKey`, `attemptCount`, `retryable`) |
| 인증 | 로그인 필요 |

- 위도와 경도는 함께 있을 때만 보냅니다.
- 이미 사용한 의도(`CHAT-019`)나 재검색할 수 없는 답변(`CHAT-018`)은 서버가 거절하고, 프론트는 서버가 준 메시지를 오류 카드로 표시합니다.
- 서버가 처리한 요청은 성공·실패와 관계없이 그 의도를 사용한 것으로 보고 버튼을 잠급니다. 서버에 닿지 못한 네트워크 실패만 같은 버튼을 다시 누를 수 있습니다.

## 파일 구성과 기존 코드 변경

| 파일 | 역할 |
| --- | --- |
| `src/user/ai/types/chat.ts` | `ChatIntent`, `ChatResearchRequest`, `ChatResearch`, `ChatLocation`, 의도 라벨 상수, `ChatTurn.researches` 추가 |
| `src/user/ai/api/chatApi.ts` | `researchAnswer` 요청 함수 추가, `ChatApi` 타입, 개발용 mock 스위치 |
| `src/user/ai/api/chatApi.mock.ts` | 백엔드 없이 확인하기 위한 개발용 mock (연동 확인 후 제거 예정) |
| `src/user/ai/context/ChatContext.ts` | `researchAnswer` 값 추가 |
| `src/user/ai/context/ChatProvider.tsx` | 재검색 요청과 상태 처리, 응답 해석을 `settleRequest`로 분리 |
| `src/user/ai/utils/getCurrentLocation.ts` | 브라우저 현재 위치 조회, 실패 시 `null` |
| `src/user/ai/components/ResearchIntentButtons.tsx` | 의도 선택 버튼과 위치 조회 처리 |
| `src/user/ai/components/ChatMessages.tsx` | 성공한 답변 아래에 버튼과 의도별 결과 표시 |
| `src/user/pages/AiPage.tsx` | 로그인 여부와 `researchAnswer`를 `ChatMessages`에 연결 |
| `src/user/styles/user.css` | 재검색 영역 스타일 |
| `.env.example` | `VITE_CHAT_MOCK` 설명 추가 |

기존 질문 전송·재시도 흐름과 공용 `apiClient`, 인증 구현은 변경하지 않습니다. `ChatProvider`에서는 응답 해석을 함수로 분리했을 뿐 일반 요청의 동작은 같습니다. 의존성도 변경하지 않습니다.

## 팀원 실행 방법

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
npm ci
npm run dev
```

브라우저에서 `http://localhost:5173/#/ai`로 접속합니다. Node.js 요구 버전과 환경변수는 루트 README를 따릅니다.

## 백엔드 없이 화면만 확인하기

재검색 API가 병합되기 전에는 개발용 mock으로 확인합니다. mock은 개발 서버에서만 켜지며, 배포 빌드에는 포함되지 않습니다.

1. 프로젝트 루트의 `.env.local`에 아래 값을 추가합니다.

```dotenv
   VITE_CHAT_MOCK=true
```

2. 개발 서버를 다시 실행합니다(`npm run dev`). 콘솔에 `[chatApi] VITE_CHAT_MOCK=true: ...` 안내가 보이면 mock이 켜진 것입니다.
3. 로그인은 mock에 포함되지 않습니다. 브라우저 개발자 도구 콘솔에서 로컬용 가짜 토큰을 `sessionStorage`에 넣어 흉내 냅니다.

```js
   const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
   const token = `${b64({ alg: 'none' })}.${b64({ sub: '1', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 })}.x`
   sessionStorage.setItem('accessToken', token)
   sessionStorage.setItem('refreshToken', 'x')
   location.reload()
```

   이 토큰은 서버가 거절하는 값이며 로컬 화면 확인에만 사용합니다.
4. mock의 동작은 다음과 같습니다.
   - 질문을 보내면 항상 성공한 답변을 돌려줍니다(답변 재시도는 지원하지 않음).
   - 일반 문의·매장 찾기는 성공 결과를 돌려주며, 매장 찾기에서 위치를 받으면 결과에 좌표가 표시됩니다.
   - 내 정보 확인은 오류 카드 확인을 위해 `CHAT-019` 오류를 돌려줍니다.

`.env.local`에서 값을 지우거나 `false`로 두면 실제 API를 사용합니다. 재검색 API 연동을 확인한 뒤에는 `chatApi.mock.ts`, `chatApi.ts`의 mock 스위치, `.env.example`의 `VITE_CHAT_MOCK`, 이 절을 제거합니다.

## 확인 순서

1. 로그인한 상태에서 질문을 보내 성공한 답변을 받습니다.
2. 답변 아래에 "혹시 질문이 다른 의도였나요?"와 버튼 3개가 보이는지 확인합니다.
3. 일반 문의를 누르면 결과가 답변 아래에 생기고 그 버튼이 잠기는지 확인합니다.
4. 매장 찾기를 누르면 위치 권한 요청이 뜨는지, 허용하면 요청에 위도·경도가 포함되는지 확인합니다. 거부하면 안내 문구가 보이고 위치 없이 요청되는지 확인합니다.
5. 서버가 오류를 돌려주면 오류 카드에 메시지가 보이고 그 의도의 버튼이 잠기는지 확인합니다.
6. 재검색 중에는 입력창과 다른 버튼이 잠기는지 확인합니다.
7. `새 대화`를 누르면 버튼과 결과가 모두 사라지는지 확인합니다.
8. 로그아웃(비회원) 상태에서는 버튼이 보이지 않는지 확인합니다.
9. 개발자 도구의 Network에서 재검색 요청의 `Idempotency-Key` 헤더와 요청 본문을 확인합니다.

## 알려진 제한과 후속 작업

- 백엔드 재검색 API가 병합되면 엔드포인트 경로, 응답 형식, 오류 코드를 실제 값과 맞추고 개발용 mock을 제거합니다.
- 비회원이 로그인하면 대화가 유지되는데, 비회원 때 받은 답변의 재검색은 서버가 거절할 수 있습니다. 백엔드 연동 때 동작을 확인합니다.
- 재검색 결과는 누른 순서대로 쌓입니다. 버튼 순서로 고정하는 것은 필요하면 후속 작업으로 합니다.
- 화면 대화는 새로고침하면 초기화됩니다. 재검색 결과도 같습니다.