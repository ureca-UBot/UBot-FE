# 상담사 연결 작업 정리

## 구현 범위

- 고객은 기존 `/#/ai` 화면의 `상담사 호출`로 현재 대화의 저장 이력을 자동으로 인계하고, 같은 화면에서 대기·연결·상담·종료까지 이어 갑니다. 예전 `/#/counsel` 주소는 `/#/ai`로 연결합니다.
- 비회원은 상담사 호출 버튼을 누르면 로그인 화면으로 이동하며 상담 API를 보내지 않습니다.
- 대기 중에는 다른 대화나 새 AI 대화를 이용하고 상담으로 돌아올 수 있습니다. 상담이 연결되면 해당 상담에서 AI 질문을 막고, 종료 후에는 같은 대화에서 AI 질문과 FAQ 선택을 다시 쓸 수 있습니다.
- 상담사(`COUNSELOR`)는 로그인하면 `/#/counselor`로 이동합니다. 상담 가능·오프라인 전환, 접속 확인(heartbeat), 배정 확인, 메시지 전송, 종료를 제공합니다.
- 상담 화면은 상담 전의 고객·AI 문답(인계 이력)과 이후 상담 메시지를 이어서 보여 줍니다. 종료된 대화는 AI 문답, FAQ 선택, 상담 메시지, 연결·종료 표시를 합친 통합 이력으로 보여 줍니다.
- 기존 채팅 목록에 `상담 내역 포함` 표시와 마지막 메시지 미리보기, `이전 대화 더 보기`, 모바일 `최근 대화 · 상담 내역`을 추가했습니다.
- 관리자 메뉴에 `상담 안전성 모니터링`(판정 기록·집계)과 `상담 금지 문장`(검색·등록·수정·활성화·삭제)을 추가했습니다.

## 백엔드 연동

이력·판정·권한은 BE가 정하고 FE는 그 결과를 표시합니다.

| 기능 | API | FE가 보내는 값 |
|---|---|---|
| 상담 요청 | `POST /api/counsel/requests` | `{handoffId, conversationId}`. 문답 본문·FAQ ID는 보내지 않습니다. |
| 상담 상태 | `GET /api/counsel/sessions/current`, `/sessions/{id}`, `/sessions/conversation/{conversationId}` | — |
| 인계 이력 | `GET /api/counsel/sessions/{id}/context` | 마지막 `sequence` |
| 메시지 | `GET`·`POST /api/counsel/sessions/{id}/messages` | `{clientMessageId, content}` |
| 상담사 상태 | `POST /api/counsel/counselors/availability`, `/heartbeat` | — |
| FAQ 선택 저장 | `POST /api/conversations/faq-selections` | `{selectionId, conversationId, faqId}` |
| 통합 이력 | `GET /api/conversations/{id}/timeline` | 서버가 준 `nextCursor` |
| 관리자 | `/api/admin/counsel/safety/events`, `/summary`, `/sentences` | — |

- 회원이 FAQ를 누르면 서버에 저장한 원문을 화면에 표시합니다. 같은 선택의 재시도는 같은 `selectionId`를 씁니다.
- 상담 요청에는 현재 선택한 `conversationId`를 보냅니다. BE가 해당 대화의 AI 문답·FAQ 선택 사본·허용된 이전 상담 메시지를 조회합니다. 종료 후 추가한 문답도 재상담에 포함하며, FE가 화면 본문을 복사해 보내지 않습니다.
- 새로고침 후 대화를 아직 선택하지 않았으면 복원한 상담의 대화 ID를 사용합니다. 명시적으로 새 대화를 시작했고 저장 기록도 없다면 새 상담 대화를 만듭니다. 응답을 받지 못한 요청은 같은 `handoffId`와 대화 ID로 다시 확인합니다.
- 메시지의 `mine`은 서버가 계산한 값을 그대로 씁니다.
- 메시지 응답이 유실되면 같은 `clientMessageId`로 결과를 다시 확인합니다. `PENDING`은 같은 ID로 2초마다 확인하고, `CHECK_FAILED`가 확정되면 새 ID로 다시 보냅니다.
- 진행 중이던 상담이 `current`에서 빠지면 상태를 추정하지 않고 `GET /sessions/{id}`로 서버의 마지막 상태를 받습니다. 상담사가 다른 상담사에게 재배정돼 조회 권한을 잃으면(`COUNSEL-003`·`COUNSEL-004`) 종료가 아니라 재배정 안내를 표시합니다.
- 종료된 상담은 마지막 메시지까지 모두 읽은 뒤 고객 쪽 상태·메시지 조회를 멈춥니다. 상담사 화면은 다음 배정을 위해 상태 조회와 heartbeat를 계속합니다.
- 금지 문장은 저장 후 BE가 자동 색인합니다. FE는 활성 문장이 `PENDING`·`INDEXING`인 동안만 목록을 다시 조회하고, 색인이 실패했을 때만 재시도 버튼을 보여 줍니다. 수정·삭제·재시도에는 서버의 `revision`을 보냅니다.

## 파일 구성과 기존 코드 변경

