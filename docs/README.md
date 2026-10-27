# Frontend 기능 문서

[제품과 전체 기능](../README.md) · [UBot 전체 구성](https://github.com/ureca-UBot/.github/blob/main/docs/architecture/overview.md)

## 기능부터 찾기

| 궁금한 흐름 | 읽을 문서 |
|---|---|
| 질문 접수 → 진행 상태 → 답변·카드 → 재검색·기록 | [AI 채팅과 대화 기록](features/chat-and-history.md) |
| 상품 탐색 → 가입 신청 → MY 조회·변경 | [상품과 내 이용 정보](features/products-and-my.md) |
| 매장 검색 → 길찾기 → 예약 → 관리자 처리 | [매장 찾기와 방문 예약](features/stores-and-reservations.md) |
| 지역 안내 → 문의·답변 → 알림 확인 | [공지·고객센터·알림](features/customer-support.md) |
| 상담 호출 → 자동 이력 인계 → 배정·보호 → 종료·재상담 | [상담사 연결](COUNSEL_WORK_SUMMARY.md) |
| FAQ 관리 → 품질 분석 → 미응답 보완·재검증 | [FAQ와 지식 관리](features/knowledge-management.md) |
| 가드 검사 이력 → 선택 분석·정책 검토 → 지역 문의·서비스 상태 확인 | [운영과 안전 관리](features/operations-and-safety.md) |

## 개발과 운영

| 목적 | 문서 |
|---|---|
| 설치, 환경변수, 로컬·브라우저 테스트 | [개발과 검증](development.md) |
| 상태 전이, 중복·늦은 응답 처리, API 계약과 오류 대응 | [내부 동작과 연동 계약](internals.md) |
| 컴포넌트·상태·라우트·공용 코드 배치 | [프론트엔드 구조](FRONTEND_STRUCTURE_GUIDE.md) |
| 질문 접수·작업 조회·재시도 API 계약 | [채팅 API 연동](CHAT_API_WORK_SUMMARY.md) |
| 안전 정책 검토의 요약·사례 페이지·승인 계약 | [AI 금칙어·위험 문장 검토](GUARD_REVIEW_WORK_SUMMARY.md) |
| AWS 빌드·배포·복구, GitHub Pages와의 차이 | [AWS 배포](AWS_DEPLOY.md) |

## 구현 당시 기록

[초기 관리자 FAQ 구현](ADMIN_FAQ_WORK_SUMMARY.md), [초기 의도 재검색 구현](RESEARCH_INTENT_WORK_SUMMARY.md), [FE 구조 리팩토링과 비교 결과](FE_REFACTOR.md)를 남겨 두었습니다. 당시 범위·가정·측정값을 담은 기록이며, 현재 기능과 API는 위의 기능별 문서에서 설명합니다.

예를 들어 현재는 FAQ 복구와 네 가지 의도 재검색을 제공합니다. 재검색은 질문 작업 접수·조회 API를 사용하고, 매장 재검색에서 위치를 받지 못하면 요청을 보내지 않습니다. 과거 문서의 미완료 항목이나 임시 계약과 구분해 읽을 수 있습니다.
