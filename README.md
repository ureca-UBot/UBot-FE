# UBot-FE

UBot 프론트엔드입니다. React 19 · TypeScript · Vite 8 로 만들었습니다.

## 필요한 것

| 도구 | 버전 | 확인 명령 |
|---|---|---|
| Node.js | 20.19+ 또는 22.12+ (Vite 8 요구) | `node -v` |
| npm | Node.js 에 포함 | `npm -v` |

## 처음 실행하기

```bash
git clone https://github.com/ureca-final-project-temp/UBot-FE.git
cd UBot-FE
npm ci
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다. 파일을 저장하면 화면이 바로 갱신됩니다.

> 5173 포트가 이미 사용 중이면 Vite 가 5174, 5175 … 로 자동으로 옮겨 뜹니다. 터미널에 찍힌 주소를 확인하세요.
> 포트를 직접 정하려면 `npm run dev -- --port 5174` 처럼 실행합니다.

## 명령어

| 명령 | 하는 일 |
|---|---|
| `npm ci` | `package-lock.json` 에 적힌 버전 그대로 설치합니다. `node_modules` 를 지우고 새로 받습니다 |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 타입 검사(`tsc -b`) 후 `dist/` 에 배포용 파일 생성 |
| `npm run preview` | 빌드 결과(`dist/`)를 로컬에서 띄워 확인 |
| `npm run lint` | ESLint 로 코드 검사 |

**PR 을 올리기 전에 `npm run build` 와 `npm run lint` 가 통과하는지 확인하세요.** `npm run dev` 는 타입 오류가 있어도 화면이 뜨기 때문에, 타입 오류는 `build` 에서만 잡힙니다.

## 패키지 설치 규칙

- **클론 직후 / 다른 사람이 패키지를 바꾼 뒤 pull 했을 때** → `npm ci`
- **패키지를 추가·삭제·버전 변경할 때** → `npm install <패키지>` (또는 `npm uninstall <패키지>`)

패키지를 바꿨다면 `package.json` 과 `package-lock.json` 을 **반드시 함께 커밋**합니다. lock 파일이 빠지면 다른 사람의 `npm ci` 가 `not in sync` 오류로 실패합니다.

## 폴더 구조

```
UBot-FE/
├── public/              그대로 복사되는 정적 파일 (favicon 등)
├── src/
│   ├── assets/          코드에서 import 하는 이미지
│   ├── App.tsx          최상위 컴포넌트
│   ├── main.tsx         시작점 (React 를 index.html 에 붙임)
│   └── index.css        전역 스타일
├── index.html
├── vite.config.ts       Vite 설정
├── tsconfig.app.json    src/ 용 TypeScript 설정
├── tsconfig.node.json   vite.config.ts 용 TypeScript 설정
└── eslint.config.js     린트 규칙
```

## 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| `npm ci` 가 `package.json and package-lock.json are not in sync` 로 실패 | 누군가 lock 파일을 빼고 커밋함. `npm install` 후 lock 파일을 커밋 |
| `npm ci` 가 lock 파일이 없다고 실패 | `package-lock.json` 이 없음. `npm install` 로 생성 후 커밋 |
| 실행 시 Node 버전 오류 | `node -v` 확인 후 22.12 이상으로 업데이트 |
| `npm ci` 가 `EPERM` 으로 실패 (Windows) | 개발 서버나 에디터가 `node_modules` 를 잡고 있음. 서버를 끄고 다시 실행 |

## 기여 규칙

PR 제목은 `[Type] 한글 설명` 형식이어야 합니다. GitHub Actions 가 검사합니다.

- Type: `Feat` `Fix` `Refactor` `Docs` `Test` `Chore` `Style`
- 예시: `[Feat] 채팅 화면 구현`
