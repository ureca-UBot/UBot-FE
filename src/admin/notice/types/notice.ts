import type { Notice, NoticeRegion, NoticeType } from '../../../shared/types/notice'

export interface AdminNoticeMetadata {
  createdBy: number | null
  updatedBy: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// BE AdminNoticeResponseDto: 공개 응답과 같은 detail에 관리 정보를 덧붙입니다.
export interface AdminNotice {
  detail: Notice
  metadata: AdminNoticeMetadata
}

// BE AdminNoticeRequestDto: 등록과 수정이 같은 본문입니다. 수정(PUT)은 모든 값을 다시 보냅니다.
export interface AdminNoticeRequest {
  type: NoticeType
  title: string
  content: string
  // null이면 전체 공지입니다.
  targetRegion: NoticeRegion | null
  // null이면 삭제하기 전까지 계속 노출합니다. "2026-10-20T18:00:00" 형식입니다.
  endsAt: string | null
}

export interface AdminNoticeListParams {
  type: NoticeType | null
  // 대상 지역이 정확히 일치하는 공지만 찾습니다.
  region: NoticeRegion | null
  // true면 삭제된 공지만, false면 삭제되지 않은 공지만 조회합니다.
  deleted: boolean
  page: number
  size: number
}

// 입력 화면의 값입니다. 서버로 보낼 때 AdminNoticeRequest로 바꿉니다.
export interface NoticeFormValues {
  type: NoticeType
  title: string
  content: string
  targetRegion: NoticeRegion | ''
  // <input type="datetime-local">의 값("2026-10-20T18:00")입니다. 비어 있으면 종료 시각이 없습니다.
  endsAt: string
}

// BE가 허용하는 제목·본문 최대 길이입니다.
export const NOTICE_TITLE_MAX_LENGTH = 100
export const NOTICE_CONTENT_MAX_LENGTH = 10000
