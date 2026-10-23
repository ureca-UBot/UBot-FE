export type TelemapRegion =
  | 'SEOUL'
  | 'BUSAN'
  | 'DAEGU'
  | 'INCHEON'
  | 'GWANGJU'
  | 'DAEJEON'
  | 'ULSAN'
  | 'SEJONG'
  | 'GYEONGGI'
  | 'GANGWON'
  | 'CHUNGBUK'
  | 'CHUNGNAM'
  | 'JEONBUK'
  | 'JEONNAM'
  | 'GYEONGBUK'
  | 'GYEONGNAM'
  | 'JEJU'

export type SurgingAlertStatus = 'PENDING' | 'PROCESSED'

export interface SurgingAlertSummary {
  alertId: number
  region: TelemapRegion
  subject: string | null
  questionCount: number
  windowMinutes: number
  status: SurgingAlertStatus
  processedById: number | null
  createdAt: string
  processedAt: string | null
}

export interface SurgingQuestionSnapshot {
  questionLogId: number
  question: string
  occurredAt: string
}

export interface SurgingAlertDetail extends SurgingAlertSummary {
  questionSnapshots: SurgingQuestionSnapshot[]
}

export const telemapRegionLabel: Record<TelemapRegion, string> = {
  SEOUL: '서울',
  BUSAN: '부산',
  DAEGU: '대구',
  INCHEON: '인천',
  GWANGJU: '광주',
  DAEJEON: '대전',
  ULSAN: '울산',
  SEJONG: '세종',
  GYEONGGI: '경기',
  GANGWON: '강원',
  CHUNGBUK: '충북',
  CHUNGNAM: '충남',
  JEONBUK: '전북',
  JEONNAM: '전남',
  GYEONGBUK: '경북',
  GYEONGNAM: '경남',
  JEJU: '제주',
}

export const telemapStatusLabel: Record<SurgingAlertStatus, string> = {
  PENDING: '미처리',
  PROCESSED: '처리 완료',
}
