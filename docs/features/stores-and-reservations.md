# 매장 찾기와 방문 예약

[전체 기능](../README.md) · [AI 채팅](chat-and-history.md) · [알림](customer-support.md)

`/#/stores`에서 매장을 찾습니다. 지도는 Kakao JavaScript SDK를 사용하고, 매장·경로·예약 데이터는 BE API로 조회합니다. 브라우저 지도 키와 서버의 외부 API 키는 별개입니다.

## 매장을 찾고 경로 확인하기

지역·검색어·제공 서비스로 목록을 좁히거나 현재 위치와 지도 범위로 매장을 찾습니다. 지도 축척에 따라 묶음과 개별 매장을 표시하고, 매장 선택 시 정보와 길찾기·예약 동작을 연결합니다. AI 답변 안의 지도도 매장과 경로를 확인할 수 있습니다.

출발지는 현재 위치 또는 검색으로 지정합니다. 자동차·도보·대중교통 경로를 제공하며, 대중교통은 후보를 고른 뒤 구간·정류장·세부 경로를 표시합니다. 브라우저 위치 권한을 받지 못하면 위치 기반 요청에 필요한 안내를 보여 줍니다.

## 예약과 후속 처리

| 단계 | 동작 |
|---|---|
| 시간 선택 | 로그인 후 날짜별 예약 가능 시간을 서버에서 조회 |
| 접수 | 방문 목적과 시간을 확인하고 예약 생성 요청 |
| 재확인 | MY에서 본인 예약 목록·상태 조회 |
| 취소 | 취소 요청 후 목록 갱신 |
| 관리자 처리 | 예약 목록에서 취소·방문 완료·미방문 상태 처리 |

조회 오류와 예약 가능 시간이 없는 상태를 구분합니다. 시간 조회가 실패하면 다시 불러올 수 있고, 접수 중 중복 제출을 막습니다. 슬롯·예약 한도·소유권의 최종 판단은 BE가 합니다. 예약에 따른 사용자 알림은 서버가 생성합니다.

관리자는 `/#/admin/stores`에서 매장 위치·서비스·운영 정보를 등록·수정·삭제하고 삭제 매장을 복구합니다. 예약은 `/#/admin/reservations`에서 관리합니다.

## 구현과 검증 위치

- [매장 화면](../../src/user/pages/StoreLocatorPage.tsx), [매장 조회](../../src/user/store-locator/api/stores.ts), [길찾기](../../src/user/store-locator/api/directions.ts)
- [지도 구성](../../src/user/store-locator/setupStoreLocator.ts), [경로 표시](../../src/user/store-locator/directions/setupStoreDirections.ts)
- [예약 폼](../../src/user/reservation/components/ReservationForm.tsx), [예약 API](../../src/user/reservation/api/reservationApi.ts), [관리자 예약](../../src/admin/reservation/api/adminReservationApi.ts)
- [관리자 매장](../../src/admin/store/api/storeApi.ts), [지도 회귀 테스트](../../scripts/chat-store-map.test.cjs), [예약·화면 테스트](../../scripts/regression.test.cjs)
