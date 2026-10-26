import type { CSSProperties } from 'react'
import provincePaths from '../data/koreaProvinces.json'
import { telemapRegionLabel, type TelemapRegion } from '../types/telemap'
import type { TelemapCluster } from '../utils/clusters'

// 표시 위치를 수도권·충청권의 작은 경계 바깥으로 분산하고 실제 경계까지 선으로 연결합니다.
const positions: Record<TelemapRegion, { point: [number, number]; label: [number, number] }> = {
  SEOUL: { point: [263, 151], label: [125, 105] },
  INCHEON: { point: [240, 165], label: [94, 195] },
  GYEONGGI: { point: [282, 170], label: [302, 185] },
  GANGWON: { point: [376, 124], label: [396, 110] },
  CHUNGBUK: { point: [337, 258], label: [352, 246] },
  CHUNGNAM: { point: [257, 283], label: [194, 282] },
  SEJONG: { point: [290, 274], label: [118, 339] },
  DAEJEON: { point: [300, 294], label: [226, 376] },
  GYEONGBUK: { point: [426, 290], label: [456, 279] },
  JEONBUK: { point: [287, 369], label: [310, 390] },
  DAEGU: { point: [405, 353], label: [439, 371] },
  ULSAN: { point: [467, 380], label: [577, 403] },
  GYEONGNAM: { point: [372, 414], label: [377, 465] },
  GWANGJU: { point: [225, 418], label: [125, 446] },
  JEONNAM: { point: [250, 458], label: [250, 513] },
  BUSAN: { point: [445, 429], label: [527, 497] },
  JEJU: { point: [222, 610], label: [314, 612] },
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
  return (
    <div className="telemap-map" aria-busy={loading}>
      <div className="telemap-map__heading">
        <div>
          <h2>
            대한민국 <span>시·도별 질문 분포</span>
          </h2>
          <p>지역을 선택하거나 질문 마커를 눌러보세요.</p>
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
      <div className="telemap-map__canvas">
        <svg
          viewBox="0 0 720 680"
          aria-label="대한민국 17개 시·도 지도"
          className="telemap-map__boundaries"
          role="group"
        >
          {provincePaths.map(({ region: code, path }) => {
            const item = code as TelemapRegion
            return (
              <path
                key={item}
                d={path}
                fillRule="evenodd"
                role="button"
                tabIndex={0}
                className={`telemap-map__province${region === item ? ' is-selected' : ''}${region && region !== item ? ' is-muted' : ''}`}
                aria-label={`${telemapRegionLabel[item]} 지역 선택`}
                aria-pressed={region === item}
                onClick={() => onRegionChange(region === item ? null : item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onRegionChange(region === item ? null : item)
                  }
                }}
              >
                <title>{telemapRegionLabel[item]}</title>
              </path>
            )
          })}
          {Object.entries(positions).map(([code, { point, label }]) => (
            <line
              key={code}
              x1={point[0]}
              y1={point[1]}
              x2={label[0]}
              y2={label[1] - 10}
              className="telemap-map__leader"
            />
          ))}
        </svg>
        {(Object.keys(positions) as TelemapRegion[]).map((item) => {
          const regional = clusters.filter((cluster) => cluster.region === item)
          const { label } = positions[item]
          return (
            <div
              key={item}
              className={`telemap-map__place${region === item ? ' is-selected' : ''}${region && region !== item ? ' is-muted' : ''}`}
              style={{ left: `${label[0] / 7.2}%`, top: `${label[1] / 6.8}%` }}
            >
              <button
                className="telemap-map__label"
                onClick={() => onRegionChange(region === item ? null : item)}
                type="button"
                aria-pressed={region === item}
              >
                {telemapRegionLabel[item]}
                {!regional.length && !loading && <span>0</span>}
              </button>
              {!!regional.length && (
                <div className="telemap-map__markers">
                  {regional.slice(0, 3).map((cluster) => (
                    <button
                      key={cluster.key}
                      type="button"
                      className="telemap-map__marker"
                      style={{ '--subject-color': colors.get(cluster.subjectKey) } as CSSProperties}
                      aria-label={`${telemapRegionLabel[item]} · ${cluster.subject} · 질문 ${cluster.questionCount.toLocaleString('ko-KR')}건 상세 보기`}
                      title={`${cluster.subject} · 질문 ${cluster.questionCount.toLocaleString('ko-KR')}건 / 알림 ${cluster.alerts.length}건`}
                      onClick={() => onClusterSelect(cluster)}
                    >
                      {cluster.questionCount.toLocaleString('ko-KR')}
                    </button>
                  ))}
                  {regional.length > 3 && (
                    <button
                      className="telemap-map__more"
                      type="button"
                      aria-label={`${telemapRegionLabel[item]} 나머지 ${regional.length - 3}개 주제 보기`}
                      onClick={() => onRegionChange(item)}
                    >
                      +{regional.length - 3}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="telemap-map__footnote">
        <span>마커 숫자 = 같은 시·도·주제 알림의 질문 수 합계</span>
        <a href="https://github.com/KnellBalm/kr-admin-geojson" target="_blank" rel="noreferrer">
          지도 출처: 국가공간정보포털 · 2023 경계
        </a>
      </div>
    </div>
  )
}
