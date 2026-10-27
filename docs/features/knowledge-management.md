# FAQ와 지식 관리

[전체 기능](../README.md) · [고객의 AI 채팅](chat-and-history.md) · [운영과 안전](operations-and-safety.md)

관리자는 FAQ를 검색 자료로 준비하고, 질문에 대한 이용·검색 결과를 보며 부족한 지식을 보완합니다. 화면은 원문·품질 지표·검토 결과를 연결하고, 실제 임베딩·검색·재검증은 BE가 수행합니다.

## FAQ 준비와 변경

`/#/admin/faqs`에서 목록·검색·카테고리·상세·수정 이력을 조회하고 FAQ를 등록·수정·삭제합니다. 유사 질문 표현과 직접 답변 반환 여부를 관리하고, 삭제된 FAQ를 복구할 수 있습니다. 카테고리 삭제 시 사용 중인 FAQ가 있으면 관련 목록과 서버 오류를 표시합니다.

FAQ 변경과 검색 벡터 반영의 조건은 서버가 관리합니다. 전체 데이터의 벡터를 다시 준비할 때는 임베딩 백필 화면에서 FAQ·미응답 작업을 각각 또는 차례로 실행합니다. 프론트는 실행 경과·완료 건수·오류를 표시합니다.

## 사용 결과로 개선 대상 찾기

`/#/admin/dashboard`에서 이용량·미응답·유사도 추이를 살펴봅니다. 일반·상품·본인 정보·매장 의도별 순위를 보고, FAQ 상세에서 기간별 사용량과 검색 결과에 함께 나타난 FAQ를 확인합니다.

낮은 검색 품질·중복 의심·낮은 이용량 등의 후보를 검토합니다. AI 검토 결과는 Markdown으로 표시하고, 개선 대상에서 제외하거나 제외를 해제한 기록도 조회합니다. 분석 결과만으로 FAQ를 자동 변경하지 않습니다.

## 미응답에서 FAQ로

`/#/admin/unanswered-groups`에서 비슷한 질문 묶음과 대표 주제, 원래 질문·검색 질문, 실패 사유를 확인합니다. 근거 없음·근거 부족·모델 답변 불가·FAQ 내용 충돌을 구분하고 관리자 검토 후 FAQ로 등록할 수 있습니다.

FAQ를 보완한 뒤 재검증 결과에서 이전·현재 검색 FAQ와 유사도를 비교합니다. 화면은 서버가 계산한 결과를 표시하며, 재검증 결과와 사람이 판단한 처리 상태를 함께 확인할 수 있습니다.

## 구현과 검증 위치

- [FAQ API](../../src/admin/faq/api/faqApi.ts), [삭제 FAQ와 복구](../../src/admin/pages/faq/DeletedFaqListPage.tsx)
- [품질 분석 API](../../src/admin/dashboard/api/faqMonitoringApi.ts), [개선 후보 상태](../../src/admin/dashboard/hooks/useFaqImprovements.ts)
- [미응답 API](../../src/admin/unanswered/api/unansweredApi.ts), [백필 API](../../src/admin/embedding/api/embeddingBackfillApi.ts)
- [관리자 회귀 테스트](../../scripts/admin-followup.test.cjs), [초기 FAQ 구현 기록](../ADMIN_FAQ_WORK_SUMMARY.md)
