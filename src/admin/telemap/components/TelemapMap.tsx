import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import provincePaths from '../data/koreaProvinces.json'
import { telemapRegionLabel, type TelemapRegion } from '../types/telemap'
import type { TelemapCluster } from '../utils/clusters'
import { layoutTelemapPlaces, telemapMarkerCount } from '../utils/mapLayout'

// 지명은 실제 경계 안에 두고, 여러 주제의 마커는 겹치지 않는 별도 위치에 배치합니다.
const positions: Record<TelemapRegion, { point: [number, number]; label: [number, number] }> = {
  SEOUL: { point: [261.5, 152.8], label: [125, 105] },
  INCHEON: { point: [235.4, 163.7], label: [94, 195] },
  GYEONGGI: { point: [301.6, 172.3], label: [328, 175] },
  GANGWON: { point: [384.1, 139.7], label: [450, 110] },
  CHUNGBUK: { point: [323, 230.7], label: [352, 246] },
  CHUNGNAM: { point: [246.5, 258.9], label: [194, 282] },
  SEJONG: { point: [286.9, 266.3], label: [118, 339] },
  DAEJEON: { point: [297.5, 284.1], label: [226, 376] },
  GYEONGBUK: { point: [431.5, 253.9], label: [504, 279] },
  JEONBUK: { point: [283.7, 352.8], label: [310, 390] },
  DAEGU: { point: [405.8, 338], label: [439, 371] },
  ULSAN: { point: [459.9, 372.3], label: [577, 403] },
  GYEONGNAM: { point: [353.8, 390.9], label: [377, 465] },
  GWANGJU: { point: [250.9, 415.5], label: [125, 446] },
  JEONNAM: { point: [260, 469], label: [250, 513] },
  BUSAN: { point: [453.1, 407.2], label: [527, 497] },
  JEJU: { point: [222.9, 610.8], label: [314, 612] },
}

