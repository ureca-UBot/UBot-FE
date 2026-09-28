import type { TransitFare } from '../types/directions';

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))}m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)}km`;
}

export function formatFare(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

// 정액 노선은 value만, 구간·환승 요금은 min/max만 채워진다.
export function formatTransitFare(fare: TransitFare | null): { text: string; isRange: boolean } | null {
  if (!fare) return null;
  if (typeof fare.value === 'number') return { text: formatFare(fare.value), isRange: false };
  if (typeof fare.min === 'number' && typeof fare.max === 'number') {
    if (fare.min === fare.max) return { text: formatFare(fare.max), isRange: false };
    return { text: `${fare.min.toLocaleString('ko-KR')}~${formatFare(fare.max)}`, isRange: true };
  }
  return null;
}
