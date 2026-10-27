# 공지·고객센터·알림

[전체 기능](../README.md) · [매장 예약](stores-and-reservations.md) · [상담사 연결](../COUNSEL_WORK_SUMMARY.md)

고객은 공지에서 상황을 확인하고, 고객센터에 문의를 남긴 뒤 답변과 알림을 다시 조회합니다. 상담사와의 실시간 상담 메시지와 일대일 문의는 서로 다른 기능입니다.

## 공지와 장애 안내

`/#/notices`에서 공지·장애 목록을 유형·지역별로 조회하고 상세 내용을 엽니다. 현재 게시 대상인 배너는 비회원에게도 표시합니다. 서버가 접속 지역과 게시 기간을 판단하며, 화면은 일정 간격과 다시 활성화되는 시점에 갱신하고 노출 종료 시각이 지나면 배너를 숨깁니다.

관리자는 `/#/admin/notices`에서 유형·대상 지역·종료 시각을 포함해 등록·수정·삭제합니다. 변경 후 열린 화면의 배너도 갱신합니다. 삭제된 공지는 목록·내용 조회를 제공하며 복구 화면은 제공하지 않습니다.

## 문의 접수와 답변

`/#/customer-center`에서 회원이 문의를 작성하고 본인 문의의 내용·처리 상태·관리자 답변을 조회합니다. 문의 수정·삭제는 서버 조건을 따릅니다. AI 답변에 남긴 의견도 이 문의 API를 사용하므로 관리자 검토로 이어집니다.

관리자는 `/#/admin/inquiries`에서 문의를 확인하고 답변·처리 결과를 남깁니다. 고객센터 FAQ 목록은 인기·급상승 FAQ를 합쳐 보여 주며 전체 지식 문서 검색 화면은 아닙니다.

## 알림 확인

예약 확정·취소·방문 예정, 납부 예정·연체, 로밍 시작·종료, 약정·할부 만료, 데이터 사용 임계치 등 서버가 만든 알림을 조회합니다. 읽지 않은 수를 헤더와 MY에 표시하고 개별 읽기·전체 읽기를 제공합니다. 알림을 여는 것과 원래 업무의 처리 상태 변경은 구분합니다.

프론트는 사용자별 알림을 API로 조회합니다. 푸시 알림·이메일·문자 전송이나 알림 생성 스케줄을 브라우저가 수행하지 않습니다.

## 구현과 검증 위치

- [공지 API](../../src/user/notice/api/noticeApi.ts), [배너 갱신](../../src/user/notice/hooks/useNoticeBanners.ts), [관리자 공지](../../src/admin/notice/api/noticeApi.ts)
- [고객센터](../../src/user/pages/CustomerCenterPage.tsx), [문의 API](../../src/user/inquiry/api/inquiryApi.ts), [관리자 문의](../../src/admin/inquiry/api/inquiryApi.ts)
- [알림 조회](../../src/user/notification/api/notificationApi.ts), [읽지 않은 수](../../src/user/notification/context/NotificationUnreadProvider.tsx)
- [배너 테스트](../../scripts/notice-banners.test.cjs), [답변 의견 테스트](../../scripts/chat-feedback.test.cjs)
