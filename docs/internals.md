# 화면 상태와 서버 연동

[전체 기능](README.md) · [코드 배치](FRONTEND_STRUCTURE_GUIDE.md) · [실행과 검증](development.md)

프론트는 사용자의 입력을 서버 요청으로 바꾸고 처리 중·완료·실패 상태를 보여 줍니다. 이 문서는 화면을 이동하거나 응답이 늦어질 때 어떤 상태를 유지하는지, 서버 결과를 어디까지 신뢰하고 표시하는지 설명합니다.

## 화면을 나누는 기준

`App`은 일반 사용자·관리자·상담사 화면을 지연 로딩합니다. `AuthProvider`와 `ChatProvider`는 라우트 밖에 두어 로그인 상태와 진행 중인 대화를 공유합니다. 사용자 화면에서만 쓰는 회원 정보·알림 수는 `MyProfileProvider`와 `NotificationUnreadProvider`가 관리합니다.

`UserApp`은 방문한 페이지를 유지해 검색·지도 상태를 보존합니다. 아직 방문하지 않은 페이지는 조회와 Effect를 시작하지 않습니다. 채팅 결과를 구독하는 화면과 질문 전송만 필요한 화면도 구분합니다. 구체적인 파일 배치는 [프론트엔드 구조](FRONTEND_STRUCTURE_GUIDE.md#상태와-렌더링-경계)를 참고하세요.

## 질문의 상태 전이

| 서버 상태·사건 | 화면에서 하는 일 | 다음 동작 |
|---|---|---|
| 질문 접수 | 작업 ID·대화 ID를 보관하고 입력 중복을 잠금 | 작업 상태 조회 |
| `QUEUED`·`RUNNING` | 서버의 처리 단계와 남은 시간을 표시 | 정상 조회 간격 1.5초 |
| `SUCCEEDED` | 답변과 상품·본인 정보·매장 자료 표시 | 다음 질문 또는 의도 재검색 |
| `FAILED` | 서버의 오류 코드·재시도 가능 여부·시도 횟수 확인 | 조건을 만족하면 동일 질문의 멱등키로 재시도, 최대 3회 시도 |
| 사용자 중단 | 취소 API의 응답을 기다림 | 취소 확정 시 조회 중단. 완료가 먼저 확정됐으면 기존 결과 수신 |
| 새 대화·로그아웃 | 조회를 취소하고 이전 요청의 늦은 응답 무시 | 새 화면에 이전 계정·대화의 결과를 섞지 않음 |

화면을 떠나 조회를 멈춰도 서버 작업이 취소되는 것은 아닙니다. 사용자 중단은 별도 API로 요청합니다. 취소 요청의 응답을 확인하지 못하면 중단 완료로 표시하지 않고 기존 작업을 계속 조회합니다.

429·5xx·네트워크 오류가 나면 조회 간격을 지수 백오프와 무작위 지연으로 늘립니다. 최대 간격은 30초이며, 조회 루프의 대기 기준은 20분입니다. 최종 결과를 확인하지 못하면 FE 오류 `FE-CHAT-001`을 표시합니다. 이 시간은 서버 작업의 실행 제한이나 모든 HTTP 요청의 응답 시간 보장이 아닙니다. 공용 클라이언트에는 일괄 요청 타임아웃이 없고 상담 API는 별도로 15초 제한을 둡니다.

## 상담의 상태와 전송 결과

| 상담 상태 | 고객 화면 | 상담사 화면 |
|---|---|---|
| `WAITING` | 대기 유지, 다른 AI 대화로 이동·복귀, 요청 취소 | 상담 가능 상태로 배정 대기 |
| `ACTIVE` | 상담 메시지 전송, 해당 대화의 AI 질문 잠금 | 인계 기록 확인, 메시지 전송, 종료 |
| `PAUSED` | 재연결 안내, 메시지 입력 중지 | 배정·접속 상태 확인 |
| `ENDED` | 마지막 메시지 조회 후 폴링 종료, AI·FAQ·재상담 이용 | 다음 배정을 위한 상태 조회·heartbeat 유지 |

상담 요청에는 `handoffId`와 `conversationId`만 보냅니다. BE가 저장한 AI 문답·FAQ 선택·허용된 이전 상담 메시지로 인계 이력을 만듭니다. 회원의 FAQ 선택도 먼저 서버에 저장하고, 서버가 반환한 문답을 표시합니다.

메시지 접수 결과는 상담 상태와 별개입니다. `PENDING`은 아직 상대방에게 전달되지 않은 상태이며 같은 `clientMessageId`로 확인합니다. `ALLOWED`만 전달 완료로 표시하고, `BLOCKED`는 내용 수정, `CHECK_FAILED`는 새 전송을 안내합니다. 응답이 유실되면 성공·실패를 추정하지 않고 같은 ID로 결과를 확인할 때까지 다른 전송을 잠급니다.

상담 인계·메시지·종료의 상세 계약은 [상담사 연결](COUNSEL_WORK_SUMMARY.md#백엔드-연동)에 있습니다.

## 유지해야 하는 규칙

| 규칙 | 구현 | 확인 방법 |
|---|---|---|
| 연속 클릭으로 같은 입력을 중복 전송하지 않음 | `ChatProvider`의 렌더링 전 요청 잠금, 상담의 전송 잠금 | [채팅 재시도](../scripts/chat-retry.test.cjs), [상담 smoke](../scripts/counsel-smoke.cjs) |
| 새 대화·계정에 이전 응답을 표시하지 않음 | 대화별 `AbortController`와 요청 참조 비교 | [채팅 중단](../scripts/chat-cancellation.test.cjs), [상태 전이](../scripts/logic.test.cjs) |
| 인계에 브라우저가 만든 답변 본문을 보내지 않음 | `{handoffId, conversationId}` 요청, 서버 이력 조회 | [자동 인계](../scripts/counsel-handoff.test.cjs) |
| 결과를 모르는 상담 요청에 새 ID를 만들지 않음 | 실패 원인에 따라 기존 요청 ID 보관 | [응답 유실 후 재시도](../scripts/counsel-handoff.test.cjs) |
| 토큰 재발급을 동시에 여러 번 보내지 않음 | 공용 `refreshPromise`로 진행 중인 재발급 결과 공유 | [동시 재발급과 세션 보존](../scripts/logic.test.cjs) |

토큰은 `sessionStorage`에 저장합니다. 서버가 만료·거절을 확정한 경우 인증 상태를 정리하며, 네트워크나 서버 오류만으로 토큰을 지우지 않습니다. 역할별 메뉴와 라우트 검사는 화면 진입을 돕는 장치이고, 실제 요청 권한·소유권은 BE가 검사합니다.

## API와 설정을 확인할 위치

브라우저의 API 경로는 `/api`로 시작합니다. 로컬 Vite 프록시는 이 접두사를 제거해 BE로 전달합니다. 배포에서는 nginx나 별도 API 주소 설정이 이 연결을 담당합니다. 공통 응답의 `success`·`data`·`code`·`message`는 공용 클라이언트가 해석합니다.

| 연결 | 요청·응답 코드 | 관련 검증 |
|---|---|---|
| 인증·공통 오류 | [API 클라이언트](../src/shared/api/client.ts), [공통 응답 타입](../src/shared/types/api.ts) | [API 계약](../scripts/api-contract.test.cjs) |
| 질문 접수·조회·재시도·중단 | [채팅 API](../src/user/ai/api/chatApi.ts), [상태 조회](../src/user/ai/api/chatJobPolling.ts), [타입](../src/user/ai/types/chat.ts) | [재시도](../scripts/chat-retry.test.cjs), [중단](../scripts/chat-cancellation.test.cjs) |
| FAQ 선택 저장 | [FAQ 선택 API](../src/user/ai/api/faqSelectionApi.ts) | [상담 인계](../scripts/counsel-handoff.test.cjs) |
| 상담 요청·배정·메시지 | [상담 API](../src/counsel/api/counselApi.ts), [타입](../src/counsel/types/counsel.ts) | [상담 smoke](../scripts/counsel-smoke.cjs) |
| 가드 검사 기록·선택 분석·승인 | [검토 API](../src/admin/guard-review/api/guardReviewApi.ts), [타입](../src/admin/guard-review/types/guardReview.ts) | [필터·근거·승인 조건](../scripts/guard-review.test.cjs), [검토 화면](../scripts/guard-review-browser.test.cjs) |
| 배포 경로·API 주소·지도 | [Vite 설정](../vite.config.ts), [환경변수 설명](development.md#환경변수와-api-경로) | [Pages 설정](../scripts/counsel-pages-smoke.cjs) |

FE 타입은 이 클라이언트가 사용하는 계약입니다. 서버의 최종 검증·저장·권한 규칙은 [UBot-BE](https://github.com/ureca-UBot/UBot-BE)의 기능 문서와 구현을 함께 확인합니다.

## 설계 선택과 제약

| 선택 | 얻는 점 | 함께 감수하는 점 |
|---|---|---|
| 접수 후 폴링으로 완료 확인 | 일반 HTTP로 대기·중단·재시도와 서버 복구 후 결과 조회를 연결 | 주기적 요청 비용과 화면 반영 지연. 토큰 단위 스트리밍은 제공하지 않음 |
| 채팅 상태를 라우트 밖에 보관 | 페이지를 이동해도 같은 대화를 유지 | 로그아웃·새 대화·취소 때 늦은 응답을 직접 걸러야 함 |
| HashRouter와 역할별 지연 로딩 | 정적 호스팅에서도 해시 경로로 진입, 필요한 화면 코드부터 로딩 | URL에 `#` 사용, 첫 화면 진입 시 모듈 로딩 필요 |
| 대화 ID로 서버 저장 이력 인계 | 재로그인·재상담에도 서버 기록을 일관되게 사용 | 서버에 저장하지 않은 비회원 FAQ나 화면 전용 상태는 인계 이력이 아님 |

브라우저 대역 테스트는 요청과 화면 전이를 검증합니다. 실제 인증·저장·검색 품질·모델 응답을 보장하지는 않습니다. [실제 서버 확인 절차](development.md#브라우저-회귀-테스트)와 [리팩토링 당시 실험](FE_REFACTOR.md)을 구분해 참고하세요.
