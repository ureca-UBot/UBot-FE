import type { Notice } from '../../../shared/types/notice'
import {
  NOTICE_CONTENT_MAX_LENGTH,
  NOTICE_TITLE_MAX_LENGTH,
  type AdminNoticeRequest,
  type NoticeFormValues,
} from '../types/notice'

export const BLANK_NOTICE_VALUES: NoticeFormValues = {
  type: 'NOTICE',
  title: '',
  content: '',
  targetRegion: '',
  endsAt: '',
}

// datetime-local 입력은 "분"까지만 다루므로 초 이하는 잘라서 보여줍니다.
function toInputDateTime(value: string | null) {
  return value ? value.slice(0, 16) : ''
}

export function valuesFromNotice(notice: Notice): NoticeFormValues {
  return {
    type: notice.type,
    title: notice.title,
    content: notice.content,
    targetRegion: notice.targetRegion ?? '',
    endsAt: toInputDateTime(notice.endsAt),
  }
}

// 종료 시각을 사용자가 바꾸지 않았는지 확인합니다. original이 없으면(등록) 입력이 있으면 바뀐 것입니다.
function isEndsAtChanged(input: string, original: Notice | null) {
  return input !== toInputDateTime(original?.endsAt ?? null)
}

// 문제가 있으면 사용자에게 보여줄 문구를, 없으면 null을 돌려줍니다. 서버 검증과 같은 기준입니다.
export function validateNotice(values: NoticeFormValues, original: Notice | null): string | null {
  if (!values.title.trim()) return '제목을 입력해주세요.'
  if (values.title.trim().length > NOTICE_TITLE_MAX_LENGTH)
    return `제목은 ${NOTICE_TITLE_MAX_LENGTH}자 이내로 입력해주세요.`
  if (!values.content.trim()) return '내용을 입력해주세요.'
  if (values.content.trim().length > NOTICE_CONTENT_MAX_LENGTH)
    return `내용은 ${NOTICE_CONTENT_MAX_LENGTH.toLocaleString()}자 이내로 입력해주세요.`
  // 이미 노출이 끝난 공지의 다른 항목을 고칠 수 있도록, 종료 시각을 바꿨을 때만 확인합니다.
  if (
    values.endsAt &&
    isEndsAtChanged(values.endsAt, original) &&
    new Date(values.endsAt).getTime() <= Date.now()
  ) {
    return '노출 종료 시각은 현재 이후여야 합니다.'
  }
  return null
}

export function toNoticeRequest(
  values: NoticeFormValues,
  original: Notice | null,
): AdminNoticeRequest {
  let endsAt: string | null = null
  if (values.endsAt) {
    // 바꾸지 않았으면 서버가 준 값을 그대로 돌려보내, 초 이하가 잘려 "바뀐 값"으로 보이는 일을 막습니다.
    endsAt =
      !isEndsAtChanged(values.endsAt, original) && original?.endsAt
        ? original.endsAt
        : `${values.endsAt}:00`
  }
  return {
    type: values.type,
    title: values.title.trim(),
    content: values.content.trim(),
    targetRegion: values.targetRegion || null,
    endsAt,
  }
}
