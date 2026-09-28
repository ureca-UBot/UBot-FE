import type { DirectionsStep } from '../types/directions';
import type { RouteIconType } from './icons';

export const WALK_COLOR = '#9aa0a6';
export const BUS_COLOR = '#1677ff';
const SUBWAY_FALLBACK_COLOR = '#5b6b7a';
export const MAX_VEHICLE_CHIPS = 5;

// 백엔드는 노선 색을 주지 않으므로 수도권 노선명으로 공식 색을 찾는다. 구체적인 이름을 먼저 검사한다.
const SUBWAY_LINE_COLORS: Array<[RegExp, string]> = [
  [/인천\s*1호선/, '#7CA8D5'],
  [/인천\s*2호선/, '#ED8B00'],
  [/신분당/, '#D4003B'],
  [/수인|분당/, '#FABE00'],
  [/경의|중앙선/, '#77C4A3'],
  [/공항/, '#0090D2'],
  [/경춘/, '#0C8E72'],
  [/우이신설/, '#B0CE18'],
  [/서해/, '#8FC31F'],
  [/김포/, '#AD8605'],
  [/신림/, '#6789CA'],
  [/의정부/, '#FDA600'],
  [/에버라인|용인/, '#509F22'],
  [/경강/, '#0054A6'],
  [/GTX/i, '#9A6292'],
  [/(^|\D)1호선/, '#0052A4'],
  [/(^|\D)2호선/, '#00A84D'],
  [/(^|\D)3호선/, '#EF7C1C'],
  [/(^|\D)4호선/, '#00A5DE'],
  [/(^|\D)5호선/, '#996CAC'],
  [/(^|\D)6호선/, '#CD7C2F'],
  [/(^|\D)7호선/, '#747F00'],
  [/(^|\D)8호선/, '#E6186C'],
  [/(^|\D)9호선/, '#BDB092'],
];

export function isRideStep(step: DirectionsStep) {
  return step.type === 'BUS' || step.type === 'SUBWAY';
}

export function uniqueVehicles(step: DirectionsStep) {
  return [...new Set(step.vehicles.map((name) => name.trim()).filter(Boolean))];
}

function subwayLineColor(step: DirectionsStep) {
  const name = step.vehicles[0] ?? step.guidance ?? '';
  return SUBWAY_LINE_COLORS.find(([pattern]) => pattern.test(name))?.[1] ?? SUBWAY_FALLBACK_COLOR;
}

export function stepColor(step: DirectionsStep) {
  if (step.type === 'SUBWAY') return subwayLineColor(step);
  if (step.type === 'BUS') return BUS_COLOR;
  return WALK_COLOR;
}

export function stepIconType(step: DirectionsStep): RouteIconType {
  if (step.type === 'SUBWAY') return 'subway';
  if (step.type === 'BUS') return 'bus';
  return 'walk';
}

function stopDisplayName(step: DirectionsStep, name: string | undefined) {
  if (!name) return step.type === 'SUBWAY' ? '지하철역' : '정류장';
  if (step.type === 'SUBWAY' && !name.endsWith('역')) return `${name}역`;
  return name;
}

export function boardStopName(step: DirectionsStep) {
  return stopDisplayName(step, step.stops[0]);
}

export function alightStopName(step: DirectionsStep) {
  return stopDisplayName(step, step.stops[step.stops.length - 1]);
}
