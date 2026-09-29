# 채팅 API 연동 작업 정리

관련 이슈: [UBot-FE #21](https://github.com/ureca-UBot/UBot-FE/issues/21)

## 구현 범위

- 로그인한 사용자의 질문 전송과 답변 재시도를 기존 AI 검색 화면에 연결했습니다.
- `POST /chat/questions`는 질문을 보내고 완성된 답변과 생성 결과를 받습니다.
- `POST /chat/questions/retries`는 실패한 질문의 `Idempotency-Key` 헤더로 재시도합니다.
- 생성 중에는 입력과 재시도 버튼을 비활성화하고 연속 클릭의 중복 요청을 막습니다.
- 재시도 가능 여부와 시도 횟수는 서버의 `retryable`, `attemptCount`를 따릅니다. 프론트에 최대 횟수를 고정하지 않습니다.
- 모델이 JSON 문자열을 반환하면 화면에는 `answer` 문장만 표시합니다. 원본 응답의 `status`, `evidence_ids`는 변경하지 않습니다. 일반 문장 응답도 표시할 수 있습니다.
- 기존 시연용 Mock은 시연 메뉴에서 사용하고, 일반 AI 검색 진입은 실제 API를 사용합니다.
- 새 대화와 계정 변경 시 화면 대화를 초기화합니다. 이전 요청의 늦은 응답은 초기화된 화면에 표시하지 않습니다.

## 파일 구성과 기존 코드 변경

| 파일 | 역할 |
| --- | --- |
| `src/user/ai/types/chat.ts` | 백엔드 요청·응답 및 화면 상태 타입 |
| `src/user/ai/api/chatApi.ts` | 공용 `apiClient`를 사용하는 질문·재시도 요청 |
| `src/user/ai/hooks/useChat.ts` | 공용 `useAuth`를 사용하는 채팅 상태와 요청 처리 |
| `src/user/ai/components/ChatInput.tsx` | 질문 입력, Enter 전송, 한글 조합 중 전송 방지 |
| `src/user/ai/components/ChatMessages.tsx` | 답변, 로딩, 오류, 재시도 표시 |
| `src/user/pages/AiPage.tsx` | 기존 화면에 채팅 컴포넌트 연결 |
| `src/user/UserApp.tsx` | 실제 채팅과 시연 메뉴 연결 |
| `src/shared/api/client.ts` | 선택적 POST 헤더와 오류 응답 `data` 전달 추가 |

공용 클라이언트의 기존 호출 인자와 인증·토큰 재발급 흐름을 유지합니다. 관리자 FAQ·매장·금지어 구현, 공용 인증 구현, 기존 `useAiDemo.ts`, 스타일 및 의존성은 변경하지 않습니다.

## 팀원 실행 방법

이미 저장소를 받은 경우 작업 폴더에서 실행합니다. 개인 변경 사항이 있으면 먼저 보관하고 브랜치를 전환하세요.

```bash
git fetch origin
git switch feat/21-chat-api-integration
git pull --ff-only origin feat/21-chat-api-integration
npm ci
npm run dev
```

처음 받는 경우:

```bash
git clone --branch feat/21-chat-api-integration https://github.com/ureca-UBot/UBot-FE.git
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

- [UBot-BE #82](https://github.com/ureca-UBot/UBot-BE/pull/82)의 채팅 API를 포함한 백엔드를 실행합니다. 해당 PR은 `develop`에 병합되어 있습니다.
- 백엔드 DB와 로그인 가능한 계정이 필요합니다. 프론트의 공용 로그인 화면을 사용합니다.
- 검색 가능한 FAQ와 해당 FAQ의 임베딩 벡터가 필요합니다. FAQ 원문만 있고 검색 벡터가 없으면 답변 생성에 도달하지 못할 수 있습니다.
- 백엔드가 연결하는 Ollama에 채팅 모델 `qwen3:14b`와 임베딩 모델 `bge-m3:567m`을 준비합니다. 이미 모델을 제공하는 팀 서버를 사용하면 각자 로컬에 설치할 필요는 없습니다.
- 백엔드의 `OLLAMA_CHAT_MODEL=qwen3:14b`, Ollama 연결 주소, 임베딩 모델 설정을 확인합니다. DB의 벡터는 같은 임베딩 모델로 생성되어야 합니다.
- 백엔드의 `prompts/faq-system.txt`, `prompts/faq-user.txt`가 준비되어 있어야 합니다.

백엔드의 자세한 실행 설정은 [quickstart](https://github.com/ureca-UBot/UBot-BE/blob/develop/docs/quickstart.md)와 [LLM 모듈 안내](https://github.com/ureca-UBot/UBot-BE/blob/develop/docs/how-to/llm-module.md)를 따릅니다. 채팅을 사용하기 위해 프론트에서 Ollama에 직접 연결하거나 LLM 키를 넣을 필요는 없습니다.

## 확인 순서

1. 개발 서버가 안내한 주소에서 로그인하고 AI 검색으로 이동합니다.
2. DB에 등록되고 검색에 반영된 FAQ의 질문을 전송합니다. 로컬에서는 `유심을 재발급받으려면 어떻게 하나요?` FAQ로 실제 Qwen 답변을 확인했습니다. 이 FAQ 데이터는 Git에 포함하지 않습니다.
3. 로딩 후 사용자 화면에 답변 문장만 보이는지 확인합니다. 모델 속도에 따라 응답을 기다려야 합니다.
4. 실패 응답에서는 오류 메시지·시도 횟수를 확인하고, 서버가 `retryable=true`와 멱등키를 반환할 때만 재시도 버튼이 보이는지 확인합니다.
5. 개발자 도구의 Network에서 최초 요청과 재시도 요청, 재시도의 `Idempotency-Key` 헤더를 확인합니다.
6. 새 대화와 로그아웃 시 이전 대화가 화면에 남지 않는지 확인합니다.

코드 검사는 저장소 기본 명령을 사용합니다.

```bash
npm run lint
npm run build
```

## 현재 범위 밖 기능

- 새로고침 후 대화 이력을 불러오는 API·화면은 이번 연동에 포함되지 않습니다. 현재 대화는 화면 상태로 유지하며 새로고침하면 초기화됩니다.
- 인기 질문 수치, 가까운 매장 예시 등 기존 Mock 영역의 실제 API 연결은 이번 작업에 포함되지 않습니다.
- GitHub Pages 배포 화면에서는 Vite 개발 프록시가 실행되지 않습니다. 실제 백엔드를 사용하려면 배포 환경의 API 주소와 CORS 설정이 별도로 필요합니다.

`.env.local`, STS의 `.project`, `node_modules`, `dist`, 개인 테스트 계정과 로컬 DB 데이터는 공유 대상이 아닙니다.
