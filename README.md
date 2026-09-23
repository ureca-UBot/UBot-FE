# UBot-FE

UBot 프론트엔드입니다. React 19 · TypeScript · Vite 8 로 만들었습니다.

## 진행 현황

### 관리자 페이지

#### 대시보드

- [x] 관리자 공통 레이아웃 및 권한 보호 라우트
- [x] 관리자 대시보드 화면

#### FAQ 관리

- [x] FAQ 목록 조회, 검색, 페이지네이션
- [x] FAQ 상세 조회 및 이력 조회
- [x] FAQ 생성, 수정, 논리 삭제
- [x] 삭제 FAQ 목록 조회
- [x] FAQ 카테고리 검색, 생성, 수정, 삭제
- [x] 사용 중인 카테고리 삭제 예외 처리
- [ ] 삭제 FAQ 복구 정책 및 기능

#### 매장 관리

- [ ] 매장 목록 및 상세 관리 화면
- [ ] 매장 등록, 수정, 삭제 기능

### 일반 사용자 페이지

#### 홈

- [x] 메인 히어로·캐러셀 및 서비스 진입 화면
- [x] 데스크톱 헤더, 모바일 헤더·하단 내비게이션

#### 스토어·상품

- [x] 휴대폰, 요금제, 인터넷/IPTV 탭 UI
- [x] 휴대폰 상품 목록 및 상품 상세 화면
- [x] 온라인 주문·매장 상담 진입 UI

#### 결합상품

- [x] AI 검색 흐름에서 결합상품 추천 시나리오
- [x] 결합상품 변경 안내 모달(Mock)
- [ ] 결합상품 전용 조회·가입 페이지 및 실제 API 연동

#### AI 검색·채팅

- [x] AI 검색 화면 및 대화 인터페이스
- [x] 인기 질문, 새 대화, 문맥 표시 UI
- [x] 로그인 상태별 대화 세션 UI
- [x] 시연용 AI 응답 및 오류 재시도 흐름(Mock)
- [ ] 실제 AI 답변 API 연동

#### 매장 찾기

- [x] 주소·매장명 및 지역·서비스 조건 검색
- [x] 현재 위치·지도 영역 기반 매장 검색
- [x] 매장 목록, 페이지네이션, Kakao 지도 SDK 연동
- [x] 방문 예약 UI(Mock)

#### MY·혜택·고객지원

- [x] MY, 혜택, 고객지원 화면 UI
- [x] 통신 불편 제보 UI(Mock)
- [ ] 개인화 조회 및 고객지원 API 연동

### 공통 기능

- [x] 로그인·회원가입과 토큰 기반 인증 흐름
- [x] 사용자·관리자 공용 인증 상태 및 로그아웃
- [x] 공용 API 클라이언트와 API 오류 처리

## 시작하기

### 요구 사항

| 도구 | 버전 | 확인 명령 |
| --- | --- | --- |
| Node.js | 20.19+ 또는 22.12+ | `node -v` |
| npm | Node.js 포함 | `npm -v` |

### 설치 및 실행

```bash
git clone https://github.com/ureca-final-project-temp/UBot-FE.git
cd UBot-FE
npm ci
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다. 해당 포트가 사용 중이면 Vite가 다음 사용 가능한 포트를 안내합니다.

로컬 백엔드 프록시 대상은 기본적으로 `http://localhost:8080`입니다. 필요하면 `.env`에 아래 값을 설정합니다.

```bash
VITE_API_PROXY_TARGET=http://localhost:8080
```

### 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm ci` | `package-lock.json` 기준으로 의존성을 설치합니다. |
| `npm run dev` | 개발 서버를 실행합니다. |
| `npm run build` | TypeScript 타입 검사 후 배포용 파일을 `dist/`에 생성합니다. |
| `npm run preview` | 빌드 결과를 로컬에서 미리 봅니다. |
| `npm run lint` | ESLint로 코드를 검사합니다. |

PR을 열기 전에는 `npm run lint`와 `npm run build`를 실행해 확인합니다.

## 폴더 구조

현재는 관리자와 일반 사용자 코드를 분리하고, 기능별 코드는 해당 도메인 안에 둡니다.

```text
UBot-FE/
├── public/                         # 그대로 제공할 정적 파일
├── docs/                           # 작업 정리 등 프로젝트 문서
├── src/
│   ├── admin/                      # 관리자 영역
│   │   ├── faq/                    # FAQ 도메인 기능
│   │   │   ├── api/                # FAQ API 요청 함수
│   │   │   ├── components/         # FAQ 전용 UI와 모달
│   │   │   ├── context/            # FAQ 화면 간 공유 상태
│   │   │   ├── hooks/              # FAQ 전용 훅
│   │   │   └── types/              # FAQ 타입
│   │   ├── layout/                 # 관리자 공통 헤더·사이드바·레이아웃
│   │   ├── pages/                  # URL에 직접 연결되는 관리자 페이지
│   │   │   ├── dashboard/
│   │   │   └── faq/
│   │   └── routes/                 # 관리자 권한 검증 라우트
│   ├── auth/                       # 사용자·관리자 공용 인증
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
│   ├── shared/                     # 여러 영역에서 쓰는 최소 공용 코드
│   │   ├── api/
│   │   └── types/
│   ├── user/                       # 일반 사용자 영역
│   │   ├── ai/                     # AI 검색 기능
│   │   ├── assets/                 # 사용자 영역 이미지 자산
│   │   ├── auth/                   # 사용자 회원가입 화면
│   │   ├── components/             # 사용자 전용 공통 UI
│   │   ├── hooks/
│   │   ├── layout/                 # 데스크톱·모바일 공통 레이아웃
│   │   ├── pages/                  # 일반 사용자 화면
│   │   ├── store-locator/          # 매장 찾기 API·Kakao 지도 SDK·타입
│   │   ├── styles/
│   │   ├── routes.ts               # 사용자 URL과 화면 매핑
│   │   └── UserApp.tsx             # 일반 사용자 앱 진입점
│   ├── App.tsx                     # 전체 라우팅과 앱 조합
│   ├── main.tsx                    # React 진입점
│   └── index.css                   # 전역 스타일
├── vite.config.ts                  # Vite 및 개발 프록시 설정
├── eslint.config.js                # ESLint 설정
└── package.json
```

