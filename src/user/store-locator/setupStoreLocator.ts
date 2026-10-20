import {
  getMapClusters,
  getMapStores,
  getSidos,
  getSigungus,
  getStorePage,
  searchLocations,
} from './api/stores'
import { bubblePanOffset } from './bubblePlacement'
import { createDirectionsController } from './directions/setupStoreDirections'
import { kakaoMapPlaceUrl } from './kakao/links'
import { loadKakaoMaps } from './kakao/sdk'
import { createClusterMarkerImage, createNumberedMarkerImage } from './presentation/markerImages'
import { buildStoreBubble, clamp } from './presentation/storeElements'
import { renderStoreList } from './presentation/storeList'
import { locatorQuery, type LocatorScope } from './scope'
import type {
  KakaoCustomOverlay,
  KakaoEventHandler,
  KakaoLatLng,
  KakaoMap,
  KakaoMapsApi,
  KakaoMarker,
} from './types/kakao'
import type { MapCluster, PageResponse, Store, StoreSearchResult } from './types/store'

const DEFAULT_LOCATION = {
  latitude: 37.497942,
  longitude: 127.027621,
  label: '서울 강남구 역삼동',
}

const KOREA_MAP_LIMIT = {
  minLatitude: 33,
  maxLatitude: 39,
  minLongitude: 124,
  maxLongitude: 132,
  minLevel: 1,
  maxLevel: 13,
}

const STORE_PAGE_SIZE = 20
const MAP_LIST_LIMIT = 50
const SERVER_CLUSTER_MIN_LEVEL = 8
// 클러스터 마커 zIndex가 10 + 매장 수(최대 1010)까지 올라가므로 그보다 위에 둔다.
const STORE_BUBBLE_Z = 2000
// CSS의 .store-map-info { bottom: 58px }와 같은 값: 매장 마커 높이(48px) + 꼬리와 여백.
const STORE_BUBBLE_GAP_PX = 58
const STORE_BUBBLE_EDGE_PX = 12

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
}

export interface StoreLocatorController {
  // 채팅 답변의 매장 조회 결과를 목록과 지도에 그린다.
  showResult(result: StoreSearchResult): void
  // 목록의 매장을 골라 말풍선을 띄운다. 그리는 중인 결과가 있으면 다 그린 뒤에 고른다.
  focusStore(storeId: number): void
  // 현재 위치(확인할 수 없으면 기본 위치) 주변 매장을 조회한다.
  showNearby(): void
  // 지도를 담은 영역이 숨겨졌다가 다시 보일 때 크기를 다시 잰다.
  relayout(): void
  dispose(): void
}

const NOOP_CONTROLLER: StoreLocatorController = {
  showResult: () => {},
  focusStore: () => {},
  showNearby: () => {},
  relayout: () => {},
  dispose: () => {},
}

// page: 매장 찾기 페이지. 페이지에 들어오면 기본 위치 주변을 조회한다.
// drawer: 채팅 지도 드로어. 채팅 답변의 결과를 받을 때만 조회 결과를 그린다.
export type StoreLocatorMode = 'page' | 'drawer'

