# 개발과 검증

[전체 기능](README.md) · [코드 구조](FRONTEND_STRUCTURE_GUIDE.md) · [AWS 배포](AWS_DEPLOY.md)

## 실행 준비

Node.js 22와 npm을 사용합니다. `develop`을 받은 뒤 `npm ci`로 lockfile에 맞게 설치합니다. 개인 변경이 있는 작업 폴더에서는 먼저 변경 내용을 확인하고, 브랜치를 무작정 초기화하지 않습니다.

```bash
git clone --branch develop https://github.com/ureca-UBot/UBot-FE.git
cd UBot-FE
npm ci
npm run dev
```

Vite가 출력한 로컬 주소를 엽니다. 기본 포트는 5173이며 사용 중이면 다른 포트를 안내합니다. `/#/ai`에서 질문 화면, `/#/store`에서 상품, `/#/stores`에서 매장 화면을 확인할 수 있습니다.

## 환경변수와 API 경로

루트의 [.env.example](../.env.example)을 `.env.local`로 복사해 필요한 값만 설정합니다. 변경 후 개발 서버를 다시 실행합니다.

| 변수 | 사용처와 기본 동작 |
|---|---|
| `VITE_API_BASE_URL` | 비우면 현재 origin의 `/api`를 호출합니다. 다른 API 서버를 쓰면 origin을 지정하고 `/api`를 중복해서 붙이지 않습니다. |
| `VITE_API_PROXY_TARGET` | 로컬 프록시 대상. 기본 `http://localhost:8080`; Vite가 `/api` 접두사를 제거해 전달합니다. |
| `VITE_KAKAO_JAVASCRIPT_KEY` | 지도 브라우저 SDK 키. Kakao에 로컬·배포 origin을 등록해야 합니다. 서버 REST 키와 다릅니다. |
| `VITE_CHAT_MOCK` | 개발 서버에서 `true`일 때만 채팅 고정 응답을 사용합니다. 인증·상품·예약 등 전체 API를 대체하지 않습니다. |
| `VITE_COUNSEL_ENABLED` | `false`면 상담을 끕니다. GitHub Pages에서는 API origin이 비어 있어도 상담을 끕니다. |

