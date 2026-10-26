import type { TelemapRegion } from '../types/telemap'

interface MapPlace {
  region: TelemapRegion
  anchor: [number, number]
  markerCount: number
}

interface PlacedRegion {
  region: TelemapRegion
  x: number
  y: number
  width: number
  height: number
}

interface TelemapLayout {
  height: number
  scale: number
  offsetX: number
  offsetY: number
  markerLimit: number
  compact: boolean
  places: Map<TelemapRegion, PlacedRegion>
}

// 고정 크기 마커를 화면 좌표에서 배치합니다. 작은 화면에서는 두 주제와 +N을 표시합니다.
export function layoutTelemapPlaces(
  places: MapPlace[],
  width: number,
  labels: [number, number][] = [],
  extraRows = 0,
): TelemapLayout {
  const compact = width < 400
  const markerLimit = compact ? 2 : 3
  const markerSize = compact ? 23 : 30
  const markerGap = compact ? 2 : 3
  const gap = compact ? 4 : 8
  const padding = 6
  const sizes = places.map((place) => {
    const count = Math.min(place.markerCount, markerLimit) + Number(place.markerCount > markerLimit)
    return {
      ...place,
      width: Math.max(42, count * markerSize + Math.max(0, count - 1) * markerGap),
      height: markerSize,
    }
  })
  const cellWidth = Math.max(42, ...sizes.map((item) => item.width)) + gap
  const cellHeight = markerSize + gap
  const columns = Math.max(1, Math.floor((width - padding * 2 + gap) / cellWidth))
  const rows = Math.ceil(places.length / columns)
  const height = Math.max(
    (width * 680) / 720,
    (rows + (compact ? 4 : 1) + extraRows) * cellHeight - gap + padding * 2,
  )
  const scale = Math.min(width / 720, height / 680)
  const offsetX = (width - 720 * scale) / 2
  const offsetY = (height - 680 * scale) / 2
  const slotRows = Math.max(rows, Math.floor((height - padding * 2 + gap) / cellHeight))
  const obstacles = labels.map(([x, y]) => ({
    x: offsetX + x * scale,
    y: offsetY + y * scale,
    width: 26,
    height: 18,
  }))
  const slots = Array.from({ length: columns * slotRows }, (_, index) => ({
    x: padding + (((index % columns) + 0.5) * (width - padding * 2)) / columns,
    y: padding + ((Math.floor(index / columns) + 0.5) * (height - padding * 2)) / slotRows,
  }))
  const items = sizes
    .map((item) => ({
      ...item,
      x: Math.max(
        padding + item.width / 2,
        Math.min(width - padding - item.width / 2, offsetX + item.anchor[0] * scale),
      ),
      y: Math.max(
        padding + item.height / 2,
        Math.min(height - padding - item.height / 2, offsetY + item.anchor[1] * scale),
      ),
    }))
    .sort((left, right) => right.width * right.height - left.width * left.height)
  const overlaps = (left: Omit<PlacedRegion, 'region'>, right: Omit<PlacedRegion, 'region'>) =>
    Math.abs(left.x - right.x) < (left.width + right.width) / 2 + gap &&
    Math.abs(left.y - right.y) < (left.height + right.height) / 2 + gap
  let placed: PlacedRegion[] = []
  for (const item of items) {
    const candidates = [{ x: item.x, y: item.y }, ...slots].sort(
      (left, right) =>
        (left.x - item.x) ** 2 +
        (left.y - item.y) ** 2 -
        (right.x - item.x) ** 2 -
        (right.y - item.y) ** 2,
    )
    const free = candidates.find(
      (candidate) =>
        ![...placed, ...obstacles].some((other) => overlaps({ ...item, ...candidate }, other)),
    )
    if (!free) {
      // 자유 배치로 빈 공간이 나뉘면 각 지역을 담을 수 있는 셀에 다시 배치합니다.
      const remaining = slots.filter(
        (slot) =>
          !obstacles.some((other) =>
            overlaps({ ...slot, width: cellWidth - gap, height: cellHeight - gap }, other),
          ),
      )
      if (remaining.length < items.length)
        return layoutTelemapPlaces(places, width, labels, extraRows + 4)
      placed = items.map((current) => {
        remaining.sort(
          (left, right) =>
            (left.x - current.x) ** 2 +
            (left.y - current.y) ** 2 -
            (right.x - current.x) ** 2 -
            (right.y - current.y) ** 2,
        )
        return { ...current, ...remaining.shift()! }
      })
      break
    }
    placed.push({ ...item, ...free })
  }
  // 같은 크기의 표시끼리 자리를 교환해 겹침 없이 원래 지리적 위치에 가깝게 정렬합니다.
  const distance = (item: PlacedRegion, slot: PlacedRegion) =>
    (item.x - slot.x) ** 2 + (item.y - slot.y) ** 2
  for (let pass = 0; pass < items.length * 2; pass += 1) {
    let changed = false
    for (let index = 0; index < placed.length; index += 1) {
      for (let other = index + 1; other < placed.length; other += 1) {
        if (
          placed[index].width !== placed[other].width ||
          placed[index].height !== placed[other].height
        )
          continue
        const before = distance(items[index], placed[index]) + distance(items[other], placed[other])
        const after = distance(items[index], placed[other]) + distance(items[other], placed[index])
        if (after + 0.01 >= before) continue
        const { x, y } = placed[index]
        placed[index] = { ...placed[index], x: placed[other].x, y: placed[other].y }
        placed[other] = { ...placed[other], x, y }
        changed = true
      }
    }
    if (!changed) break
  }
  return {
    height,
    scale,
    offsetX,
    offsetY,
    markerLimit,
    compact,
    places: new Map(placed.map((item) => [item.region, item])),
  }
}

const compactCount = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 0,
})
export const telemapMarkerCount = (count: number) =>
  count < 1000 ? String(count) : compactCount.format(count)