export function setupStoreLocator(
  scope: LocatorScope,
  { mode = 'page' }: { mode?: StoreLocatorMode } = {},
): StoreLocatorController {
  const byId = locatorQuery(scope)
  const mapElement = byId('storeKakaoMap')
  const listElement = byId('storeListItems')
  const searchInput = byId<HTMLInputElement>('storeSearchInput')
  const searchButton = byId<HTMLButtonElement>('storeSearchButton')
  const locationButton = byId<HTMLButtonElement>('storeCurrentLocation')
  const sidoSelect = byId<HTMLSelectElement>('storeSido')
  const sigunguSelect = byId<HTMLSelectElement>('storeSigungu')
  const serviceTypeInputs = [
    ...scope.root.querySelectorAll<HTMLInputElement>('input[name="storeServiceType"]'),
  ]
  const serviceToggle = byId<HTMLButtonElement>('storeServiceToggle')
  const servicePanel = byId('storeServicePanel')
  const serviceSummary = byId('storeServiceSummary')
  const regionSearchButton = byId<HTMLButtonElement>('storeRegionSearchButton')
  const statusElement = byId('storeSearchStatus')
  const countElement = byId('storeResultCount')
  const paginationElement = byId('storePagination')
  const pageInfoElement = byId('storePageInfo')
  const prevPageButton = byId<HTMLButtonElement>('storePrevPage')
  const nextPageButton = byId<HTMLButtonElement>('storeNextPage')
  const viewportSearchButton = byId<HTMLButtonElement>('storeViewportSearch')
  const mapLinkElement = byId<HTMLAnchorElement>('kakaoMapLink')
  const resultBarElement = mapLinkElement?.closest<HTMLElement>('.store-result-bar') ?? null
  const listReserveButton = scope.root.querySelector<HTMLButtonElement>(
    '.stores-list .reserve-main',
  )

  if (
    !mapElement ||
    !listElement ||
    !searchInput ||
    !searchButton ||
    !statusElement ||
    !countElement
  )
    return NOOP_CONTROLLER

  let maps: KakaoMapsApi | null = null
  let map: KakaoMap | null = null
  let storeBubble: KakaoCustomOverlay | null = null
  let bubbleFrameId: number | undefined

  const closeStoreBubble = () => {
    storeBubble?.setMap(null)
    storeBubble = null
  }
  let markers: Array<{
    storeId: number | string
    marker: KakaoMarker
    clickHandler: KakaoEventHandler
  }> = []
  let stores: Store[] = []
  let selectedStoreId: number | null = null
  let viewportRequestId = 0
  let viewportAbortController: AbortController | null = null
  let lastViewportRequestKey = ''
  let mapInitPromise: Promise<KakaoMap> | null = null
  let suppressViewportUntil = 0
  let pendingClusterSearchHandler: KakaoEventHandler | null = null
  let currentRegionPage = 0
  let regionSearchActive = false
  let disposed = false
  let renderedMapMode: 'clusters' | 'stores' | null = null
  let routeTimerId: number | undefined
  let clusterFrameId: number | undefined
  let mapInitFrameId: number | undefined
  let mapIdleHandler: KakaoEventHandler | null = null
  let mapClickHandler: KakaoEventHandler | null = null
  let directionsActive = false
  let viewBeforeDirections: { center: KakaoLatLng; level: number } | null = null
  let routeLinkUrl: string | null = null

  const showMapLink = (url: string | null) => {
    if (!mapLinkElement) return
    if (url) mapLinkElement.href = url
    else mapLinkElement.removeAttribute('href')
    mapLinkElement.hidden = !url
    resultBarElement?.classList.toggle('with-map-link', Boolean(url))
  }

  // 카카오맵 링크: 길찾기 중엔 경로, 아니면 선택한 매장, 선택이 없으면 지금 보고 있는 지도 중심을 연다.
  const updateMapLink = () => {
    if (directionsActive) {
      showMapLink(routeLinkUrl)
      return
    }
    const selected = stores.find((store) => store.storeId === selectedStoreId)
    if (selected) {
      showMapLink(
        kakaoMapPlaceUrl({
          name: selected.storeName,
          latitude: selected.latitude,
          longitude: selected.longitude,
        }),
      )
      return
    }
    if (!map) {
      showMapLink(null)
      return
    }
    const center = map.getCenter()
    showMapLink(
      kakaoMapPlaceUrl({
        name: '지도 중심',
        latitude: center.getLat(),
        longitude: center.getLng(),
      }),
    )
  }

  const setStoreMarkersVisible = (visible: boolean) => {
    markers.forEach(({ marker }) => marker.setMap(visible ? map : null))
  }

  const enterDirections = () => {
    directionsActive = true
    routeLinkUrl = null
    updateMapLink()
    closeStoreBubble()
    hideViewportSearch()
    setStoreMarkersVisible(false)
    if (map) viewBeforeDirections = { center: map.getCenter(), level: map.getLevel() }
  }

  const exitDirections = () => {
    directionsActive = false
    routeLinkUrl = null
    updateMapLink()
    setStoreMarkersVisible(true)
    if (map && viewBeforeDirections) {
      suppressViewportUntil = Date.now() + 800
      map.setLevel(viewBeforeDirections.level)
      map.setCenter(viewBeforeDirections.center)
    }
    viewBeforeDirections = null
    const selected = stores.find((store) => store.storeId === selectedStoreId)
    if (selected) selectStore(selected, { moveMap: false })
  }

  const getDirectionsOrigin = (): Promise<{ latitude: number; longitude: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저에서는 현재 위치를 사용할 수 없습니다.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        () => reject(new Error('현재 위치를 확인할 수 없습니다.')),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      )
    })

  const directionsController = createDirectionsController({
    scope,
    getMap: () => map,
    getMaps: () => maps,
    getOrigin: getDirectionsOrigin,
    onEnter: enterDirections,
    onExit: exitDirections,
    onRouteLink: (url) => {
      routeLinkUrl = url
      updateMapLink()
    },
  })

  const showViewportSearch = () => {
    if (viewportSearchButton) viewportSearchButton.hidden = false
  }

  const hideViewportSearch = () => {
    if (viewportSearchButton) viewportSearchButton.hidden = true
  }

  const keepMapInsideKorea = () => {
    if (!map || !maps) return false
    const center = map.getCenter()
    const latitude = clamp(
      center.getLat(),
      KOREA_MAP_LIMIT.minLatitude,
      KOREA_MAP_LIMIT.maxLatitude,
    )
    const longitude = clamp(
      center.getLng(),
      KOREA_MAP_LIMIT.minLongitude,
      KOREA_MAP_LIMIT.maxLongitude,
    )
    if (latitude === center.getLat() && longitude === center.getLng()) return false

    map.setCenter(new maps.LatLng(latitude, longitude))
    return true
  }

  const setStatus = (message: string, isError = false) => {
    statusElement.textContent = message
    statusElement.classList.toggle('error', isError)
  }

  const getSelectedServices = () =>
    serviceTypeInputs
      .filter((input) => input.checked)
      .map((input) => ({
        code: input.value,
        label: input.nextElementSibling?.textContent || input.value,
      }))

  const updateServiceSummary = () => {
    const selectedServices = getSelectedServices()
    if (!serviceSummary) return
    if (!selectedServices.length) serviceSummary.textContent = '전체 서비스'
    else if (selectedServices.length === 1) serviceSummary.textContent = selectedServices[0].label
    else serviceSummary.textContent = `${selectedServices.length}개 서비스 선택`
  }

  const closeServicePanel = () => {
    if (!servicePanel || !serviceToggle) return
    servicePanel.hidden = true
    serviceToggle.setAttribute('aria-expanded', 'false')
  }

  const toggleServicePanel = () => {
    if (!servicePanel || !serviceToggle) return
    const shouldOpen = servicePanel.hidden
    servicePanel.hidden = !shouldOpen
    serviceToggle.setAttribute('aria-expanded', String(shouldOpen))
  }

  const selectedServiceCodes = () => getSelectedServices().map(({ code }) => code)

  const replaceSelectOptions = (
    select: HTMLSelectElement | null,
    placeholder: string,
    values: string[],
  ) => {
    if (!select) return
    const options = [new Option(placeholder, '')]
    values.forEach((value) => options.push(new Option(value, value)))
    select.replaceChildren(...options)
  }

  const loadSigungus = async (sido: string) => {
    if (!sigunguSelect) return
    replaceSelectOptions(sigunguSelect, '전체 시/군/구', [])
    sigunguSelect.disabled = !sido
    if (!sido) return

    try {
      const values = await getSigungus(sido)
      if (disposed) return
      replaceSelectOptions(sigunguSelect, '전체 시/군/구', values)
      sigunguSelect.disabled = false
    } catch (error) {
      sigunguSelect.disabled = true
      setStatus(`시/군/구 목록 조회 실패: ${errorMessage(error)}`, true)
    }
  }

  const loadSidos = async () => {
    if (!sidoSelect) return
    sidoSelect.disabled = true
    try {
      const values = await getSidos()
      if (disposed) return
      replaceSelectOptions(sidoSelect, '전체 시/도', values)
      sidoSelect.disabled = false
    } catch (error) {
      setStatus(`시/도 목록 조회 실패: ${errorMessage(error)}`, true)
    }
  }

  const clearMarkers = () => {
    markers.forEach(({ marker, clickHandler }) => {
      maps?.event.removeListener(marker, 'click', clickHandler)
      marker.setMap(null)
    })
    markers = []
    closeStoreBubble()
  }

  const clearStoreSelection = () => {
    selectedStoreId = null
    closeStoreBubble()
    listElement.querySelectorAll('[data-store-id].active').forEach((button) => {
      button.classList.remove('active')
    })
    updateMapLink()
  }

  const selectStore = (store: Store, { moveMap = true }: { moveMap?: boolean } = {}) => {
    selectedStoreId = store.storeId
    listElement.querySelectorAll<HTMLElement>('[data-store-id]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.storeId) === store.storeId)
    })
    updateMapLink()

    document.dispatchEvent(
      new CustomEvent('ubot:store-selected', {
        detail: { id: store.storeId, name: store.storeName },
      }),
    )

    const markerEntry = markers.find((entry) => entry.storeId === store.storeId)
    if (!map || !maps || !markerEntry) return

    const position = markerEntry.marker.getPosition()
    closeStoreBubble()
    const content = buildStoreBubble(store, {
      onDirections: () => directionsController.openForStore(store),
      // 목록 하단의 '선택한 매장 방문 예약'과 똑같이 동작하도록 그 버튼을 대신 누른다.
      onReserve: () => listReserveButton?.click(),
    })
    storeBubble = new maps.CustomOverlay({
      position,
      content,
      xAnchor: 0.5,
      yAnchor: 1,
      zIndex: STORE_BUBBLE_Z,
      clickable: true,
    })
    storeBubble.setMap(map)

    // 말풍선 크기는 화면에 붙은 뒤에야 잴 수 있어서 다음 프레임에 지도를 옮긴다.
    // 목록에서 고른 경우(moveMap)엔 '가운데로 옮긴 뒤' 기준으로 넘침을 계산해 한 번에 이동한다.
    const currentMap = map
    if (bubbleFrameId !== undefined) window.cancelAnimationFrame(bubbleFrameId)
    bubbleFrameId = window.requestAnimationFrame(() => {
      if (disposed || !storeBubble) return
      const marker = currentMap.getProjection().containerPointFromCoords(position)
      const mapWidth = mapElement.clientWidth
      const mapHeight = mapElement.clientHeight
      const shift = bubblePanOffset({
        marker: { x: marker.x, y: marker.y },
        desired: moveMap ? { x: mapWidth / 2, y: mapHeight / 2 } : { x: marker.x, y: marker.y },
        bubbleWidth: content.offsetWidth,
        bubbleHeight: content.offsetHeight,
        gap: STORE_BUBBLE_GAP_PX,
        mapWidth,
        mapHeight,
        padding: STORE_BUBBLE_EDGE_PX,
      })
      if (Math.abs(shift.x) < 1 && Math.abs(shift.y) < 1) return
      // 마커를 눌러 말풍선만 맞추는 이동은 사용자가 지도를 옮긴 게 아니라 '이 지역 검색'을 띄우지 않는다.
      if (!moveMap) suppressViewportUntil = Date.now() + 800
      currentMap.panBy(shift.x, shift.y)
    })
  }

  const renderList = (
    nextStores: Store[],
    options: { total?: number; numberOffset?: number } = {},
  ) => {
    stores = nextStores
    renderStoreList(
      { listElement, countElement, selectedServices: getSelectedServices(), selectStore },
      nextStores,
      options,
    )
  }

  const renderMarkers = (
    nextStores: Store[],
    { numberOffset = 0 }: { numberOffset?: number } = {},
  ) => {
    if (!map || !maps) return
    const currentMap = map
    const currentMaps = maps
    clearMarkers()

    nextStores.forEach((store, index) => {
      const position = new currentMaps.LatLng(store.latitude, store.longitude)
      const marker = new currentMaps.Marker({
        position,
        title: store.storeName,
        image: createNumberedMarkerImage(maps, numberOffset + index + 1),
      })
      const clickHandler = () => selectStore(store, { moveMap: false })
      currentMaps.event.addListener(marker, 'click', clickHandler)
      markers.push({ storeId: store.storeId, marker, clickHandler })
    })

    if (directionsActive) return
    markers.forEach(({ marker }) => marker.setMap(currentMap))

    if (selectedStoreId) {
      const selected = nextStores.find((store) => store.storeId === selectedStoreId)
      if (selected) selectStore(selected, { moveMap: false })
    }
  }

  const renderPagination = (pageData: PageResponse<Store> | null) => {
    if (!paginationElement || !pageInfoElement || !prevPageButton || !nextPageButton) return
    if (!pageData || pageData.totalPages <= 1) {
      paginationElement.hidden = true
      return
    }

    paginationElement.hidden = false
    pageInfoElement.textContent = `${pageData.page + 1} / ${pageData.totalPages}`
    prevPageButton.disabled = pageData.first
    nextPageButton.disabled = pageData.last
  }

  const renderClusterSummary = (total: number) => {
    stores = []
    selectedStoreId = null
    listElement.replaceChildren()
    countElement.textContent = `${total}곳`

    const guide = document.createElement('p')
    guide.className = 'store-list-empty'
    guide.textContent = '파란 클러스터를 선택하거나 지도를 확대하면 개별 매장을 확인할 수 있습니다.'
    listElement.appendChild(guide)
  }

  const renderServerClusters = (clusters: MapCluster[]) => {
    if (!map || !maps) return 0
    const currentMap = map
    const currentMaps = maps
    clearMarkers()

    clusters.forEach((cluster, index) => {
      const marker = new currentMaps.Marker({
        map: directionsActive ? undefined : currentMap,
        position: new currentMaps.LatLng(cluster.latitude, cluster.longitude),
        title: `매장 ${cluster.count}곳`,
        image: createClusterMarkerImage(maps, cluster.count),
        zIndex: 10 + Math.min(cluster.count, 1_000),
      })
      const clickHandler = () => {
        if (pendingClusterSearchHandler) {
          currentMaps.event.removeListener(currentMap, 'idle', pendingClusterSearchHandler)
        }

        const searchAfterMove = () => {
          currentMaps.event.removeListener(currentMap, 'idle', searchAfterMove)
          pendingClusterSearchHandler = null
          clusterFrameId = window.requestAnimationFrame(() => {
            void loadStoresInView()
          })
        }
        pendingClusterSearchHandler = searchAfterMove
        currentMaps.event.addListener(currentMap, 'idle', searchAfterMove)
        suppressViewportUntil = Date.now() + 800
        const nextLevel = Math.max(KOREA_MAP_LIMIT.minLevel, currentMap.getLevel() - 2)

        currentMap.setLevel(nextLevel)
        currentMap.setCenter(marker.getPosition())
      }
      currentMaps.event.addListener(marker, 'click', clickHandler)
      markers.push({ storeId: `cluster-${index}`, marker, clickHandler })
    })

    return clusters.length
  }

  const loadStoresInView = async () => {
    if (!map) return

    const bounds = map.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    const level = map.getLevel()
    const shouldUseClusters = level >= SERVER_CLUSTER_MIN_LEVEL
    const boundsQuery = {
      swLat: clamp(sw.getLat(), KOREA_MAP_LIMIT.minLatitude, KOREA_MAP_LIMIT.maxLatitude),
      swLng: clamp(sw.getLng(), KOREA_MAP_LIMIT.minLongitude, KOREA_MAP_LIMIT.maxLongitude),
      neLat: clamp(ne.getLat(), KOREA_MAP_LIMIT.minLatitude, KOREA_MAP_LIMIT.maxLatitude),
      neLng: clamp(ne.getLng(), KOREA_MAP_LIMIT.minLongitude, KOREA_MAP_LIMIT.maxLongitude),
      types: selectedServiceCodes(),
    }
    const requestKey = `${shouldUseClusters ? 'clusters' : 'stores'}:${level}:${JSON.stringify(boundsQuery)}`
    if (requestKey === lastViewportRequestKey) {
      hideViewportSearch()
      return
    }

    lastViewportRequestKey = requestKey
    hideViewportSearch()
    if (viewportSearchButton) viewportSearchButton.disabled = true
    viewportAbortController?.abort()
    const requestController = new AbortController()
    viewportAbortController = requestController
    const requestId = ++viewportRequestId
    setStatus('현재 지도 영역의 매장을 찾고 있습니다.')

    try {
      if (shouldUseClusters) {
        const clusters = await getMapClusters(boundsQuery, level, requestController.signal)
        if (disposed || requestId !== viewportRequestId) return
        const total = clusters.reduce((sum, cluster) => sum + cluster.count, 0)
        regionSearchActive = false
        renderPagination(null)
        renderClusterSummary(total)
        const displayedClusterCount = renderServerClusters(clusters)
        renderedMapMode = 'clusters'
        setStatus(
          `현재 지도 영역의 매장 ${total}곳을 ${displayedClusterCount}개 클러스터로 표시했습니다.`,
        )
        return
      }

      const center = map.getCenter()
      const nextStores = await getMapStores(
        boundsQuery,
        {
          latitude: clamp(
            center.getLat(),
            KOREA_MAP_LIMIT.minLatitude,
            KOREA_MAP_LIMIT.maxLatitude,
          ),
          longitude: clamp(
            center.getLng(),
            KOREA_MAP_LIMIT.minLongitude,
            KOREA_MAP_LIMIT.maxLongitude,
          ),
        },
        requestController.signal,
      )
      if (disposed || requestId !== viewportRequestId) return

      const sortedStores = [...nextStores].sort((a, b) => {
        const aDistance = typeof a.distanceKm === 'number' ? a.distanceKm : Infinity
        const bDistance = typeof b.distanceKm === 'number' ? b.distanceKm : Infinity
        return aDistance - bDistance || a.storeId - b.storeId
      })

      regionSearchActive = false
      renderPagination(null)
      renderList(sortedStores.slice(0, MAP_LIST_LIMIT), { total: sortedStores.length })
      renderMarkers(sortedStores)
      renderedMapMode = 'stores'
      const listNotice =
        sortedStores.length > MAP_LIST_LIMIT ? ` 목록에는 ${MAP_LIST_LIMIT}곳만 표시합니다.` : ''
      setStatus(`현재 지도 영역에서 매장 ${nextStores.length}곳을 찾았습니다.${listNotice}`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (requestId !== viewportRequestId) return
      lastViewportRequestKey = ''
      showViewportSearch()
      setStatus(`현재 지도 영역 매장 조회 실패: ${errorMessage(error)}`, true)
    } finally {
      if (viewportAbortController === requestController) {
        viewportAbortController = null
      }
      if (viewportSearchButton) viewportSearchButton.disabled = false
    }
  }

  const fitMapToStores = (nextStores: Store[]) => {
    if (!map || !maps || !nextStores.length) return
    const currentMap = map
    const currentMaps = maps

    suppressViewportUntil = Date.now() + 600
    if (nextStores.length === 1) {
      currentMap.setCenter(new currentMaps.LatLng(nextStores[0].latitude, nextStores[0].longitude))
      currentMap.setLevel(3)
      return
    }

    const bounds = new currentMaps.LatLngBounds()
    nextStores.forEach((store) => {
      bounds.extend(new currentMaps.LatLng(store.latitude, store.longitude))
    })
    currentMap.setBounds(bounds)
  }

  const ensureMap = (): Promise<KakaoMap> => {
    if (map) return Promise.resolve(map)
    if (mapInitPromise) return mapInitPromise

    setStatus('카카오 지도를 준비하고 있습니다.')
    mapInitPromise = loadKakaoMaps()
      .then((loadedMaps) => {
        maps = loadedMaps
        mapElement.replaceChildren()
        const createdMap = new loadedMaps.Map(mapElement, {
          center: new loadedMaps.LatLng(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
          level: 3,
        })
        map = createdMap
        createdMap.setMinLevel(KOREA_MAP_LIMIT.minLevel)
        createdMap.setMaxLevel(KOREA_MAP_LIMIT.maxLevel)
        createdMap.addControl(new loadedMaps.ZoomControl(), loadedMaps.ControlPosition.RIGHT)
        mapIdleHandler = () => {
          if (directionsActive) return
          updateMapLink()
          if (Date.now() < suppressViewportUntil) return
          if (keepMapInsideKorea()) return

          const nextMode = createdMap.getLevel() >= SERVER_CLUSTER_MIN_LEVEL ? 'clusters' : 'stores'

          if (renderedMapMode === 'clusters' && nextMode === 'stores') {
            void loadStoresInView()
            return
          }

          showViewportSearch()
        }
        mapClickHandler = clearStoreSelection
        loadedMaps.event.addListener(createdMap, 'idle', mapIdleHandler)
        loadedMaps.event.addListener(createdMap, 'click', mapClickHandler)

        mapInitFrameId = window.requestAnimationFrame(() => {
          if (disposed) return
          suppressViewportUntil = Date.now() + 600
          createdMap.relayout()
          // 드로어는 채팅 결과를 직접 그리므로 기본 위치를 조회하지 않는다.
          if (mode === 'drawer') return
          createdMap.setCenter(
            new loadedMaps.LatLng(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
          )
          createdMap.setLevel(3)
          void loadStoresInView()
        })

        return createdMap
      })
      .catch((error) => {
        mapInitPromise = null
        mapElement.innerHTML = `<div class="stores-map-placeholder"></div>`
        const placeholder = mapElement.querySelector<HTMLElement>('.stores-map-placeholder')
        if (placeholder)
          placeholder.textContent = `${errorMessage(error)} .env.local에 카카오 JavaScript 키를 설정해 주세요.`
        throw error
      })

    return mapInitPromise
  }

  const focusMap = async (latitude: number, longitude: number, label: string) => {
    try {
      const currentMap = await ensureMap()
      if (!maps || disposed) return
      suppressViewportUntil = Date.now() + 600
      currentMap.relayout()
      currentMap.setCenter(new maps.LatLng(latitude, longitude))
      currentMap.setLevel(3)
      setStatus(`${label} 중심으로 현재 지도 영역의 매장을 찾고 있습니다.`)
      await loadStoresInView()
    } catch {
      // ensureMap already exposes the user-facing error in the map/status area.
    }
  }

  const searchLocation = async () => {
    const query = searchInput.value.trim()
    if (!query) {
      setStatus('검색할 주소나 지역명을 입력해 주세요.', true)
      return
    }

    directionsController.close()
    searchButton.disabled = true
    setStatus(`“${query}” 위치를 찾고 있습니다.`)
    try {
      const locations = await searchLocations(query)
      if (disposed) return
      const location = locations[0]
      if (!location) {
        setStatus('검색 결과가 없습니다. 다른 주소나 지역명을 입력해 주세요.', true)
        return
      }
      searchInput.value = location.roadAddress || location.address || location.name || query
      await focusMap(location.latitude, location.longitude, location.name || query)
    } catch (error) {
      setStatus(`지역 검색 실패: ${errorMessage(error)}`, true)
    } finally {
      searchButton.disabled = false
    }
  }

  const searchStoresByRegion = async (page = 0) => {
    const sido = sidoSelect?.value.trim() || ''
    const sigungu = sigunguSelect?.value.trim() || ''
    directionsController.close()
    viewportAbortController?.abort()
    viewportAbortController = null
    lastViewportRequestKey = ''
    viewportRequestId += 1
    suppressViewportUntil = Date.now() + 800
    if (regionSearchButton) regionSearchButton.disabled = true
    setStatus('선택한 지역의 매장을 찾고 있습니다.')

    try {
      await ensureMap()
      const pageData = await getStorePage(page, STORE_PAGE_SIZE, {
        sido,
        sigungu,
        types: selectedServiceCodes(),
      })
      if (disposed) return
      const nextStores = pageData.content
      currentRegionPage = pageData.page
      regionSearchActive = true
      selectedStoreId = null
      const numberOffset = currentRegionPage * STORE_PAGE_SIZE
      renderList(nextStores, { total: pageData.totalElements, numberOffset })
      renderMarkers(nextStores, { numberOffset })
      renderPagination(pageData)
      fitMapToStores(nextStores)

      const regionLabel = [sido, sigungu].filter(Boolean).join(' ') || '전체 지역'
      const selectedServices = getSelectedServices()
      const serviceLabel = selectedServices.length
        ? selectedServices.map(({ label }) => label).join(' + ')
        : '전체 서비스'
      setStatus(
        `${regionLabel} · ${serviceLabel} 조건으로 매장 ${pageData.totalElements}곳을 찾았습니다.`,
      )
    } catch (error) {
      setStatus(`지역별 매장 조회 실패: ${errorMessage(error)}`, true)
    } finally {
      if (regionSearchButton) regionSearchButton.disabled = false
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('이 브라우저에서는 현재 위치를 사용할 수 없습니다.', true)
      return
    }

    directionsController.close()
    if (locationButton) locationButton.disabled = true
    setStatus('현재 위치를 확인하고 있습니다.')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await focusMap(coords.latitude, coords.longitude, '현재 위치')
        } finally {
          if (locationButton) locationButton.disabled = false
        }
      },
      () => {
        if (locationButton) locationButton.disabled = false
        setStatus('위치 권한을 허용하면 현재 위치 주변 매장을 찾을 수 있습니다.', true)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }

  let resultRequestId = 0
  // 마지막 showResult가 지도에 다 그려지면 끝나는 작업. 실패해도 reject하지 않는다.
  let resultRendered: Promise<void> = Promise.resolve()

  const showResult = (result: StoreSearchResult) => {
    directionsController.close()
    viewportAbortController?.abort()
    viewportAbortController = null
    lastViewportRequestKey = ''
    viewportRequestId += 1
    regionSearchActive = false
    selectedStoreId = null
    hideViewportSearch()
    renderPagination(null)

    const requestId = ++resultRequestId
    const label = result.placeName ?? '현재 위치'
    const radius = `${result.radiusKm}km`
    searchInput.value = label
    renderList(result.stores)

    resultRendered = ensureMap()
      .then((currentMap) => {
        if (disposed || !maps || requestId !== resultRequestId) return
        const currentMaps = maps
        currentMap.relayout()
        renderMarkers(result.stores)
        renderedMapMode = 'stores'

        // 기준 위치도 화면에 들어오도록 매장들과 함께 범위를 잡는다.
        const center = new currentMaps.LatLng(result.center.latitude, result.center.longitude)
        suppressViewportUntil = Date.now() + 600
        if (result.stores.length) {
          const bounds = new currentMaps.LatLngBounds()
          bounds.extend(center)
          result.stores.forEach((store) =>
            bounds.extend(new currentMaps.LatLng(store.latitude, store.longitude)),
          )
          currentMap.setBounds(bounds)
        } else {
          currentMap.setCenter(center)
          currentMap.setLevel(5)
        }
        updateMapLink()
        setStatus(
          result.stores.length
            ? `${label} 기준 반경 ${radius} 안의 매장 ${result.stores.length}곳을 찾았습니다.`
            : `${label} 기준 반경 ${radius} 안에 매장이 없습니다. 지도를 옮긴 뒤 ‘이 지역 검색’을 눌러 보세요.`,
        )
      })
      .catch(() => {})
  }

  const focusStore = (storeId: number) => {
    const requestId = resultRequestId
    void resultRendered.then(() => {
      if (disposed || requestId !== resultRequestId) return
      const store = stores.find((item) => item.storeId === storeId)
      if (store) selectStore(store)
    })
  }

  const showNearby = () => {
    directionsController.close()
    const requestId = ++resultRequestId
    searchInput.value = ''
    const show = (latitude: number, longitude: number, label: string) => {
      if (disposed || requestId !== resultRequestId) return
      searchInput.value = label
      void focusMap(latitude, longitude, label)
    }
    const showDefault = () =>
      show(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.label)

    if (!navigator.geolocation) {
      showDefault()
      return
    }
    setStatus('현재 위치를 확인하고 있습니다.')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => show(coords.latitude, coords.longitude, '현재 위치'),
      showDefault,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    )
  }

  const relayout = () => {
    if (!map) return
    suppressViewportUntil = Date.now() + 600
    map.relayout()
  }

  const handleSearchKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') void searchLocation()
  }
  const handleViewportSearch = () => {
    void loadStoresInView()
  }
  const handleRegionSearch = () => {
    void searchStoresByRegion(0)
  }
  const handlePreviousPage = () => {
    if (regionSearchActive && currentRegionPage > 0)
      void searchStoresByRegion(currentRegionPage - 1)
  }
  const handleNextPage = () => {
    if (regionSearchActive) void searchStoresByRegion(currentRegionPage + 1)
  }
  const handleSidoChange = () => {
    if (sidoSelect) void loadSigungus(sidoSelect.value)
  }
  const handleDocumentClick = (event: MouseEvent) => {
    // 페이지와 드로어에 필터가 하나씩 있으므로, 이 화면의 필터 바깥을 눌렀을 때만 닫는다.
    const serviceFilter = serviceToggle?.closest('.store-service-filter')
    if (!(event.target instanceof Node) || !serviceFilter?.contains(event.target)) {
      closeServicePanel()
    }
  }
  const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeServicePanel()
  }
  const handleRouteChange = (event: Event) => {
    const routeEvent = event as CustomEvent<{ route?: string }>
    if (routeEvent.detail?.route !== 'stores') return
    window.clearTimeout(routeTimerId)
    routeTimerId = window.setTimeout(() => {
      void ensureMap()
        .then((currentMap) => {
          if (disposed) return
          currentMap.relayout()
          if (!stores.length) void loadStoresInView()
        })
        .catch(() => {})
    }, 80)
  }

  searchButton.addEventListener('click', searchLocation)
  searchInput.addEventListener('keydown', handleSearchKeydown)
  locationButton?.addEventListener('click', useCurrentLocation)
  viewportSearchButton?.addEventListener('click', handleViewportSearch)
  regionSearchButton?.addEventListener('click', handleRegionSearch)
  prevPageButton?.addEventListener('click', handlePreviousPage)
  nextPageButton?.addEventListener('click', handleNextPage)
  sidoSelect?.addEventListener('change', handleSidoChange)
  serviceToggle?.addEventListener('click', toggleServicePanel)
  serviceTypeInputs.forEach((input) => input.addEventListener('change', updateServiceSummary))
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
  if (mode === 'page') document.addEventListener('ubot:route-change', handleRouteChange)

  loadSidos()

  if (mode === 'drawer') {
    setStatus('채팅 답변의 매장 조회 결과를 기다리고 있습니다.')
  } else if (document.body.dataset.route === 'stores') {
    ensureMap().catch(() => {})
  } else {
    setStatus(
      `${DEFAULT_LOCATION.label}을 기본 위치로 사용합니다. 매장 찾기에 들어가면 현재 지도 영역의 매장을 조회합니다.`,
    )
  }

  const dispose = () => {
    disposed = true
    directionsController.dispose()
    viewportAbortController?.abort()
    window.clearTimeout(routeTimerId)
    if (clusterFrameId !== undefined) window.cancelAnimationFrame(clusterFrameId)
    if (mapInitFrameId !== undefined) window.cancelAnimationFrame(mapInitFrameId)
    if (bubbleFrameId !== undefined) window.cancelAnimationFrame(bubbleFrameId)
    if (maps && map && pendingClusterSearchHandler) {
      maps.event.removeListener(map, 'idle', pendingClusterSearchHandler)
    }
    if (maps && map && mapIdleHandler) maps.event.removeListener(map, 'idle', mapIdleHandler)
    if (maps && map && mapClickHandler) maps.event.removeListener(map, 'click', mapClickHandler)
    clearMarkers()
    closeStoreBubble()
    searchButton.removeEventListener('click', searchLocation)
    searchInput.removeEventListener('keydown', handleSearchKeydown)
    locationButton?.removeEventListener('click', useCurrentLocation)
    viewportSearchButton?.removeEventListener('click', handleViewportSearch)
    regionSearchButton?.removeEventListener('click', handleRegionSearch)
    prevPageButton?.removeEventListener('click', handlePreviousPage)
    nextPageButton?.removeEventListener('click', handleNextPage)
    sidoSelect?.removeEventListener('change', handleSidoChange)
    serviceToggle?.removeEventListener('click', toggleServicePanel)
    serviceTypeInputs.forEach((input) => input.removeEventListener('change', updateServiceSummary))
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('keydown', handleDocumentKeydown)
    document.removeEventListener('ubot:route-change', handleRouteChange)
  }

  return { showResult, focusStore, showNearby, relayout, dispose }
}