`VITE_` 변수는 브라우저 번들에 들어갑니다. 서버 비밀값이나 모델 API 키는 FE 설정에 넣지 않습니다. 실제 채팅은 실행 중인 BE와 검색 데이터·모델 연결이 필요하며, 준비 방법은 [BE 실행 안내](https://github.com/ureca-UBot/UBot-BE/blob/develop/docs/quickstart.md)를 따릅니다.

## 빌드와 기본 검사

| 명령 | 기대 결과 |
|---|---|
| `npm run lint` | ESLint 오류 없이 종료 |
| `npm run format:check` | TS·TSX·테스트 파일이 저장소 Prettier 규칙과 일치 |
| `npm test` | API 계약·상태 전이·표시 계산 등 테스트 통과 |
| `npm run build` | TypeScript 검사 후 `dist/` 생성. 기본 경로는 `/UBot-FE/` |
| `npm run build -- --base /` | 루트 도메인용 정적 파일 생성 |
| `npm run preview` | 빌드한 정적 파일 미리보기. 개발 프록시나 BE를 실행하지는 않음 |

Windows Git 설정이 파일을 CRLF로 체크아웃했다면 포맷 검사에서 줄바꿈 차이가 나올 수 있습니다. 코드 전체를 다시 포맷하기 전에 Git의 줄바꿈 설정과 저장소 파일의 LF를 확인합니다. CI는 Linux 체크아웃에서 검사합니다.

## 브라우저 회귀 테스트

```bash
npx playwright install chromium
npm run test:counsel:handoff
npm run test:counsel:waiting
npm run test:browser
```

각 테스트가 로컬 Vite와 브라우저를 실행하고 API 응답을 대역으로 제공합니다. 서버 주소를 따로 준비하지 않아도 요청 계약·화면 전환·오류·재시도·모바일 배치를 확인할 수 있습니다. 실패하면 출력된 테스트 이름과 locator, 해당 테스트의 응답 fixture를 함께 확인합니다.

| 범위 | 실행 명령 |
|---|---|
| 자동 인계·종료 후 AI/FAQ·새로고침·재로그인·재시도 | `npm run test:counsel:handoff` |
| 상담 대기 중 다른 대화·모바일·취소 | `npm run test:counsel:waiting` |
| 고객·상담사 전송과 종료·재배정 | `npm run test:counsel` |
| 상담 통합 이력과 페이지 조회 | `npm run test:counsel:history` |
| 상담 안전성 관리 화면·Pages 설정 | `npm run test:counsel:admin`, `npm run test:counsel:pages` |
| 홈의 상담사 화면 버튼과 권한별 표시 | `node --test --test-name-pattern="상담사만 사용자 화면" scripts/telemap.test.cjs` |
| 채팅 재시도·취소 | `npm run test:chat` |
| 답변 의견 | `npm run test:feedback` |
| 넓은 기능 회귀 | `npm run test:browser` |
| 리팩토링 기준과 화면 비교 | `npm run test:visual` |

설치된 Edge를 쓰는 PowerShell 환경에서는 먼저 `$env:PLAYWRIGHT_CHANNEL='msedge'`를 설정합니다. 시각 비교는 [리팩토링 기록](FE_REFACTOR.md)에 적힌 고정 기준을 사용하므로 기준 커밋 이력이 필요합니다. 당시 번들 크기와 픽셀 비교 결과는 현재 빌드의 측정값이 아닙니다.

실제 서버 연결은 별도로 확인합니다. 사용자·상담사 두 계정으로 로그인해 AI 질문과 FAQ 선택, 상담 요청, 상담사 이력 확인, 종료 후 추가 질문, 새로고침·재로그인·재상담을 순서대로 확인합니다. 브라우저 대역 테스트는 실제 인증·DB·모델 결과를 검증한 것으로 해석하지 않습니다.

## 실행 중 문제가 생기면

| 증상 | 먼저 확인할 항목 | 정상 동작 확인 |
|---|---|---|
| 첫 화면은 열리지만 API 요청 실패 | Network의 요청 주소, BE 실행 여부, `VITE_API_PROXY_TARGET`. `/api/api` 중복 여부 | `/api` 요청이 BE의 JSON 응답을 반환 |
| Pages에서 상담 버튼이 없음 | 빌드 시 `VITE_API_BASE_URL`, `VITE_COUNSEL_ENABLED`, BE의 CORS 허용 origin | API가 연결된 빌드에서 회원 상담 호출 표시 |
| 지도만 비어 있음 | 브라우저 SDK 키, Kakao에 등록한 origin, Console의 SDK 로딩 오류 | 지도 타일과 매장 표시. 브라우저 키와 서버 REST 키를 혼동하지 않음 |
| 로그인했는데 상담사 버튼이 없음 | 계정 역할이 `COUNSELOR`인지 확인. 서버에서 역할을 바꿨다면 재로그인 | 홈 헤더의 상담사 버튼과 `/#/counselor` 진입 |
| 상담 전송 결과가 불명확함 | **전송 결과 확인**으로 기존 메시지 ID의 결과 조회 | 서버의 허용·차단·검사 실패 상태 확인 후 다음 전송 |
| 질문 결과 조회가 계속 실패함 | 요청 상태·서버 오류 코드, BE의 해당 작업 상태 | 단순 화면 조회 종료와 서버 작업 취소를 구분. [오류 처리 기준](internals.md#질문의-상태-전이) 참고 |

## CI와 배포

`Frontend CI`는 `develop`·`main`의 push/PR에서 기본 검사와 상담 smoke 4개를 실행합니다. `Frontend Browser Regression`은 수동 실행으로 전체 브라우저·시각 비교를 수행합니다. 자동 인계·대기 테스트는 `test:browser`에 포함됩니다.

AWS CD와 Pages 배포는 `develop`을 사용합니다. AWS는 서버 배포 변수가 켜져 있어야 배포하며, 정적 파일과 자산 확인에 성공한 사실이 모든 업무 API·실제 모델까지 검증됐다는 뜻은 아닙니다. 상세 절차와 복구는 [AWS 배포](AWS_DEPLOY.md)를 참고하세요.
