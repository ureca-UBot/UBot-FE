import type { CarGuide, DirectionsPoint, DirectionsStep } from '../types/directions'
import { formatDistance, formatDuration } from './format'
import { turnIconType, type RouteIcon } from './icons'
import {
  MAX_VEHICLE_CHIPS,
  alightStopName,
  boardStopName,
  intermediateStopNames,
  isRideStep,
  stepColors,
  stepIconType,
  uniqueVehicles,
} from './transit'

export type ItemKind = 'start' | 'end' | 'step'

export interface RouteChip {
  text: string
  color: string
  solid: boolean
}

export interface RouteItem {
  kind: ItemKind
  label: string
  text: string
  meta: string
  icon: RouteIcon
  point: DirectionsPoint | null
  marker: 'number' | 'icon' | 'none'
  chips: RouteChip[]
  // 버스·지하철 승차 항목을 펼쳤을 때 보여줄 중간 역·정류장.
  substops?: { names: string[]; color: string }
  // 버스·지하철은 승차·하차 두 항목으로 나누고, 목록에서 노선 색 선으로 잇는다.
  ride?: { role: 'board' | 'alight'; color: string }
}

export interface RoutePlaces {
  origin: string
  destination: string
}

export function carGuideKind(guides: CarGuide[], index: number): ItemKind {
  const guidance = guides[index].guidance ?? ''
  if (index === 0 && /출발/.test(guidance)) return 'start'
  if (index === guides.length - 1 && /목적지|도착/.test(guidance)) return 'end'
  return 'step'
}

export function startItem(places: RoutePlaces, point: DirectionsPoint): RouteItem {
  return {
    kind: 'start',
    label: '출발',
    text: `출발 · ${places.origin}`,
    meta: '',
    icon: { type: 'start' },
    point,
    marker: 'none',
    chips: [],
  }
}

export function endItem(places: RoutePlaces, point: DirectionsPoint): RouteItem {
  return {
    kind: 'end',
    label: '도착',
    text: `도착 · ${places.destination}`,
    meta: '',
    icon: { type: 'end' },
    point,
    marker: 'none',
    chips: [],
  }
}

export function describeCarGuide(guide: CarGuide, kind: ItemKind, places: RoutePlaces) {
  if (kind === 'start') return `출발 · ${places.origin}`
  if (kind === 'end') return `도착 · ${places.destination}`
  const action = guide.guidance || '직진'
  if (!guide.distanceMeters) return action
  const road = guide.name && !/출발지|목적지/.test(guide.name) ? `${guide.name} ` : ''
  return `${road}${formatDistance(guide.distanceMeters)} 이동, ${action}`
}

export function describeCarGuideMeta(guide: CarGuide, kind: ItemKind) {
  const parts: string[] = []
  if (kind === 'end' && guide.distanceMeters > 0)
    parts.push(`${formatDistance(guide.distanceMeters)} 이동`)
  if (guide.durationSeconds > 0) parts.push(`약 ${formatDuration(guide.durationSeconds)}`)
  return parts.join(' · ')
}

export function buildCarItems(guides: CarGuide[], places: RoutePlaces): RouteItem[] {
  let stepNumber = 0
  return guides.map((guide, index) => {
    const kind = carGuideKind(guides, index)
    const label = kind === 'start' ? '출발' : kind === 'end' ? '도착' : String(++stepNumber)
    return {
      kind,
      label,
      text: describeCarGuide(guide, kind, places),
      meta: describeCarGuideMeta(guide, kind),
      icon: { type: kind === 'step' ? turnIconType(guide.guidance) : kind },
      point: guide.point,
      marker: kind === 'step' ? 'number' : 'none',
      chips: [],
    }
  })
}

export function buildWalkItems(
  steps: DirectionsStep[],
  places: RoutePlaces,
  origin: DirectionsPoint,
  destination: DirectionsPoint,
): RouteItem[] {
  const items = steps.map(
    (step, index): RouteItem => ({
      kind: 'step',
      label: String(index + 1),
      text: step.guidance || `${formatDistance(step.distanceMeters)} 이동`,
      meta: [
        formatDistance(step.distanceMeters),
        step.durationSeconds > 0 ? `약 ${formatDuration(step.durationSeconds)}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      icon: { type: turnIconType(step.guidance) },
      point: step.path[0] ?? null,
      marker: 'number',
      chips: [],
    }),
  )
  return [startItem(places, origin), ...items, endItem(places, destination)]
}

export function vehicleChips(step: DirectionsStep, color: string): RouteChip[] {
  const vehicles = uniqueVehicles(step)
  const solid = step.type === 'SUBWAY'
  const chips = vehicles.slice(0, MAX_VEHICLE_CHIPS).map((text) => ({ text, color, solid }))
  if (vehicles.length > MAX_VEHICLE_CHIPS) {
    chips.push({ text: `+${vehicles.length - MAX_VEHICLE_CHIPS}`, color: '#8b8e95', solid: false })
  }
  return chips
}

export function buildTransitItems(
  steps: DirectionsStep[],
  places: RoutePlaces,
  origin: DirectionsPoint,
  destination: DirectionsPoint,
): RouteItem[] {
  const items: RouteItem[] = [startItem(places, origin)]
  const colors = stepColors(steps)
  let stepNumber = 0

  steps.forEach((step, index) => {
    const color = colors[index]
    const icon = { type: stepIconType(step), color }
    const point = step.path[0] ?? null

    if (isRideStep(step)) {
      const stopCount = Math.max(1, step.stops.length - 1)
      const unit = step.type === 'SUBWAY' ? '개 역' : '개 정류장'
      items.push({
        kind: 'step',
        label: String(++stepNumber),
        text: `${boardStopName(step)} 승차`,
        meta: `${stopCount}${unit} 이동 · 약 ${formatDuration(step.durationSeconds)}`,
        icon,
        point,
        marker: 'icon',
        chips: vehicleChips(step, color),
        substops: { names: intermediateStopNames(step), color },
        ride: { role: 'board', color },
      })
      items.push({
        kind: 'step',
        label: String(++stepNumber),
        text: `${alightStopName(step)} 하차`,
        meta: '',
        icon,
        point: step.path[step.path.length - 1] ?? null,
        marker: 'icon',
        chips: [],
        ride: { role: 'alight', color },
      })
      return
    }
    const label = String(++stepNumber)

    const nextRide = steps.slice(index + 1).find(isRideStep)
    const hasPreviousRide = steps.slice(0, index).some(isRideStep)
    const target = nextRide ? boardStopName(nextRide) : places.destination
    items.push({
      kind: 'step',
      label,
      text: `${hasPreviousRide && nextRide ? '환승 · ' : ''}${target}까지 도보`,
      meta: `${formatDistance(step.distanceMeters)} · 약 ${formatDuration(step.durationSeconds)}`,
      icon,
      point,
      marker: 'icon',
      chips: [],
    })
  })

  items.push(endItem(places, destination))
  return items
}
