# 채팅 API 연동 작업 정리

[현재 기능 흐름](features/chat-and-history.md) · [개발과 검증](development.md)

관련 이슈: [UBot-FE #21](https://github.com/ureca-UBot/UBot-FE/issues/21)

## 구현 범위

- 회원과 비회원의 질문 전송을 기존 AI 검색 화면에 연결했습니다. 의도 재검색·상담·본인 정보는 로그인 권한을 따릅니다.
- `POST /chat/questions`는 질문을 접수하고 `202`와 `jobId`를 받습니다. 답변은 `GET /chat/jobs/{jobId}`를 1.5초 간격으로 조회해 받습니다(`src/user/ai/api/chatJobPolling.ts`).
- `POST /chat/questions/retries`는 실패한 질문의 `Idempotency-Key` 헤더로 재시도합니다. 응답은 새 `jobId`이며 같은 방식으로 조회합니다.
- 조회 중에는 서버의 처리 단계(`phase`)를 안내 문구로 보여 줍니다. 429·5xx·네트워크 오류는 지수 백오프로 다시 조회하고, 새 대화·로그아웃 시 조회를 멈춥니다(서버 작업은 계속됨).
- 작업 실패(`FAILED`)는 기존 실패 응답과 같은 모양(`ApiRequestError`의 `code`·`data`)으로 바꿔 화면의 오류·재시도 처리를 그대로 씁니다.
- 생성 중에는 입력과 재시도 버튼을 비활성화하고 연속 클릭의 중복 요청을 막습니다.
- 서버의 `retryable`, `attemptCount`와 FE의 최대 3회 제한을 확인해 재시도 가능한 최종 실패를 자동으로 다시 요청합니다. 생성 중 중단은 작업 취소 API를 호출합니다.
- 모델이 JSON 문자열을 반환하면 화면에는 `answer` 문장만 표시합니다. 원본 응답의 `status`, `evidence_ids`는 변경하지 않습니다. 일반 문장 응답도 표시할 수 있습니다.
- 일반 AI 채팅은 실제 API를 사용합니다. 개발 서버에서 `VITE_CHAT_MOCK=true`일 때만 채팅 API 대역을 사용할 수 있습니다.
- 새 대화와 계정 변경 시 화면 대화를 초기화합니다. 이전 요청의 늦은 응답은 초기화된 화면에 표시하지 않습니다.

## 파일 구성과 기존 코드 변경

| 파일 | 역할 |
| --- | --- |
| `src/user/ai/types/chat.ts` | 백엔드 요청·응답 및 화면 상태 타입 |
| `src/user/ai/api/chatApi.ts` | 공용 `apiClient`를 사용하는 질문·재시도 요청 |
| `src/user/ai/api/chatJobPolling.ts` | 접수된 답변 작업의 상태 조회, 진행 단계 전달, 최종 결과 변환 |
| `src/user/ai/context/ChatProvider.tsx` | 채팅 상태·요청·재시도·중단·FAQ 선택 저장 |
| `src/user/ai/hooks/useChat.ts` | 채팅 context 구독 |
| `src/user/ai/components/ChatInput.tsx` | 질문 입력, Enter 전송, 한글 조합 중 전송 방지 |
| `src/user/ai/components/ChatMessages.tsx` | 답변, 로딩, 오류, 재시도 표시 |
| `src/user/pages/AiPage.tsx` | 기존 화면에 채팅 컴포넌트 연결 |
| `src/user/UserApp.tsx` | 사용자 화면 조합과 채팅 연결 |
| `src/shared/api/client.ts` | 선택적 POST 헤더와 오류 응답 `data` 전달 추가 |

공용 클라이언트가 인증·토큰 재발급과 공통 오류를 처리하고, 채팅 API가 질문 접수와 결과 조회를 조합합니다. 상태 전이와 실패 처리 기준은 [내부 동작과 연동 계약](internals.md)에 정리했습니다.

## 팀원 실행 방법

이미 저장소를 받은 경우 작업 폴더에서 실행합니다. 개인 변경 사항이 있으면 먼저 보관하고 브랜치를 전환하세요.

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
npm ci
npm run dev
```

처음 받는 경우:

```bash
git clone --branch develop https://github.com/ureca-UBot/UBot-FE.git
cd UBot-FE
npm ci
npm run dev
```

Node.js 요구 버전은 루트 README를 따릅니다. 로컬 API 설정이 필요한 경우 프로젝트 루트의 `.env.local`에 아래 값을 사용합니다.

```dotenv
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://localhost:8080
```

위 값은 현재 기본 설정과 같습니다. 프론트는 `/api/chat/questions`와 `/api/chat/questions/retries`를 호출하고, 개발 프록시가 `/api`를 제거해 백엔드로 전달합니다. `VITE_API_BASE_URL`에 `/api`를 다시 넣으면 경로가 중복될 수 있습니다. 환경변수를 변경했다면 개발 서버를 다시 실행하세요.

## 실제 답변 테스트에 필요한 백엔드

프론트 코드에는 DB 데이터, 모델 파일, 비밀번호, 로컬 실행 설정이 포함되지 않습니다. 프론트만 다운로드하면 모델 답변까지 자동으로 준비되는 것은 아닙니다.

- 현재 `develop`의 질문 접수·작업 조회·취소·의도 재검색 계약을 제공하는 백엔드를 실행합니다.
- 백엔드 DB가 필요하고, 회원 기능을 확인할 때는 공용 로그인 화면에서 계정으로 로그인합니다.
- 검색 가능한 FAQ와 해당 FAQ의 임베딩 벡터가 필요합니다. FAQ 원문만 있고 검색 벡터가 없으면 답변 생성에 도달하지 못할 수 있습니다.
- 모델·임베딩 서버 주소와 실행 방식은 BE 설정을 따릅니다. 이미 모델을 제공하는 서버를 사용하면 각자 로컬에 모델을 설치할 필요는 없습니다. DB 벡터와 검색 임베딩의 프로필은 일치해야 합니다.

백엔드의 자세한 실행 설정은 [quickstart](https://github.com/ureca-UBot/UBot-BE/blob/develop/docs/quickstart.md)와 [LLM 모듈 안내](https://github.com/ureca-UBot/UBot-BE/blob/develop/docs/how-to/llm-module.md)를 따릅니다. 채팅을 사용하기 위해 프론트에서 Ollama에 직접 연결하거나 LLM 키를 넣을 필요는 없습니다.

## 확인 순서

1. 개발 서버가 안내한 주소에서 로그인하고 AI 검색으로 이동합니다.
2. DB에 등록되고 검색에 반영된 FAQ의 질문을 전송합니다. 초기 연동 당시에는 로컬의 `유심을 재발급받으려면 어떻게 하나요?` FAQ로 실제 Qwen 답변을 확인했습니다. 이 FAQ 데이터는 Git에 포함하지 않으며 현재 환경에서도 같은 결과가 나오는지는 별도로 확인합니다.
3. 로딩 후 사용자 화면에 답변 문장만 보이는지 확인합니다. 모델 속도에 따라 응답을 기다려야 합니다.
4. 재시도 가능한 최종 실패에서 자동 재시도와 시도 횟수를 확인합니다. 중단하면 작업 취소 요청이 나가고 늦은 응답이 화면을 덮지 않는지 확인합니다.
5. 개발자 도구의 Network에서 최초 요청과 재시도 요청, 재시도의 `Idempotency-Key` 헤더를 확인합니다.
6. 새 대화와 로그아웃 시 이전 대화가 화면에 남지 않는지 확인합니다.

코드 검사는 저장소 기본 명령을 사용합니다.

```bash
npm run lint
npm run build
```

## 대화 복원과 배포

- 회원의 대화는 최근 목록에서 다시 열 수 있습니다. 질문·답변을 복원하며 모든 응답 카드와 의도별 재검색 상태까지 복원하지는 않습니다.
- 인기·급상승·지역 FAQ, 매장 지도, 상품·가입 정보 카드를 실제 API와 연결합니다. 상세 범위는 [기능 문서](features/chat-and-history.md)를 참고하세요.
- GitHub Pages 배포 화면에서는 Vite 개발 프록시가 실행되지 않습니다. 실제 백엔드를 사용하려면 배포 환경의 API 주소와 CORS 설정이 별도로 필요합니다.

`.env.local`, STS의 `.project`, `node_modules`, `dist`, 개인 테스트 계정과 로컬 DB 데이터는 공유 대상이 아닙니다.
