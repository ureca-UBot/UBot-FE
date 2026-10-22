# 관리자 AI 금칙어·위험 문장 검토

- 화면: `/#/admin/forbidden-words/review` (금지어 관리에서 진입)
- 분석 설정: `?view=settings`, 후보: `?view=candidates`, 경고: `?view=warnings`, 이력: `?view=history`
- 주기 설정·후보 수정·오차단 재검사·검사한 버전 승인·위험 문장 경고·알림 확인을 제공합니다.
- 기존 관리자 인증·API 클라이언트·금지어 목록·페이지네이션·모달 포커스를 재사용합니다.
- 위험 문장 경고를 확인해도 금칙어로 자동 등록하지 않습니다.
- 수정된 후보·만료된 검사·정상 오차단·기존 차단 누락은 승인을 막습니다. 최종 승인은 서버가 다시 검증합니다.

## 백엔드 준비

실제 동작에는 UBot-BE PR #264의 `/api/admin/guard-review` API와 V42 마이그레이션 배포가 필요합니다.
API가 아직 없으면 준비되지 않았다는 안내를 표시하며 기존 금지어 관리로 돌아갈 수 있습니다.
프론트에서 DB나 LLM을 직접 호출하지 않습니다. 샘플 서버·샘플 화면 도구는 운영 번들에 포함하지 않습니다.

## 검증

`npm test`, `npm run lint`, `npm run format:check`, `npm run build`를 실행합니다.
관리자 화면 브라우저 검증은 `node --test scripts/guard-review-browser.test.cjs`이며, API 응답을 모의 처리합니다.
실제 배포된 API·관리자 인증·LLM 분석 품질 검증을 대신하지 않습니다.