export function TelemapMap({
  clusters,
  colors,
  region,
  loading,
  onRegionChange,
  onClusterSelect,
}: {
  clusters: TelemapCluster[]
  colors: Map<string, string>
  region: TelemapRegion | null
  loading: boolean
  onRegionChange: (region: TelemapRegion | null) => void
  onClusterSelect: (cluster: TelemapCluster) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(0)
  const [hovered, setHovered] = useState<TelemapRegion | null>(null)
  const [{ zoom, pan }, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{
    x: number
    y: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const suppressClick = useRef(false)
  const mapId = useId()
  useEffect(() => {
    if (!canvasRef.current) return
    const observer = new ResizeObserver(([entry]) => setCanvasWidth(entry.contentRect.width))
    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [])
  const regionalClusters = (item: TelemapRegion) =>
    clusters.filter((cluster) => cluster.region === item && cluster.questionCount > 0)
  const layout = layoutTelemapPlaces(
    (Object.keys(positions) as TelemapRegion[])
      .filter((item) => regionalClusters(item).length)
      .map((item) => ({
        region: item,
        anchor: positions[item].label,
        markerCount: regionalClusters(item).length,
      })),
    canvasWidth || 720,
    Object.values(positions).map(({ point }) => point),
  )
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return
      event.preventDefault()
      const box = canvas.getBoundingClientRect()
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.height : 1)
      const pointer = {
        x: event.clientX - box.left - box.width / 2,
        y: event.clientY - box.top - box.height / 2,
      }
      setView((current) => {
        const next = Math.max(
          1,
          Math.min(3, current.zoom * Math.exp(-Math.max(-400, Math.min(400, delta)) * 0.0018)),
        )
        const ratio = next / current.zoom
        const x = pointer.x - (pointer.x - current.pan.x) * ratio
        const y = pointer.y - (pointer.y - current.pan.y) * ratio
        return {
          zoom: next,
          pan: {
            x: Math.max((-box.width * (next - 1)) / 2, Math.min((box.width * (next - 1)) / 2, x)),
            y: Math.max((-box.height * (next - 1)) / 2, Math.min((box.height * (next - 1)) / 2, y)),
          },
        }
      })
    }
    // 지도 위 휠은 페이지 스크롤 대신 포인터 위치를 기준으로 확대·축소합니다.
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => canvas.removeEventListener('wheel', wheel)
  }, [])
  const selectRegion = (item: TelemapRegion, fromKeyboard = false) => {
    if (fromKeyboard || !suppressClick.current) onRegionChange(region === item ? null : item)
  }
  const limitPan = (x: number, y: number, scale = zoom) => ({
    x: Math.max((-canvasWidth * (scale - 1)) / 2, Math.min((canvasWidth * (scale - 1)) / 2, x)),
    y: Math.max((-layout.height * (scale - 1)) / 2, Math.min((layout.height * (scale - 1)) / 2, y)),
  })
  const changeZoom = (next: number) => {
    const scale = Math.max(1, Math.min(3, next))
    setView((current) => ({ zoom: scale, pan: limitPan(current.pan.x, current.pan.y, scale) }))
  }
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false
    if (zoom <= 1 || event.button !== 0 || (event.target as Element).closest('button')) return
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      startX: pan.x,
      startY: pan.y,
      moved: false,
    }
  }
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    if (!drag.current.moved && Math.hypot(dx, dy) < 5) return
    drag.current.moved = true
    suppressClick.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    setHovered(null)
    const nextPan = limitPan(drag.current.startX + dx, drag.current.startY + dy)
    setView((current) => ({ ...current, pan: nextPan }))
  }
  const endDrag = () => {
    drag.current = null
    setDragging(false)
  }
  // 선택한 도형을 마지막에 그려 인접 지역 위로 올라오게 합니다.
  const territories = [
    ...provincePaths.filter((item) => item.region !== region),
    ...provincePaths.filter((item) => item.region === region),
  ]
  return (
    <div className="telemap-map" aria-busy={loading}>
      <div className="telemap-map__heading">
        <div>
          <h2>
            대한민국 <span>시·도별 질문 분포</span>
          </h2>
          <p>지역에 마우스를 올려보세요. 클릭한 지역은 색상으로 표시합니다.</p>
        </div>
        {region && (
          <button
            className="telemap-text-button"
            type="button"
            onClick={() => onRegionChange(null)}
          >
            전국 보기
          </button>
        )}
      </div>
      <div className="telemap-map__controls" role="group" aria-label="지도 확대 및 축소">
        <span>휠로 확대·축소 · 드래그로 이동</span>
        <button
          type="button"
          aria-label="지도 축소"
          disabled={zoom === 1}
          onClick={() => changeZoom(zoom - 0.25)}
        >
          −
        </button>
        <output aria-label="지도 배율">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          aria-label="지도 확대"
          disabled={zoom === 3}
          onClick={() => changeZoom(zoom + 0.25)}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            setView({ zoom: 1, pan: { x: 0, y: 0 } })
          }}
        >
          원래 크기
        </button>
      </div>
      <div
        ref={canvasRef}
        className={`telemap-map__canvas${layout.compact ? ' is-compact' : ''}${zoom > 1 ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}`}
        style={canvasWidth ? { height: layout.height } : undefined}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div
          className="telemap-map__stage"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <svg
            viewBox="0 0 720 680"
            aria-label="대한민국 17개 시·도 지도"
            className="telemap-map__boundaries"
            role="img"
            focusable="false"
          >
            <defs>
              {provincePaths.map(({ region: code, path }) => (
                <path key={code} id={`${mapId}-${code}`} d={path} fillRule="evenodd" />
              ))}
            </defs>
            {territories.map(({ region: code }) => {
              const item = code as TelemapRegion
              return (
                <g
                  key={item}
                  data-region={item}
                  className={`telemap-map__territory${region === item ? ' is-selected' : ''}${hovered === item ? ' is-raised' : ''}`}
                  aria-hidden="true"
                  onPointerEnter={() => !dragging && setHovered(item)}
                  onPointerLeave={() => setHovered(null)}
                >
                  <use
                    href={`#${mapId}-${code}`}
                    className="telemap-map__hit-area"
                    onClick={() => selectRegion(item)}
                  />
                  <use href={`#${mapId}-${code}`} className="telemap-map__depth" />
                  <use href={`#${mapId}-${code}`} className="telemap-map__province" />
                </g>
              )
            })}
            {Object.entries(positions).map(([code, { point }]) => {
              const place = layout.places.get(code as TelemapRegion)!
              if (!place) return null
              return (
                <line
                  key={code}
                  x1={point[0]}
                  y1={point[1] - (hovered === code ? 7 : 0)}
                  x2={(place.x - layout.offsetX) / layout.scale}
                  y2={(place.y - place.height / 2 - layout.offsetY) / layout.scale}
                  className="telemap-map__leader"
                />
              )
            })}
          </svg>
          {(Object.keys(positions) as TelemapRegion[]).map((item) => (
            <button
              key={`label-${item}`}
              className={`telemap-map__label${region === item ? ' is-selected' : ''}`}
              data-region={item}
              style={{
                left: `${((layout.offsetX + positions[item].point[0] * layout.scale) / (canvasWidth || 720)) * 100}%`,
                top: `${((layout.offsetY + (positions[item].point[1] - (hovered === item ? 7 : 0)) * layout.scale) / layout.height) * 100}%`,
              }}
              onClick={(event) => selectRegion(item, event.detail === 0)}
              onPointerEnter={() => setHovered(item)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(item)}
              onBlur={() => setHovered(null)}
              type="button"
              aria-label={`${telemapRegionLabel[item]} 지역 선택`}
              aria-pressed={region === item}
            >
              {telemapRegionLabel[item]}
            </button>
          ))}
          {(Object.keys(positions) as TelemapRegion[]).map((item) => {
            const regional = regionalClusters(item)
            const place = layout.places.get(item)!
            if (!place) return null
            return (
              <div
                key={item}
                className={`telemap-map__place${region === item ? ' is-selected' : ''}`}
                data-region={item}
                style={{
                  left: `${(place.x / (canvasWidth || 720)) * 100}%`,
                  top: `${(place.y / layout.height) * 100}%`,
                  width: place.width,
                  height: place.height,
                }}
              >
                {!!regional.length && (
                  <div className="telemap-map__markers">
                    {regional.slice(0, layout.markerLimit).map((cluster) => (
                      <button
                        key={cluster.key}
                        type="button"
                        className="telemap-map__marker"
                        style={
                          { '--subject-color': colors.get(cluster.subjectKey) } as CSSProperties
                        }
                        aria-label={`${telemapRegionLabel[item]} · ${cluster.subject} · 질문 ${cluster.questionCount.toLocaleString('ko-KR')}건 상세 보기`}
                        title={`${cluster.subject} · 질문 ${cluster.questionCount.toLocaleString('ko-KR')}건 / 알림 ${cluster.alerts.length}건`}
                        onClick={() => onClusterSelect(cluster)}
                      >
                        {telemapMarkerCount(cluster.questionCount)}
                      </button>
                    ))}
                    {regional.length > layout.markerLimit && (
                      <button
                        className="telemap-map__more"
                        type="button"
                        aria-label={`${telemapRegionLabel[item]} 나머지 ${regional.length - layout.markerLimit}개 주제 보기`}
                        title={`${regional.length - layout.markerLimit}개 주제 더 보기`}
                        onClick={() => onRegionChange(item)}
                      >
                        {regional.length - layout.markerLimit > 99
                          ? '99+'
                          : `+${regional.length - layout.markerLimit}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="telemap-map__footnote">
        <span>마커 숫자 = 같은 시·도·주제 알림의 질문 수 합계 · 큰 수는 축약 표시</span>
        <a href="https://github.com/KnellBalm/kr-admin-geojson" target="_blank" rel="noreferrer">
          지도 출처: 국가공간정보포털 · 2023 경계
        </a>
      </div>
    </div>
  )
}