| 위치 | 내용 |
|---|---|
| `src/counsel/api` | 상담·금지 문장 API. 상담 API는 요청 제한 시간(15초)과 요청 취소를 위해 `apiClient.request`를 씁니다. |
| `src/counsel/hooks/useCustomerCounsel.ts` | 고객 상담 상태 조회·요청·종료, 새로고침 후 상담 ID 복원 |
| `src/counsel/components` | 상담 메시지(`CounselConversation`), 통합 이력(`ConversationTimeline`), 금지 문장 표·편집 창 |
| `src/counsel/pages` | 상담사 화면, 관리자 모니터링·금지 문장 화면 |
| `src/counsel/config/counselConfig.ts` | 활성화 여부, 폴링 2초, heartbeat 15초, 요청 제한 시간 15초 |
| `src/user/pages/AiPage.tsx` | AI 화면 안의 상담 호출·상담 화면·종료 후 이어서 질문 |
| `src/user/ai/context/ChatProvider.tsx` | 상담 중 채팅 잠금, 회원 FAQ 선택 저장 |
| `src/user/ai/components/ConversationHistory.tsx` | 상담 포함 표시, 미리보기, 이전 대화 더 보기 |
| `src/shared/styles/chat.css` | 고객·상담사 화면이 함께 쓰는 말풍선·입력창. 상담사가 바로 접속해도 스타일이 빠지지 않도록 기존 AI 화면 CSS에서 옮겼습니다. |
| `src/shared/api/client.ts` | `apiClient.request(path, init)` 한 줄 추가 |
| `src/App.tsx`, `src/admin/AdminApp.tsx`, `AdminSidebar.tsx` | 상담사·관리자 라우트와 메뉴 |
| `src/auth` | `COUNSELOR` 역할과 로그인 후 이동 경로 |

상담과 직접 관련 없는 변경도 함께 들어 있습니다. 리뷰할 때 따로 확인해 주세요.

- `.github/workflows/static.yml` 삭제: develop push마다 `frontend-pages.yml`과 같이 Pages를 배포하던 중복 워크플로입니다. `frontend-pages.yml`에는 `environment`를 추가했습니다.
- `scripts/regression.test.cjs`: develop의 메인 화면 재구성으로 바뀐 경로·라벨에 맞춰 기존 테스트를 고쳤습니다.
- `useFaqImprovements.ts`: 화면을 떠난 뒤 늦게 온 응답을 무시합니다.
- `StorePage.tsx`: 메뉴를 오갈 때 상품 검색어가 유지되도록 마운트 조건을 정리했습니다.
- `dashboard.css`: 모바일 관리자 메뉴가 페이지 폭을 늘리지 않도록 `min-width: 0`을 추가했습니다.

## 실행과 배포 설정

- 상담은 기존 BE(`UBot-BE`)의 `/api/counsel`을 씁니다. 로컬에서는 기존 `/api` 프록시가 그대로 전달합니다.
- `VITE_COUNSEL_ENABLED=false`면 상담 화면과 호출 버튼을 끕니다. GitHub Pages 빌드는 `VITE_API_BASE_URL`이 비어 있으면 자동으로 끕니다.
- GitHub Pages에서는 BE의 `CORS_ALLOWED_ORIGINS`에 FE origin을 추가해야 합니다. CSP의 `connect-src`는 기존 `vite.config.ts`가 `VITE_API_BASE_URL`로 채웁니다.
- 상담사로 승격된 계정은 다시 로그인해야 화면에 새 역할이 반영됩니다. 서버는 요청마다 현재 DB 역할로 권한을 확인합니다.
- 이 FE는 같은 시점의 BE(내부 사용자 ID 제거, `mine`, 타임라인 커서, FAQ 선택 저장, `/admin/counsel` 경로)와 함께 배포해야 합니다.

## 확인 순서

```powershell
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:counsel
npm run test:counsel:history
npm run test:counsel:handoff
npm run test:counsel:waiting
npm run test:counsel:admin
npm run test:counsel:pages
```

Windows에 설치된 Edge로 실행하려면 `$env:PLAYWRIGHT_CHANNEL='msedge'`를 설정합니다. 상담 브라우저 테스트는 API 응답 모형(fixture)으로 고객·상담사·관리자 화면, 차단·검사 실패, 같은 ID 재시도, 재배정 안내, 모바일 너비, 새로고침 복원을 확인합니다. 스크린샷은 `test-results/counsel/`에 남습니다. 실제 서버 권한과 임베딩 판정 정확도는 BE 테스트와 실제 계정 실행으로 따로 확인해야 합니다.

## 알려진 제한과 후속 작업

- 실시간 전송(WebSocket·SSE) 없이 2초 폴링으로 메시지와 상태를 받습니다.
- 인계 이력의 "내 메시지" 표시, 인계 이력·메시지의 다음 페이지 여부, 오류 시 재시도 여부는 아직 FE가 판단합니다. BE가 `mine`, `hasNext`, `retryable`을 내려주면 FE 판단을 지울 수 있습니다.
- 상담 브라우저 테스트 4개는 develop의 `node --test` 구조와 공용 fixture를 쓰지 않고 각자 개발 서버를 띄웁니다. CI 브라우저 테스트 job 포함 여부는 팀에서 정해야 합니다.
