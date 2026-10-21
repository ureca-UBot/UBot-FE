# 프론트엔드 구조 가이드

## 목표

이 프로젝트는 화면의 URL 구조와 도메인 기능을 분리합니다. 페이지를 찾기 쉽고, 각 도메인에 해당하는 프론트 작업이 다른 도메인의 프론트에 영향을 주지 않도록 도메인별 코드를 독립적으로 둡니다.

## 권장 구조

```text
src/
├─ App.tsx                         # 인증·일반 사용자·관리자 진입 라우트
├─ main.tsx                        # React 시작점
│
├─ admin/
│  ├─ AdminApp.tsx                 # 관리자 도메인 라우트, 대시보드 지연 로딩
│  ├─ layout/                      # 관리자 전체에서 쓰는 틀
│  │  ├─ AdminLayout.tsx
│  │  ├─ AdminHeader.tsx
│  │  └─ AdminSidebar.tsx
│  ├─ pages/                       # URL에 직접 연결되는 관리자 화면
│  │  ├─ dashboard/
│  │  │  └─ DashboardPage.tsx
│  │  ├─ faq/
│  │  │  ├─ FaqLayout.tsx
│  │  │  ├─ FaqListPage.tsx
│  │  │  ├─ DeletedFaqListPage.tsx
│  │  │  └─ FaqCategoryListPage.tsx
│  │  └─ store/                    # 매장 관리가 추가될 위치
│  │     └─ StoreListPage.tsx
│  ├─ faq/                         # FAQ 도메인 기능
│  │  ├─ api/
│  │  ├─ components/
│  │  ├─ context/
│  │  ├─ hooks/
│  │  └─ types/
│  ├─ store/                       # 매장 도메인 기능
│  │  ├─ api/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  └─ types/
│  └─ routes/                      # 관리자 접근 권한 검사
│
├─ auth/                           # 전체 서비스의 로그인/로그아웃/토큰
├─ user/                           # 일반 사용자 화면과 기능
└─ shared/                         # 관리자와 일반 사용자가 함께 쓰는 최소 단위
   ├─ api/
   └─ types/
```

## 폴더별 역할

### `pages`

라우터가 직접 렌더링하는 화면을 둡니다. URL을 보고 해당 파일을 바로 찾을 수 있어야 합니다.

- `/admin/faqs` → `admin/pages/faq/FaqListPage.tsx`
- `/admin/faqs/categories` → `admin/pages/faq/FaqCategoryListPage.tsx`
- `/admin/stores` → `admin/pages/store/StoreListPage.tsx`

페이지는 화면 조립과 URL·탭·페이지 번호 상태를 담당합니다. API 요청 세부 구현이나 복잡한 표 UI는 도메인 폴더에 둡니다.

### 도메인 폴더: `admin/faq`, `admin/store`

특정 업무에만 필요한 코드를 둡니다.

- `api`: 해당 도메인의 HTTP 요청 함수
- `components`: 표, 검색 폼, 생성·수정·삭제 모달
- `hooks`: 도메인 상태의 소유권, 조회·변경 요청, 요청 취소와 생명주기
- `context`: 여러 FAQ 화면이 함께 쓰는 상태
- `types`: 요청과 응답 타입

예를 들어 FAQ 전용 페이지네이션이나 삭제 모달은 `admin/faq/components`에 둡니다. 매장 관리에서 비슷한 UI가 필요해도 우선 `admin/store/components`에 별도로 만듭니다.

### `layout`

관리자 전체에 공통으로 유지되는 프레임입니다.

- 사이드바
- 헤더
- 로그인 사용자 정보
- 로그아웃 버튼

레이아웃은 도메인 업무 로직을 알지 않아야 합니다. 예를 들어 사이드바는 FAQ 메뉴가 있다는 것만 알고, FAQ 검색 조건이나 생성 모달 상태는 알지 않습니다.

### `shared`

정말 여러 영역에서 공통으로 써야 하는 작은 기반 코드만 둡니다.

- 공용 HTTP 클라이언트
- 서버 공통 응답 타입
- 관리자와 일반 사용자가 모두 쓰는 인증 토큰 처리
- 상품·예약·문의처럼 양쪽 화면에서 사용하는 서버 계약과 표시 함수
- 마크업이나 스타일을 강제하지 않는 모달 키보드 포커스 처리

표, 검색 UI, 모달, 페이지네이션처럼 요구사항이 변하기 쉬운 UI는 성급하게 `shared`로 옮기지 않습니다.

## 공용화 원칙

이 프로젝트에서는 도메인 간 코드 중복을 허용합니다.

FAQ와 매장 관리에 같은 모양의 표나 페이지네이션이 있더라도, 처음에는 각 도메인이 자기 컴포넌트를 가집니다. 한 도메인의 요구사항을 바꿨을 때 다른 도메인 화면이 깨지는 것을 막기 위해서입니다.



## 새 관리자 도메인 추가 예시: 매장 관리

```text
src/admin/
├─ pages/store/
│  ├─ StoreListPage.tsx
│  └─ StoreDetailPage.tsx
└─ store/
   ├─ api/storeApi.ts
   ├─ components/
   │  ├─ StoreTable.tsx
   │  ├─ StoreSearchForm.tsx
   │  └─ StoreEditModal.tsx
   ├─ hooks/
   └─ types/store.ts
```

추가 순서는 다음과 같습니다.

1. `admin/store/types`에 백엔드 DTO와 맞춘 타입을 작성합니다.
2. `admin/store/api`에 API 요청 함수를 작성합니다.
3. `admin/store/components`에 매장 전용 UI를 만듭니다.
4. `admin/pages/store`에 라우트와 연결되는 화면을 만듭니다.
5. `admin/AdminApp.tsx`에 라우트를, `AdminSidebar.tsx`에 메뉴를 추가합니다.

## 상태와 렌더링 경계

- `UserApp`은 화면 조립을 담당하고 `useUserExperience`는 기존 화면 이동·다이얼로그·데모 동작을 담당합니다.
- 사용자 페이지의 기준 상태는 React Router의 `location.pathname`입니다. 별도의 URL 상태나 `pushState`를 추가하지 않습니다.
- `VisitedPage`는 방문하지 않은 화면의 요청과 Effect를 실행하지 않습니다. 방문한 화면은 유지하여 검색·필터·지도 상태를 보존합니다.
- 실제 채팅 결과는 `ConnectedAiPage`에서 구독합니다. 질문 전송만 필요한 상위 화면은 `useSendQuestion`을 사용합니다.
- 대시보드는 화면 섹션과 차트를 분리하고 조회 범위·FAQ 상세·개선 대상의 상태를 각각 `useFaqMonitoring`, `useFaqDetail`, `useFaqImprovements`에서 관리합니다.
- 관리자와 사용자 코드가 서로의 도메인 API를 가져오지 않습니다. 공통 서버 계약은 `shared`로 옮기고 API 호출은 각 도메인에 둡니다.

## 스타일과 검증

- `user/styles/user.css`와 `App.css`는 기존 선언 순서대로 분할 파일을 가져옵니다. 순서 변경은 CSS 우선순위에 영향을 주므로 별도 검토합니다.
- `npm run format:check`, `npm run lint`, `npm test`, `npm run build`를 기본 검증으로 사용합니다.
- `npm run test:browser`는 API 응답을 고정한 브라우저 기능 테스트입니다.
- `npm run test:visual`은 리팩토링 기준 develop과 같은 브라우저·데이터·시각·뷰포트로 비교합니다.
- 실행 환경과 검증 한계는 [리팩토링 기록](FE_REFACTOR.md)에 정리합니다.

