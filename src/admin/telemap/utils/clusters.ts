import type { SurgingAlertSummary, TelemapRegion } from '../types/telemap'

// DESIGN.md의 관리자 팔레트만 사용합니다. 주제는 상태·지역 필터와 무관하게 같은 색을 씁니다.
const SUBJECT_COLORS = ['#4f46e5', '#047857', '#b91c1c', '#374151', '#312e81', '#4338ca', '#6b7280']

export const formatTelemapDate = (value: string | null) =>
  value ? value.slice(0, 19).replace('T', ' ') : '-'

export const telemapSubject = (alert: SurgingAlertSummary) =>
  alert.subject?.normalize('NFKC').trim().replace(/\s+/g, ' ') || '주제 생성 중'

export const telemapSubjectKey = (alert: SurgingAlertSummary) =>
  telemapSubject(alert) === '주제 생성 중' ? `pending:${alert.alertId}` : telemapSubject(alert)

export function getTelemapSubjects(alerts: SurgingAlertSummary[]) {
  const subjects = new Map<string, string>()
  alerts.forEach((alert) => subjects.set(telemapSubjectKey(alert), telemapSubject(alert)))
  return [...subjects]
    .sort(([left], [right]) => left.localeCompare(right, 'ko'))
    .map(([key, label], index) => ({
      key,
      label: key.startsWith('pending:') ? `${label} #${key.slice(8)}` : label,
      color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
    }))
}

export interface TelemapCluster {
  key: string
  region: TelemapRegion
  subjectKey: string
  subject: string
  questionCount: number
  alerts: SurgingAlertSummary[]
}

export function clusterTelemapAlerts(alerts: SurgingAlertSummary[]): TelemapCluster[] {
  const clusters = new Map<string, TelemapCluster>()
  alerts.forEach((alert) => {
    const subjectKey = telemapSubjectKey(alert)
    const key = JSON.stringify([alert.region, subjectKey])
    const cluster = clusters.get(key)
    if (cluster) {
      cluster.questionCount += alert.questionCount
      cluster.alerts.push(alert)
    } else {
      clusters.set(key, {
        key,
        region: alert.region,
        subjectKey,
        subject: telemapSubject(alert),
        questionCount: alert.questionCount,
        alerts: [alert],
      })
    }
  })
  return [...clusters.values()].sort(
    (left, right) => right.questionCount - left.questionCount || left.key.localeCompare(right.key),
  )
}
