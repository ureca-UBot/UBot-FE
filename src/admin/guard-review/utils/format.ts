export function intervalLabel(minutes: number) {
  if (minutes % 1440 === 0) return minutes === 1440 ? '매일' : `${minutes / 1440}일마다`
  if (minutes % 60 === 0) return `${minutes / 60}시간마다`
  return `${minutes}분마다`
}

export function displayReviewTime(value: string | null) {
  if (!value) return '예약 없음'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}
