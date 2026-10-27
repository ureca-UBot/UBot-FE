# 관리자 FAQ 작업 정리

## 작업 목적

관리자가 FAQ와 FAQ 카테고리를 관리할 수 있는 화면을 만들고, 일반 사용자와 관리자가 같은 로그인 체계를 공유하도록 구성했습니다.

## 구현한 화면과 기능

### 인증

- `/auth/login`: 일반 사용자와 관리자 공용 로그인 페이지
- `/auth/signup`: 일반 사용자 회원가입 페이지
- 로그인한 사용자의 역할이 `ROLE_ADMIN`이면 관리자 대시보드로 이동
- 일반 사용자와 관리자 화면에서 같은 토큰 저장소와 로그아웃 기능을 사용
- 관리자 화면은 `RequireAdmin`에서 관리자 권한을 확인

관련 위치:

```text
src/auth/
src/user/auth/pages/UserSignupPage.tsx
src/admin/routes/RequireAdmin.tsx
```

### 관리자 공통 화면

- 관리자용 사이드바, 헤더, 로그아웃 버튼
- FAQ 관리로 이동하는 단일 사이드바 메뉴
- FAQ 내부에서 전체 FAQ, 삭제 FAQ, 카테고리 관리 탭으로 분기

관련 위치:

```text
src/admin/layout/
src/admin/pages/faq/FaqLayout.tsx
```

### 전체 FAQ 관리

- 카테고리 선택, 키워드 입력, 검색, 초기화
- 페이지네이션
  - 한 묶음에 최대 10개 페이지 번호 표시
  - `이전`, `다음`은 페이지 이동이 아니라 페이지 번호 묶음을 이동
- FAQ 생성 모달
- FAQ 수정 모달
  - 카테고리, 질문, 답변 라벨 제공
  - 질문 변경으로 임베딩 처리 시간이 길어질 수 있어 `수정 중...` 상태 표시
- FAQ 삭제 확인 모달
- FAQ 상세 정보와 FAQ 로그 조회 모달

관련 위치:

```text
src/admin/pages/faq/FaqListPage.tsx
src/admin/pages/faq/FaqDetailPage.tsx
src/admin/faq/components/
```

### 삭제 FAQ 조회

- 삭제된 FAQ 목록 조회
- 페이지네이션 적용

관련 위치:

```text
src/admin/pages/faq/DeletedFaqListPage.tsx
```

### FAQ 카테고리 관리

- 카테고리 이름 키워드 검색과 초기화
- 카테고리 목록 페이지네이션
- 카테고리 생성, 수정, 삭제 모달
- 수정·삭제 버튼은 전체 FAQ 목록과 같은 디자인 사용
- 카테고리 삭제 실패 시 백엔드 오류 메시지 표시
- 사용 중인 카테고리(`FAQ-006`) 삭제 시 해당 카테고리의 FAQ 목록 모달 표시
  - 목록: `ID | 질문 | 답변 | 수정일 | 삭제`
  - 목록 페이지네이션
  - 각 FAQ를 개별 삭제할 수 있는 확인 모달

관련 위치:

```text
src/admin/pages/faq/FaqCategoryListPage.tsx
src/admin/faq/components/FaqCategoryInUseModal.tsx
```

### API 및 오류 처리

- FAQ 관련 API를 `adminFaqApi`로 모음
- 공용 API 클라이언트에서 Bearer 토큰을 자동으로 포함
- API 실패 시 `ApiRequestError`에 HTTP 상태, 백엔드 오류 코드, 메시지를 보관
- 카테고리 사용 중 오류는 백엔드 실제 코드 `FAQ-006`으로 판별

관련 위치:

```text
src/admin/faq/api/faqApi.ts
src/shared/api/client.ts
src/shared/types/api.ts
```

## 카테고리 삭제 규칙

- FAQ와 카테고리 삭제는 논리 삭제 방식입니다.
- 현재 카테고리는 해당 카테고리를 사용하는 FAQ가 활성화된 FAQ, 삭제된 FAQ 모두 없어야만 삭제가 가능합니다.
- 아직 삭제FAQ에 대한 복구 정책이 정해지지 않은 상태이므로, 일단 냅뒀습니다.
- 추후 해당 카테고리를 사용하는 FAQ들의 영구 삭제 API를 사용할까 생각중이긴 합니다. 