## 프론트엔드 작성 규칙

### 1. 페이지와 도메인 코드를 분리합니다

`pages`에는 URL에 직접 연결되는 화면만 둡니다. 페이지는 화면 조합, 라우트 파라미터, 페이지 단위 상태를 담당합니다. API 요청, 복잡한 UI, 도메인 타입은 페이지에 쌓지 않고 도메인 폴더로 분리합니다.

예를 들어 `/admin/faqs` 화면은 `src/admin/pages/faq/FaqListPage.tsx`에 두고, FAQ API·모달·타입은 각각 `src/admin/faq/api`, `components`, `types`에 둡니다.

### 2. 새 기능은 도메인 폴더에서 시작합니다

특정 업무에서만 쓰는 코드는 해당 도메인 아래에 둡니다.

```text
src/admin/{domain}/
├── api/          # HTTP 요청 함수
├── components/   # 해당 도메인 전용 UI
├── context/      # 여러 화면이 공유하는 상태가 있을 때만 사용
├── hooks/        # 도메인 전용 상태·동작
└── types/        # 요청·응답 및 화면 데이터 타입
```

새 관리자 도메인을 추가할 때는 다음 순서를 권장합니다.

1. `types`에 백엔드 DTO와 화면에서 사용할 타입을 정의합니다.
2. `api`에 요청 함수를 작성합니다.
3. `components`에 도메인 전용 UI를 작성합니다.
4. `pages`에 URL과 연결되는 화면을 작성합니다.
5. `App.tsx`에 라우트를 작성합니다.

### 3. 공용 코드는 꼭 필요한 경우에만 `shared`로 올립니다

`shared`에는 관리자와 일반 사용자 모두에서 사용하는 작은 기반 코드만 둡니다. 현재 공용 API 클라이언트와 API 응답 타입이 여기에 해당합니다.

비슷하게 보이는 테이블, 검색창, 모달이라도 도메인별 요구 사항이 다르면 우선 각 도메인 `components`에 둡니다.

### 4. 레이아웃은 업무 로직을 갖지 않습니다

`admin/layout`과 `user/layout`은 헤더, 사이드바, 하단 내비게이션처럼 화면 전반에서 반복되는 뼈대를 담당합니다. 특정 도메인의 검색 조건, 모달 상태, API 호출 같은 업무 로직은 레이아웃에 넣지 않습니다.

### 5. 인증은 공용 `auth`를 사용합니다

로그인, 토큰 저장·해석, 인증 상태, 로그아웃은 `src/auth`에서 관리합니다. 사용자 또는 관리자 화면에서 인증 기능이 필요하면 별도 구현 대신 `AuthProvider`, `useAuth`, 공용 토큰 유틸리티를 사용합니다. 관리자 전용 화면은 `RequireAdmin` 아래에 라우트를 추가합니다.

### 6. API 호출은 도메인 API 모듈에 작성합니다

HTTP 클라이언트는 `src/shared/api/client.ts`를 사용합니다. 도메인별 요청 함수는 `api` 폴더에 모아 페이지와 컴포넌트가 HTTP 세부 구현을 직접 알지 않도록 합니다. 인증이 필요한 요청은 공용 클라이언트가 Bearer 토큰을 처리합니다.

### 7. 파일 배치 기준

| 대상 | 위치 |
| --- | --- |
| URL에 연결되는 화면 | `{영역}/pages/` |
| 한 도메인에서만 쓰는 UI | `{영역}/{domain}/components/` |
| 영역 전체에서 쓰는 UI 뼈대 | `{영역}/layout/` 또는 `{영역}/components/` |
| 도메인 API 요청 | `{영역}/{domain}/api/` |
| 관리자·사용자 공용 기반 코드 | `shared/` |
| 로그인·토큰·권한 | `auth/` |

## 협업 규칙

- 의존성을 추가·삭제·변경했다면 `package.json`과 `package-lock.json`을 함께 커밋합니다.
- 다른 브랜치 변경을 받았거나 의존성이 달라졌다면 `npm ci`로 다시 설치합니다.
- 프론트는 별도로 PR을 하지 않고, develop에 푸쉬 후 슬랙에 머지 사실을 알립니다.

## 참고 문서
- 본인이 구현한 파트 정리는 AI에게 맡겨 MD파일로 정리할 수 있도록 하면 다른 팀원이 이해하기 쉽습니다.
- [관리자 FAQ 작업 정리](docs/ADMIN_FAQ_WORK_SUMMARY.md)
