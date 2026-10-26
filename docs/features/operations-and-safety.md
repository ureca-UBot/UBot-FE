# 운영과 안전 관리

[전체 기능](../README.md) · [FAQ 개선](knowledge-management.md) · [상담 메시지 보호](../COUNSEL_WORK_SUMMARY.md)

관리자 화면에서 정책 변경을 검토하고, 지역별 문의 증가와 서비스 상태를 확인합니다. 지표·판정·분석 결과는 BE가 제공하며 FE가 직접 모델이나 Prometheus에 연결하지 않습니다.

## 금지어와 정책 후보 검토

`/#/admin/forbidden-words`에서 금지어를 관리합니다. AI 검토 화면에서는 분석 설정, 후보 수정, 검증 실행, 위험 문장 경고, 적용 이력을 다룹니다. 실패한 분석의 재개·재처리 가능 여부도 표시합니다.

승인할 때는 검사한 후보 묶음과 현재 버전이 같은지, 검사가 완료되고 만료되지 않았는지, 오차단·기존 차단 누락이 없는지 확인합니다. 검사 사례는 페이지 단위로 조회하고 전체 집계와 구분합니다. 후보가 바뀌거나 검사가 만료되면 이전 결과로 승인하지 못하게 하며, 최종 판단은 BE가 다시 수행합니다. 위험 문장 경고를 확인한 것만으로 금지어를 추가하지 않습니다.

[상세 검토 계약](../GUARD_REVIEW_WORK_SUMMARY.md)

## 가드 검사 기록에서 원인 확인하기

`/#/admin/forbidden-words/review?view=checks`에서 실제 검사 이력을 조회합니다. 입력·출력 각각의 코드 검사와 LLM 검사를 구분하고, 통과·필터링·거절·보류·오류·생략으로 목록을 좁힙니다. 표시 건수는 질문 수가 아니라 검사 횟수입니다. 검사 생략이나 오류를 통과로 계산하지 않습니다.

상세 화면은 원래 질문, 검사한 답변, 해당 단계를 통과한 답변, 검사 당시의 FAQ·이전 대화·업무 조회 자료를 보여 줍니다. 현재 FAQ를 다시 읽어 과거 근거로 사용하지 않습니다. 원문 보관기간이 지났거나 당시 근거를 보존하지 못했다면 그 상태를 표시합니다.

| 단계 | 관리자 동작과 결과 |
|---|---|
| 대상 선택 | 분석 가능한 기록을 개별 또는 현재 페이지 단위로 선택. 페이지를 바꿔도 선택을 유지하고 필터 변경 시 해제 |
| 선택 분석 | 선택한 검사 ID를 `POST /api/admin/guard-review/checks/analysis`에 전달 |
| 경과 확인 | 3초 간격으로 대기·실행 상태를 조회하고 완료·실패 시 목록과 상세 갱신. 조회 오류는 다시 조회 가능 |
| 결과 검토 | 금칙어 후보·위험 문장 경고·실행 이력으로 이동. 보류 기록의 관리자 AI 재판정은 원래 판정과 구분해 표시 |

검사 생략·출처 불명·원문 만료 기록 등은 선택 분석에서 제외합니다. 서버가 `checkMultiSelect`와 `checkSelectionAnalysis`를 모두 지원한다고 응답할 때만 다중 필터·선택 분석을 활성화합니다. 지원하지 않는 서버에서는 기존 기록 조회를 유지합니다. 금칙어 후보와 위험 문장 경고의 출처·판정 필터는 해당 조건에 맞는 발견 사례와 건수를 함께 보여 줍니다.

## 상담 안전성

`/#/admin/counsel-safety`에서 허용·차단·검사 실패와 판정 메타데이터를 조회합니다. 메시지 원문을 보여 주는 관리 화면은 아닙니다. `/#/admin/counsel-sentences`에서 금지 문장을 등록·수정·활성화·삭제하면 서버가 자동 색인합니다. 진행 중에는 색인 상태를 갱신하고 실패 시 재시도합니다.

## 지역 문의와 서비스 지표

Telemap은 `/#/admin/telemap`에서 **지역별 유사 질문의 급증**을 지도·목록으로 보여 줍니다. 같은 지역·주제를 모아 상세 질문을 확인하고 대응 완료로 처리합니다. 통신망 품질을 직접 측정하거나 장애를 확정하는 지도는 아닙니다.

`/#/admin/operation`에서는 서비스·DB·Redis 상태, 요청량·오류·지연, JVM·커넥션 풀·컨테이너 자원을 확인합니다. 조회 기간을 선택해 새로고침하며, 수집되지 않은 지표와 API 오류를 표시합니다. 지표를 표시할 수 있다는 사실이 모든 배포에서 모든 수집기가 켜져 있다는 뜻은 아닙니다.

## 운영 설정

비회원 질문 한도를 조회·수정합니다. 임베딩 백필은 작업별 실행·경과·완료·실패를 표시하고 관리자 화면을 오가도 실행 상태를 유지합니다. 새로고침이나 다른 브라우저까지 유지하는 서버 작업 조회, 전체 진행률·중복 실행 통제는 이 화면에서 제공하지 않습니다.

## 구현과 검증 위치

- [정책 검토 API](../../src/admin/guard-review/api/guardReviewApi.ts), [승인 조건](../../src/admin/guard-review/utils/validation.ts)
- [검사 이력과 선택 분석](../../src/admin/guard-review/components/ReviewChecks.tsx), [당시 근거 표시](../../src/admin/guard-review/components/ReviewEvidence.tsx), [필터·선택 조건](../../src/admin/guard-review/utils/filters.ts)
- [상담 안전성](../../src/counsel/pages/SafetyMonitorPage.tsx), [금지 문장 API](../../src/counsel/api/safetySentenceApi.ts)
- [Telemap](../../src/admin/pages/telemap/TelemapPage.tsx), [지역 분석 API](../../src/admin/telemap/api/telemapApi.ts)
- [운영 지표 API](../../src/admin/operation/api/operationMonitoringApi.ts), [비회원 설정](../../src/admin/guest-chat/api/guestChatSettingsApi.ts)
- [검토 화면 테스트](../../scripts/guard-review-browser.test.cjs), [Telemap·상담사 진입 테스트](../../scripts/telemap.test.cjs)
