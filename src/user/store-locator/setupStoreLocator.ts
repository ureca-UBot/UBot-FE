import {
  getMapClusters,
  getMapStores,
  getSidos,
  getSigungus,
  getStorePage,
  searchLocations,
} from './api/stores';
import { createDirectionsController } from './directions/setupStoreDirections';
import { loadKakaoMaps } from './kakao/sdk';
import type {
  KakaoEventHandler,
  KakaoInfoWindow,
  KakaoMap,
  KakaoMapsApi,
  KakaoMarker,
} from './types/kakao';
import type { MapCluster, PageResponse, Store } from './types/store';

const DEFAULT_LOCATION = {
  latitude: 37.497942,
  longitude: 127.027621,
  label: '서울 강남구 역삼동',
};

const KOREA_MAP_LIMIT = {
  minLatitude: 33,
  maxLatitude: 39,
  minLongitude: 124,
  maxLongitude: 132,
  minLevel: 1,
  maxLevel: 13,
};

const STORE_PAGE_SIZE = 20;
const MAP_LIST_LIMIT = 50;
const SERVER_CLUSTER_MIN_LEVEL = 8;

function formatDistance(distanceKm?: number) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) return '';
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))}m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)}km`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

function buildInfoWindow(store: Store, onDirections: () => void) {
  const root = document.createElement('div');
  root.className = 'store-map-info';

  const name = document.createElement('strong');
  name.textContent = store.storeName;
  const address = document.createElement('span');
  address.textContent = store.address;
  const hours = document.createElement('small');
  hours.textContent = store.businessHours || '영업시간 정보 없음';
  const directionsButton = document.createElement('button');
  directionsButton.type = 'button';
  directionsButton.className = 'store-map-info-directions';
  directionsButton.textContent = '길찾기';
  directionsButton.addEventListener('click', onDirections);

  root.append(name, address, hours, directionsButton);
  return root;
}

export function setupStoreLocator(): () => void {
  const mapElement = document.querySelector<HTMLElement>('#storeKakaoMap');
  const listElement = document.querySelector<HTMLElement>('#storeListItems');
  const searchInput = document.querySelector<HTMLInputElement>('#storeSearchInput');
  const searchButton = document.querySelector<HTMLButtonElement>('#storeSearchButton');
  const locationButton = document.querySelector<HTMLButtonElement>('#storeCurrentLocation');
  const sidoSelect = document.querySelector<HTMLSelectElement>('#storeSido');
  const sigunguSelect = document.querySelector<HTMLSelectElement>('#storeSigungu');
  const serviceTypeInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="storeServiceType"]')];
  const serviceToggle = document.querySelector<HTMLButtonElement>('#storeServiceToggle');
  const servicePanel = document.querySelector<HTMLElement>('#storeServicePanel');
  const serviceSummary = document.querySelector<HTMLElement>('#storeServiceSummary');
  const regionSearchButton = document.querySelector<HTMLButtonElement>('#storeRegionSearchButton');
  const statusElement = document.querySelector<HTMLElement>('#storeSearchStatus');
  const countElement = document.querySelector<HTMLElement>('#storeResultCount');
  const paginationElement = document.querySelector<HTMLElement>('#storePagination');
  const pageInfoElement = document.querySelector<HTMLElement>('#storePageInfo');
  const prevPageButton = document.querySelector<HTMLButtonElement>('#storePrevPage');
  const nextPageButton = document.querySelector<HTMLButtonElement>('#storeNextPage');
  const viewportSearchButton = document.querySelector<HTMLButtonElement>('#storeViewportSearch');

  if (!mapElement || !listElement || !searchInput || !searchButton || !statusElement
    || !countElement) return () => {};

  let maps: KakaoMapsApi | null = null;
  let map: KakaoMap | null = null;
  let infoWindow: KakaoInfoWindow | null = null;
  let markers: Array<{ storeId: number | string; marker: KakaoMarker; clickHandler: KakaoEventHandler }> = [];
  let stores: Store[] = [];
  let selectedStoreId: number | null = null;
  let viewportRequestId = 0;
  let viewportAbortController: AbortController | null = null;
  let lastViewportRequestKey = '';
  let mapInitPromise: Promise<KakaoMap> | null = null;
  let suppressViewportUntil = 0;
  let pendingClusterSearchHandler: KakaoEventHandler | null = null;
  let currentRegionPage = 0;
  let regionSearchActive = false;
  let disposed = false;
  let renderedMapMode: 'clusters' | 'stores' | null = null;
  let routeTimerId: number | undefined;
  let clusterFrameId: number | undefined;
  let mapInitFrameId: number | undefined;
  let mapIdleHandler: KakaoEventHandler | null = null;
  let mapClickHandler: KakaoEventHandler | null = null;

  const getDirectionsOrigin = (): Promise<{ latitude: number; longitude: number }> => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저에서는 현재 위치를 사용할 수 없습니다.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('현재 위치 권한을 허용하면 길찾기를 이용할 수 있습니다.')),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });

  const directionsController = createDirectionsController({
    getMap: () => map,
    getMaps: () => maps,
    getOrigin: getDirectionsOrigin,
  });

  const showViewportSearch = () => {
    if (viewportSearchButton) viewportSearchButton.hidden = false;
  };

  const hideViewportSearch = () => {
    if (viewportSearchButton) viewportSearchButton.hidden = true;
  };

  const keepMapInsideKorea = () => {
    if (!map || !maps) return false;
    const center = map.getCenter();
    const latitude = clamp(
      center.getLat(),
      KOREA_MAP_LIMIT.minLatitude,
      KOREA_MAP_LIMIT.maxLatitude,
    );
    const longitude = clamp(
      center.getLng(),
      KOREA_MAP_LIMIT.minLongitude,
      KOREA_MAP_LIMIT.maxLongitude,
    );
    if (latitude === center.getLat() && longitude === center.getLng()) return false;

    map.setCenter(new maps.LatLng(latitude, longitude));
    return true;
  };

  const setStatus = (message: string, isError = false) => {
    statusElement.textContent = message;
    statusElement.classList.toggle('error', isError);
  };

  const getSelectedServices = () => serviceTypeInputs
    .filter((input) => input.checked)
    .map((input) => ({ code: input.value, label: input.nextElementSibling?.textContent || input.value }));

  const updateServiceSummary = () => {
    const selectedServices = getSelectedServices();
    if (!serviceSummary) return;
    if (!selectedServices.length) serviceSummary.textContent = '전체 서비스';
    else if (selectedServices.length === 1) serviceSummary.textContent = selectedServices[0].label;
    else serviceSummary.textContent = `${selectedServices.length}개 서비스 선택`;
  };

  const closeServicePanel = () => {
    if (!servicePanel || !serviceToggle) return;
    servicePanel.hidden = true;
    serviceToggle.setAttribute('aria-expanded', 'false');
  };

  const toggleServicePanel = () => {
    if (!servicePanel || !serviceToggle) return;
    const shouldOpen = servicePanel.hidden;
    servicePanel.hidden = !shouldOpen;
    serviceToggle.setAttribute('aria-expanded', String(shouldOpen));
  };

  const selectedServiceCodes = () => getSelectedServices().map(({ code }) => code);

  const replaceSelectOptions = (
    select: HTMLSelectElement | null,
    placeholder: string,
    values: string[],
  ) => {
    if (!select) return;
    const options = [new Option(placeholder, '')];
    values.forEach((value) => options.push(new Option(value, value)));
    select.replaceChildren(...options);
  };

  const loadSigungus = async (sido: string) => {
    if (!sigunguSelect) return;
    replaceSelectOptions(sigunguSelect, '전체 시/군/구', []);
    sigunguSelect.disabled = !sido;
    if (!sido) return;

    try {
      const values = await getSigungus(sido);
      if (disposed) return;
      replaceSelectOptions(sigunguSelect, '전체 시/군/구', values);
      sigunguSelect.disabled = false;
    } catch (error) {
      sigunguSelect.disabled = true;
      setStatus(`시/군/구 목록 조회 실패: ${errorMessage(error)}`, true);
    }
  };

  const loadSidos = async () => {
    if (!sidoSelect) return;
    sidoSelect.disabled = true;
    try {
      const values = await getSidos();
      if (disposed) return;
      replaceSelectOptions(sidoSelect, '전체 시/도', values);
      sidoSelect.disabled = false;
    } catch (error) {
      setStatus(`시/도 목록 조회 실패: ${errorMessage(error)}`, true);
    }
  };

  const clearMarkers = () => {
    markers.forEach(({ marker, clickHandler }) => {
      maps?.event.removeListener(marker, 'click', clickHandler);
      marker.setMap(null);
    });
    markers = [];
    infoWindow?.close();
  };

  const clearStoreSelection = () => {
    selectedStoreId = null;
    infoWindow?.close();
    listElement.querySelectorAll('[data-store-id].active').forEach((button) => {
      button.classList.remove('active');
    });
  };

  const createNumberedMarkerImage = (number: number) => {
    if (!maps) throw new Error('카카오 지도가 준비되지 않았습니다.');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="48" viewBox="0 0 42 48"><path d="M21 1C10.5 1 2 9.3 2 19.6c0 13 19 27.4 19 27.4s19-14.4 19-27.4C40 9.3 31.5 1 21 1Z" fill="#1677FF" stroke="white" stroke-width="2"/><circle cx="21" cy="19" r="11.5" fill="white"/><text x="21" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#1677FF">${number}</text></svg>`;
    const source = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    return new maps.MarkerImage(
      source,
      new maps.Size(42, 48),
      { offset: new maps.Point(21, 47) },
    );
  };

  const selectStore = (store: Store, { moveMap = true }: { moveMap?: boolean } = {}) => {
    selectedStoreId = store.storeId;
    listElement.querySelectorAll<HTMLElement>('[data-store-id]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.storeId) === store.storeId);
    });

    document.dispatchEvent(new CustomEvent('ubot:store-selected', {
      detail: { id: store.storeId, name: store.storeName },
    }));

    const markerEntry = markers.find((entry) => entry.storeId === store.storeId);
    if (!map || !markerEntry) return;

    if (moveMap) map.panTo(markerEntry.marker.getPosition());
    infoWindow?.setContent(buildInfoWindow(store, () => directionsController.openForStore(store)));
    infoWindow?.open(map, markerEntry.marker);
  };

  const renderList = (
    nextStores: Store[],
    { total = nextStores.length, numberOffset = 0 }: { total?: number; numberOffset?: number } = {},
  ) => {
    stores = nextStores;
    listElement.replaceChildren();
    countElement.textContent = `${total}곳`;

    if (!stores.length) {
      const empty = document.createElement('p');
      empty.className = 'store-list-empty';
      empty.textContent = '이 지역에서 조회된 매장이 없습니다.';
      listElement.appendChild(empty);
      return;
    }

    stores.forEach((store, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.storeId = String(store.storeId);
      button.dataset.store = store.storeName;

      const number = document.createElement('span');
      number.className = 'store-list-number';
      number.textContent = String(numberOffset + index + 1);
      const content = document.createElement('div');
      content.className = 'store-list-content';
      const titleRow = document.createElement('div');
      titleRow.className = 'store-list-title-row';
      const name = document.createElement('b');
      name.textContent = store.storeName;
      const distance = document.createElement('em');
      distance.textContent = formatDistance(store.distanceKm);
      titleRow.append(name, distance);
      const address = document.createElement('small');
      address.className = 'store-list-address';
      address.textContent = store.address;
      const meta = document.createElement('div');
      meta.className = 'store-list-meta';
      if (store.phoneNumber) {
        const phone = document.createElement('span');
        phone.textContent = `☎ ${store.phoneNumber}`;
        meta.appendChild(phone);
      }
      if (store.businessHours) {
        const hours = document.createElement('span');
        hours.textContent = `◷ ${store.businessHours}`;
        meta.appendChild(hours);
      }
      const badges = document.createElement('div');
      badges.className = 'store-list-badges';
      if (store.phoneNumber) {
        const badge = document.createElement('i');
        badge.textContent = '전화 문의';
        badges.appendChild(badge);
      }
      if (store.businessHours) {
        const badge = document.createElement('i');
        badge.textContent = '영업시간 안내';
        badges.appendChild(badge);
      }
      getSelectedServices().forEach((selectedService) => {
        const badge = document.createElement('i');
        badge.className = 'accent';
        badge.textContent = selectedService.label;
        badges.appendChild(badge);
      });
      content.append(titleRow, address);
      if (meta.childElementCount) content.appendChild(meta);
      if (badges.childElementCount) content.appendChild(badges);

      const arrow = document.createElement('span');
      arrow.className = 'store-list-arrow';
      arrow.textContent = '›';
      button.append(number, content, arrow);
      button.addEventListener('click', () => selectStore(store));
      listElement.appendChild(button);
    });
  };

  const renderMarkers = (
    nextStores: Store[],
    { numberOffset = 0 }: { numberOffset?: number } = {},
  ) => {
    if (!map || !maps) return;
    const currentMap = map;
    const currentMaps = maps;
    clearMarkers();

    nextStores.forEach((store, index) => {
      const position = new currentMaps.LatLng(store.latitude, store.longitude);
      const marker = new currentMaps.Marker({
        position,
        title: store.storeName,
        image: createNumberedMarkerImage(numberOffset + index + 1),
      });
      const clickHandler = () => selectStore(store, { moveMap: false });
      currentMaps.event.addListener(marker, 'click', clickHandler);
      markers.push({ storeId: store.storeId, marker, clickHandler });
    });

    markers.forEach(({ marker }) => marker.setMap(currentMap));

    if (selectedStoreId) {
      const selected = nextStores.find((store) => store.storeId === selectedStoreId);
      if (selected) selectStore(selected, { moveMap: false });
    }
  };

  const getClusterMarkerSize = (count: number) => {
    if (count <= 1) return 20;
    if (count <= 9) return 30;
    if (count <= 49) return 36;
    if (count <= 99) return 42;
    return 48;
  };

  const createClusterMarkerImage = (count: number) => {
    if (!maps) throw new Error('카카오 지도가 준비되지 않았습니다.');
    const size = getClusterMarkerSize(count);
    const center = size / 2;
    const radius = center - 3;
    const fontSize = clamp(Math.round(size * (count >= 1_000 ? 0.2 : 0.25)), 11, 16);
    const textY = center + fontSize * 0.35;
    const label = count > 1
      ? `<text
          x="${center}"
          y="${textY}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="800"
          fill="white"
        >${count}</text>`
      : '';
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg"
            width="${size}"
            height="${size}"
            viewBox="0 0 ${size} ${size}">
          <circle
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="#1677FF"
            stroke="white"
            stroke-width="3"
          />
          ${label}
        </svg>
      `;
      //const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${center}" cy="${center}" r="${radius}" fill="#1677FF" stroke="white" stroke-width="5"/><text x="${center}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="white">${count}</text></svg>`;
    const source = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    return new maps.MarkerImage(
      source,
      new maps.Size(size, size),
      { offset: new maps.Point(center, center) },
    );
  };

  const renderPagination = (pageData: PageResponse<Store> | null) => {
    if (!paginationElement || !pageInfoElement || !prevPageButton || !nextPageButton) return;
    if (!pageData || pageData.totalPages <= 1) {
      paginationElement.hidden = true;
      return;
    }

    paginationElement.hidden = false;
    pageInfoElement.textContent = `${pageData.page + 1} / ${pageData.totalPages}`;
    prevPageButton.disabled = pageData.first;
    nextPageButton.disabled = pageData.last;
  };

  const renderClusterSummary = (total: number) => {
    stores = [];
    selectedStoreId = null;
    listElement.replaceChildren();
    countElement.textContent = `${total}곳`;

    const guide = document.createElement('p');
    guide.className = 'store-list-empty';
    guide.textContent = '파란 클러스터를 선택하거나 지도를 확대하면 개별 매장을 확인할 수 있습니다.';
    listElement.appendChild(guide);
  };

  const renderServerClusters = (clusters: MapCluster[]) => {
    if (!map || !maps) return 0;
    const currentMap = map;
    const currentMaps = maps;
    clearMarkers();

    clusters.forEach((cluster, index) => {
      const marker = new currentMaps.Marker({
        map: currentMap,
        position: new currentMaps.LatLng(cluster.latitude, cluster.longitude),
        title: `매장 ${cluster.count}곳`,
        image: createClusterMarkerImage(cluster.count),
        zIndex: 10 + Math.min(cluster.count, 1_000),
      });
      const clickHandler = () => {
        if (pendingClusterSearchHandler) {
          currentMaps.event.removeListener(currentMap, 'idle', pendingClusterSearchHandler);
        }

        const searchAfterMove = () => {
          currentMaps.event.removeListener(currentMap, 'idle', searchAfterMove);
          pendingClusterSearchHandler = null;
          clusterFrameId = window.requestAnimationFrame(() => {
            void loadStoresInView();
          });
        };
        pendingClusterSearchHandler = searchAfterMove;
        currentMaps.event.addListener(currentMap, 'idle', searchAfterMove);
        suppressViewportUntil = Date.now() + 800;
        const nextLevel = Math.max(
          KOREA_MAP_LIMIT.minLevel,
          currentMap.getLevel() - 2,
        );

        currentMap.setLevel(nextLevel);
        currentMap.setCenter(marker.getPosition());
      };
      currentMaps.event.addListener(marker, 'click', clickHandler);
      markers.push({ storeId: `cluster-${index}`, marker, clickHandler });
    });

    return clusters.length;
  };

  const loadStoresInView = async () => {
    if (!map) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const level = map.getLevel();
    const shouldUseClusters = level >= SERVER_CLUSTER_MIN_LEVEL;
    const boundsQuery = {
      swLat: clamp(sw.getLat(), KOREA_MAP_LIMIT.minLatitude, KOREA_MAP_LIMIT.maxLatitude),
      swLng: clamp(sw.getLng(), KOREA_MAP_LIMIT.minLongitude, KOREA_MAP_LIMIT.maxLongitude),
      neLat: clamp(ne.getLat(), KOREA_MAP_LIMIT.minLatitude, KOREA_MAP_LIMIT.maxLatitude),
      neLng: clamp(ne.getLng(), KOREA_MAP_LIMIT.minLongitude, KOREA_MAP_LIMIT.maxLongitude),
      types: selectedServiceCodes(),
    };
    const requestKey = `${shouldUseClusters ? 'clusters' : 'stores'}:${level}:${JSON.stringify(boundsQuery)}`;
    if (requestKey === lastViewportRequestKey) {
      hideViewportSearch();
      return;
    }

    lastViewportRequestKey = requestKey;
    hideViewportSearch();
    if (viewportSearchButton) viewportSearchButton.disabled = true;
    viewportAbortController?.abort();
    const requestController = new AbortController();
    viewportAbortController = requestController;
    const requestId = ++viewportRequestId;
    setStatus('현재 지도 영역의 매장을 찾고 있습니다.');

    try {
      if (shouldUseClusters) {
        const clusters = await getMapClusters(boundsQuery, level, requestController.signal);
        if (disposed || requestId !== viewportRequestId) return;
        const total = clusters.reduce((sum, cluster) => sum + cluster.count, 0);
        regionSearchActive = false;
        renderPagination(null);
        renderClusterSummary(total);
        const displayedClusterCount = renderServerClusters(clusters);
        renderedMapMode = 'clusters';
        setStatus(`현재 지도 영역의 매장 ${total}곳을 ${displayedClusterCount}개 클러스터로 표시했습니다.`);
        return;
      }

      const center = map.getCenter();
      const nextStores = await getMapStores(boundsQuery, {
        latitude: clamp(center.getLat(), KOREA_MAP_LIMIT.minLatitude, KOREA_MAP_LIMIT.maxLatitude),
        longitude: clamp(center.getLng(), KOREA_MAP_LIMIT.minLongitude, KOREA_MAP_LIMIT.maxLongitude),
      }, requestController.signal);
      if (disposed || requestId !== viewportRequestId) return;

      const sortedStores = [...nextStores].sort((a, b) => {
        const aDistance = typeof a.distanceKm === 'number' ? a.distanceKm : Infinity;
        const bDistance = typeof b.distanceKm === 'number' ? b.distanceKm : Infinity;
        return aDistance - bDistance || a.storeId - b.storeId;
      });

      regionSearchActive = false;
      renderPagination(null);
      renderList(sortedStores.slice(0, MAP_LIST_LIMIT), { total: sortedStores.length });
      renderMarkers(sortedStores);
      renderedMapMode = 'stores';
      const listNotice = sortedStores.length > MAP_LIST_LIMIT
        ? ` 목록에는 ${MAP_LIST_LIMIT}곳만 표시합니다.`
        : '';
      setStatus(`현재 지도 영역에서 매장 ${nextStores.length}곳을 찾았습니다.${listNotice}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (requestId !== viewportRequestId) return;
      lastViewportRequestKey = '';
      showViewportSearch();
      setStatus(`현재 지도 영역 매장 조회 실패: ${errorMessage(error)}`, true);
    } finally {
      if (viewportAbortController === requestController) {
        viewportAbortController = null;
      }
      if (viewportSearchButton) viewportSearchButton.disabled = false;
    }
  };

  const fitMapToStores = (nextStores: Store[]) => {
    if (!map || !maps || !nextStores.length) return;
    const currentMap = map;
    const currentMaps = maps;

    suppressViewportUntil = Date.now() + 600;
    if (nextStores.length === 1) {
      currentMap.setCenter(new currentMaps.LatLng(nextStores[0].latitude, nextStores[0].longitude));
      currentMap.setLevel(3);
      return;
    }

    const bounds = new currentMaps.LatLngBounds();
    nextStores.forEach((store) => {
      bounds.extend(new currentMaps.LatLng(store.latitude, store.longitude));
    });
    currentMap.setBounds(bounds);
  };

  const ensureMap = (): Promise<KakaoMap> => {
    if (map) return Promise.resolve(map);
    if (mapInitPromise) return mapInitPromise;

    setStatus('카카오 지도를 준비하고 있습니다.');
    mapInitPromise = loadKakaoMaps()
      .then((loadedMaps) => {
        maps = loadedMaps;
        mapElement.replaceChildren();
        const createdMap = new loadedMaps.Map(mapElement, {
          center: new loadedMaps.LatLng(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
          level: 3,
        });
        map = createdMap;
        createdMap.setMinLevel(KOREA_MAP_LIMIT.minLevel);
        createdMap.setMaxLevel(KOREA_MAP_LIMIT.maxLevel);
        createdMap.addControl(new loadedMaps.ZoomControl(), loadedMaps.ControlPosition.RIGHT);
        infoWindow = new loadedMaps.InfoWindow({ zIndex: 5 });
        mapIdleHandler = () => {
          if (Date.now() < suppressViewportUntil) return;
          if (keepMapInsideKorea()) return;

          const nextMode =
            createdMap.getLevel() >= SERVER_CLUSTER_MIN_LEVEL
              ? 'clusters'
              : 'stores';

          if (renderedMapMode === 'clusters' && nextMode === 'stores') {
            void loadStoresInView();
            return;
          }

          showViewportSearch();

        };
        mapClickHandler = clearStoreSelection;
        loadedMaps.event.addListener(createdMap, 'idle', mapIdleHandler);
        loadedMaps.event.addListener(createdMap, 'click', mapClickHandler);

        mapInitFrameId = window.requestAnimationFrame(() => {
          if (disposed) return;
          suppressViewportUntil = Date.now() + 600;
          createdMap.relayout();
          createdMap.setCenter(new loadedMaps.LatLng(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude));
          createdMap.setLevel(3);
          void loadStoresInView();
        });

        return createdMap;
      })
      .catch((error) => {
        mapInitPromise = null;
        mapElement.innerHTML = `<div class="stores-map-placeholder"></div>`;
        const placeholder = mapElement.querySelector<HTMLElement>('.stores-map-placeholder');
        if (placeholder) placeholder.textContent = `${errorMessage(error)} .env.local에 카카오 JavaScript 키를 설정해 주세요.`;
        throw error;
      });

    return mapInitPromise;
  };

  const focusMap = async (latitude: number, longitude: number, label: string) => {
    try {
      const currentMap = await ensureMap();
      if (!maps || disposed) return;
      suppressViewportUntil = Date.now() + 600;
      currentMap.relayout();
      currentMap.setCenter(new maps.LatLng(latitude, longitude));
      currentMap.setLevel(3);
      setStatus(`${label} 중심으로 현재 지도 영역의 매장을 찾고 있습니다.`);
      await loadStoresInView();
    } catch {
      // ensureMap already exposes the user-facing error in the map/status area.
    }
  };

  const searchLocation = async () => {
    const query = searchInput.value.trim();
    if (!query) {
      setStatus('검색할 주소나 지역명을 입력해 주세요.', true);
      return;
    }

    searchButton.disabled = true;
    setStatus(`“${query}” 위치를 찾고 있습니다.`);
    try {
      const locations = await searchLocations(query);
      if (disposed) return;
      const location = locations[0];
      if (!location) {
        setStatus('검색 결과가 없습니다. 다른 주소나 지역명을 입력해 주세요.', true);
        return;
      }
      searchInput.value = location.roadAddress || location.address || location.name || query;
      await focusMap(location.latitude, location.longitude, location.name || query);
    } catch (error) {
      setStatus(`지역 검색 실패: ${errorMessage(error)}`, true);
    } finally {
      searchButton.disabled = false;
    }
  };

  const searchStoresByRegion = async (page = 0) => {
    const sido = sidoSelect?.value.trim() || '';
    const sigungu = sigunguSelect?.value.trim() || '';
    viewportAbortController?.abort();
    viewportAbortController = null;
    lastViewportRequestKey = '';
    viewportRequestId += 1;
    suppressViewportUntil = Date.now() + 800;
    if (regionSearchButton) regionSearchButton.disabled = true;
    setStatus('선택한 지역의 매장을 찾고 있습니다.');

    try {
      await ensureMap();
      const pageData = await getStorePage(page, STORE_PAGE_SIZE, {
        sido,
        sigungu,
        types: selectedServiceCodes(),
      });
      if (disposed) return;
      const nextStores = pageData.content;
      currentRegionPage = pageData.page;
      regionSearchActive = true;
      selectedStoreId = null;
      const numberOffset = currentRegionPage * STORE_PAGE_SIZE;
      renderList(nextStores, { total: pageData.totalElements, numberOffset });
      renderMarkers(nextStores, { numberOffset });
      renderPagination(pageData);
      fitMapToStores(nextStores);

      const regionLabel = [sido, sigungu].filter(Boolean).join(' ') || '전체 지역';
      const selectedServices = getSelectedServices();
      const serviceLabel = selectedServices.length
        ? selectedServices.map(({ label }) => label).join(' + ')
        : '전체 서비스';
      setStatus(`${regionLabel} · ${serviceLabel} 조건으로 매장 ${pageData.totalElements}곳을 찾았습니다.`);
    } catch (error) {
      setStatus(`지역별 매장 조회 실패: ${errorMessage(error)}`, true);
    } finally {
      if (regionSearchButton) regionSearchButton.disabled = false;
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('이 브라우저에서는 현재 위치를 사용할 수 없습니다.', true);
      return;
    }

    if (locationButton) locationButton.disabled = true;
    setStatus('현재 위치를 확인하고 있습니다.');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await focusMap(coords.latitude, coords.longitude, '현재 위치');
        } finally {
          if (locationButton) locationButton.disabled = false;
        }
      },
      () => {
        if (locationButton) locationButton.disabled = false;
        setStatus('위치 권한을 허용하면 현재 위치 주변 매장을 찾을 수 있습니다.', true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  const handleSearchKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') void searchLocation();
  };
  const handleViewportSearch = () => { void loadStoresInView(); };
  const handleRegionSearch = () => { void searchStoresByRegion(0); };
  const handlePreviousPage = () => {
    if (regionSearchActive && currentRegionPage > 0) void searchStoresByRegion(currentRegionPage - 1);
  };
  const handleNextPage = () => {
    if (regionSearchActive) void searchStoresByRegion(currentRegionPage + 1);
  };
  const handleSidoChange = () => { if (sidoSelect) void loadSigungus(sidoSelect.value); };
  const handleDocumentClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || !event.target.closest('.store-service-filter')) {
      closeServicePanel();
    }
  };
  const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeServicePanel();
  };
  const handleRouteChange = (event: Event) => {
    const routeEvent = event as CustomEvent<{ route?: string }>;
    if (routeEvent.detail?.route !== 'stores') return;
    window.clearTimeout(routeTimerId);
    routeTimerId = window.setTimeout(() => {
      void ensureMap().then((currentMap) => {
        if (disposed) return;
        currentMap.relayout();
        if (!stores.length) void loadStoresInView();
      }).catch(() => {});
    }, 80);
  };

  searchButton.addEventListener('click', searchLocation);
  searchInput.addEventListener('keydown', handleSearchKeydown);
  locationButton?.addEventListener('click', useCurrentLocation);
  viewportSearchButton?.addEventListener('click', handleViewportSearch);
  regionSearchButton?.addEventListener('click', handleRegionSearch);
  prevPageButton?.addEventListener('click', handlePreviousPage);
  nextPageButton?.addEventListener('click', handleNextPage);
  sidoSelect?.addEventListener('change', handleSidoChange);
  serviceToggle?.addEventListener('click', toggleServicePanel);
  serviceTypeInputs.forEach((input) => input.addEventListener('change', updateServiceSummary));
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);
  document.addEventListener('ubot:route-change', handleRouteChange);

  loadSidos();

  if (document.body.dataset.route === 'stores') {
    ensureMap().catch(() => {});
  } else {
    setStatus(`${DEFAULT_LOCATION.label}을 기본 위치로 사용합니다. 매장 찾기에 들어가면 현재 지도 영역의 매장을 조회합니다.`);
  }

  return () => {
    disposed = true;
    directionsController.dispose();
    viewportAbortController?.abort();
    window.clearTimeout(routeTimerId);
    if (clusterFrameId !== undefined) window.cancelAnimationFrame(clusterFrameId);
    if (mapInitFrameId !== undefined) window.cancelAnimationFrame(mapInitFrameId);
    if (maps && map && pendingClusterSearchHandler) {
      maps.event.removeListener(map, 'idle', pendingClusterSearchHandler);
    }
    if (maps && map && mapIdleHandler) maps.event.removeListener(map, 'idle', mapIdleHandler);
    if (maps && map && mapClickHandler) maps.event.removeListener(map, 'click', mapClickHandler);
    clearMarkers();
    infoWindow?.close();
    searchButton.removeEventListener('click', searchLocation);
    searchInput.removeEventListener('keydown', handleSearchKeydown);
    locationButton?.removeEventListener('click', useCurrentLocation);
    viewportSearchButton?.removeEventListener('click', handleViewportSearch);
    regionSearchButton?.removeEventListener('click', handleRegionSearch);
    prevPageButton?.removeEventListener('click', handlePreviousPage);
    nextPageButton?.removeEventListener('click', handleNextPage);
    sidoSelect?.removeEventListener('change', handleSidoChange);
    serviceToggle?.removeEventListener('click', toggleServicePanel);
    serviceTypeInputs.forEach((input) => input.removeEventListener('change', updateServiceSummary));
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleDocumentKeydown);
    document.removeEventListener('ubot:route-change', handleRouteChange);
  };
}
