import { getStoreDirections, getTransitDetail } from '../api/directions';
import type { KakaoCustomOverlay, KakaoMap, KakaoMapsApi, KakaoPolyline } from '../types/kakao';
import type { Store } from '../types/store';
import type {
  CarGuide,
  DirectionsMode,
  DirectionsPoint,
  DirectionsResult,
  DirectionsStep,
} from '../types/directions';
import { formatDistance, formatDuration, formatFare, formatTransitFare } from './format';
import { createRouteIcon, turnIconType, type RouteIcon } from './icons';
import { createOriginPicker } from './originPicker';
import { offsetPathToRight } from './routeGeometry';
import { kakaoRouteUrl } from '../kakao/links';
import {
  MAX_VEHICLE_CHIPS,
  alightStopName,
  boardStopName,
  intermediateStopNames,
  isRideStep,
  stepColors,
  stepIconType,
  uniqueVehicles,
} from './transit';

type ItemKind = 'start' | 'end' | 'step';

interface RouteChip {
  text: string;
  color: string;
  solid: boolean;
}

// 자동차 안내와 대중교통 구간을 같은 모양으로 목록·지도 마커·말풍선에 그리기 위한 공통 항목.
interface RouteItem {
  kind: ItemKind;
  label: string;
  text: string;
  meta: string;
  icon: RouteIcon;
  point: DirectionsPoint | null;
  marker: 'number' | 'icon' | 'none';
  chips: RouteChip[];
  // 버스·지하철 승차 항목을 펼쳤을 때 보여줄 중간 역·정류장.
  substops?: { names: string[]; color: string };
  // 버스·지하철은 승차·하차 두 항목으로 나누고, 목록에서 노선 색 선으로 잇는다.
  ride?: { role: 'board' | 'alight'; color: string };
}

interface RouteLine {
  path: DirectionsPoint[];
  color: string;
}

interface RoutePlaces {
  origin: string;
  destination: string;
}

const ROUTE_COLOR = '#1677ff';
// 같은 도로를 왕복(유턴)해도 두 선이 겹치지 않도록 진행 방향 오른쪽으로 미는 거리.
const ROUTE_OFFSET_PX = 4;
const MARKER_Z = 3;
const MARKER_ACTIVE_Z = 6;
const ENDPOINT_MARKER_Z = 8;
const POPUP_Z = 10;
const FOCUS_MAX_LEVEL = 4;
const ORIGIN_FALLBACK_LABEL = '현재 위치';
const REVERSE_GEOCODE_TIMEOUT_MS = 3000;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

// 카카오는 경로 첫/마지막 guide로 출발지·목적지를 함께 내려준다.
function carGuideKind(guides: CarGuide[], index: number): ItemKind {
  const guidance = guides[index].guidance ?? '';
  if (index === 0 && /출발/.test(guidance)) return 'start';
  if (index === guides.length - 1 && /목적지|도착/.test(guidance)) return 'end';
  return 'step';
}

function startItem(places: RoutePlaces, point: DirectionsPoint): RouteItem {
  return {
    kind: 'start',
    label: '출발',
    text: `출발 · ${places.origin}`,
    meta: '',
    icon: { type: 'start' },
    point,
    marker: 'none',
    chips: [],
  };
}

function endItem(places: RoutePlaces, point: DirectionsPoint): RouteItem {
  return {
    kind: 'end',
    label: '도착',
    text: `도착 · ${places.destination}`,
    meta: '',
    icon: { type: 'end' },
    point,
    marker: 'none',
    chips: [],
  };
}

function describeCarGuide(guide: CarGuide, kind: ItemKind, places: RoutePlaces) {
  if (kind === 'start') return `출발 · ${places.origin}`;
  if (kind === 'end') return `도착 · ${places.destination}`;
  const action = guide.guidance || '직진';
  if (!guide.distanceMeters) return action;
  const road = guide.name && !/출발지|목적지/.test(guide.name) ? `${guide.name} ` : '';
  return `${road}${formatDistance(guide.distanceMeters)} 이동, ${action}`;
}

function describeCarGuideMeta(guide: CarGuide, kind: ItemKind) {
  const parts: string[] = [];
  if (kind === 'end' && guide.distanceMeters > 0) parts.push(`${formatDistance(guide.distanceMeters)} 이동`);
  if (guide.durationSeconds > 0) parts.push(`약 ${formatDuration(guide.durationSeconds)}`);
  return parts.join(' · ');
}

// 출발·도착은 번호에서 빼고, 중간 안내만 1부터 센다.
function buildCarItems(guides: CarGuide[], places: RoutePlaces): RouteItem[] {
  let stepNumber = 0;
  return guides.map((guide, index) => {
    const kind = carGuideKind(guides, index);
    const label = kind === 'start' ? '출발' : kind === 'end' ? '도착' : String(++stepNumber);
    return {
      kind,
      label,
      text: describeCarGuide(guide, kind, places),
      meta: describeCarGuideMeta(guide, kind),
      icon: { type: kind === 'step' ? turnIconType(guide.guidance) : kind },
      point: guide.point,
      marker: kind === 'step' ? 'number' : 'none',
      chips: [],
    };
  });
}

function buildWalkItems(
  steps: DirectionsStep[],
  places: RoutePlaces,
  origin: DirectionsPoint,
  destination: DirectionsPoint,
): RouteItem[] {
  const items = steps.map((step, index): RouteItem => ({
    kind: 'step',
    label: String(index + 1),
    text: step.guidance || `${formatDistance(step.distanceMeters)} 이동`,
    meta: [
      formatDistance(step.distanceMeters),
      step.durationSeconds > 0 ? `약 ${formatDuration(step.durationSeconds)}` : '',
    ].filter(Boolean).join(' · '),
    icon: { type: turnIconType(step.guidance) },
    point: step.path[0] ?? null,
    marker: 'number',
    chips: [],
  }));
  return [startItem(places, origin), ...items, endItem(places, destination)];
}

function vehicleChips(step: DirectionsStep, color: string): RouteChip[] {
  const vehicles = uniqueVehicles(step);
  const solid = step.type === 'SUBWAY';
  const chips = vehicles.slice(0, MAX_VEHICLE_CHIPS).map((text) => ({ text, color, solid }));
  if (vehicles.length > MAX_VEHICLE_CHIPS) {
    chips.push({ text: `+${vehicles.length - MAX_VEHICLE_CHIPS}`, color: '#8b8e95', solid: false });
  }
  return chips;
}

function buildTransitItems(
  steps: DirectionsStep[],
  places: RoutePlaces,
  origin: DirectionsPoint,
  destination: DirectionsPoint,
): RouteItem[] {
  const items: RouteItem[] = [startItem(places, origin)];
  const colors = stepColors(steps);
  let stepNumber = 0;

  steps.forEach((step, index) => {
    const color = colors[index];
    const icon = { type: stepIconType(step), color };
    const point = step.path[0] ?? null;

    if (isRideStep(step)) {
      const stopCount = Math.max(1, step.stops.length - 1);
      const unit = step.type === 'SUBWAY' ? '개 역' : '개 정류장';
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
      });
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
      });
      return;
    }
    const label = String(++stepNumber);

    const nextRide = steps.slice(index + 1).find(isRideStep);
    const hasPreviousRide = steps.slice(0, index).some(isRideStep);
    const target = nextRide ? boardStopName(nextRide) : places.destination;
    items.push({
      kind: 'step',
      label,
      text: `${hasPreviousRide && nextRide ? '환승 · ' : ''}${target}까지 도보`,
      meta: `${formatDistance(step.distanceMeters)} · 약 ${formatDuration(step.durationSeconds)}`,
      icon,
      point,
      marker: 'icon',
      chips: [],
    });
  });

  items.push(endItem(places, destination));
  return items;
}

function createChips(chips: RouteChip[]) {
  const wrapper = document.createElement('span');
  wrapper.className = 'direction-chips';
  chips.forEach(({ text, color, solid }) => {
    const chip = document.createElement('span');
    chip.className = solid ? 'direction-chip solid' : 'direction-chip';
    chip.style.setProperty('--chip-color', color);
    chip.textContent = text;
    wrapper.appendChild(chip);
  });
  return wrapper;
}

// 후보 카드와 상세 화면 상단이 같은 요약 한 줄(시간 + 환승·요금·거리)을 쓴다.
function fillRouteHead(head: HTMLElement, result: DirectionsResult) {
  const time = document.createElement('b');
  time.textContent = formatDuration(result.durationSeconds);
  const meta = document.createElement('span');
  const fare = formatTransitFare(result.transitInfo?.fare ?? null);
  meta.textContent = [
    `환승 ${result.transitInfo?.transfers ?? 0}회`,
    fare ? `요금 ${fare.text}` : '',
    formatDistance(result.distanceMeters),
  ].filter(Boolean).join(' · ');
  head.replaceChildren(time, meta);
}

function createIconButton(text: string, ariaLabel: string, onClick: () => void, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.setAttribute('aria-label', ariaLabel);
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

interface DirectionsControllerDeps {
  getMap: () => KakaoMap | null;
  getMaps: () => KakaoMapsApi | null;
  getOrigin: () => Promise<{ latitude: number; longitude: number }>;
  onEnter?: () => void;
  onExit?: () => void;
  // 길찾기 중에 보여줄 카카오맵 링크. 길찾기 밖의 링크는 매장 찾기 쪽이 관리한다.
  onRouteLink?: (url: string | null) => void;
}

export interface DirectionsController {
  openForStore(store: Store): void;
  close(): void;
  dispose(): void;
}

const NOOP_CONTROLLER: DirectionsController = {
  openForStore: () => {},
  close: () => {},
  dispose: () => {},
};

export function createDirectionsController(deps: DirectionsControllerDeps): DirectionsController {
  const panel = document.querySelector<HTMLElement>('#storeDirectionPanel');
  const backButton = document.querySelector<HTMLButtonElement>('#directionBackButton');
  const closeButton = document.querySelector<HTMLButtonElement>('#directionCloseButton');
  const destNameEl = document.querySelector<HTMLElement>('#directionDestName');
  const destAddressEl = document.querySelector<HTMLElement>('#directionDestAddress');
  const modeTabs = document.querySelector<HTMLElement>('#directionModeTabs');
  const statusEl = document.querySelector<HTMLElement>('#directionStatus');
  const routeHeadEl = document.querySelector<HTMLElement>('#directionRouteHead');
  const routeHeadInfoEl = document.querySelector<HTMLElement>('#directionRouteHeadInfo');
  const listBackButton = document.querySelector<HTMLButtonElement>('#directionListBack');
  const summaryEl = document.querySelector<HTMLElement>('#directionSummary');
  const candidatesEl = document.querySelector<HTMLElement>('#directionCandidates');
  const stepsPanelEl = document.querySelector<HTMLElement>('#directionStepsPanel');
  const stepsToggleEl = document.querySelector<HTMLButtonElement>('#directionStepsToggle');
  const stepsCountEl = document.querySelector<HTMLElement>('#directionStepsCount');
  const stepsEl = document.querySelector<HTMLElement>('#directionSteps');
  const originInput = document.querySelector<HTMLInputElement>('#directionOriginInput');
  const originLocateButton = document.querySelector<HTMLButtonElement>('#directionOriginLocate');
  const originResultsEl = document.querySelector<HTMLElement>('#directionOriginResults');
  const searchButton = document.querySelector<HTMLButtonElement>('#directionSearchButton');

  if (!panel || !backButton || !closeButton || !destNameEl || !destAddressEl || !modeTabs || !statusEl
    || !routeHeadEl || !routeHeadInfoEl || !listBackButton || !summaryEl || !candidatesEl
    || !stepsPanelEl || !stepsToggleEl || !stepsCountEl || !stepsEl
    || !originInput || !originLocateButton || !originResultsEl || !searchButton) {
    return NOOP_CONTROLLER;
  }

  const setRouteLink = (url: string | null) => deps.onRouteLink?.(url);

  let currentStore: Store | null = null;
  let currentMode: DirectionsMode = 'CAR';
  // label이 null이면 현재 위치에서 온 좌표라 주소를 역지오코딩으로 채운다.
  let currentOrigin: { latitude: number; longitude: number; label: string | null } | null = null;
  let requestId = 0;
  let closeTimeoutId: number | undefined;
  let drawnLines: Array<{ line: RouteLine; polylines: KakaoPolyline[] }> = [];
  let zoomHandler: (() => void) | null = null;
  let stepsExpanded = true;
  let routeFallbackUrl: string | null = null;
  let routeItems: RouteItem[] = [];
  let itemEls: HTMLButtonElement[] = [];
  let itemMarkers: Array<{ overlay: KakaoCustomOverlay; element: HTMLElement } | null> = [];
  let popup: KakaoCustomOverlay | null = null;
  let activeIndex = -1;
  let endpointMarkers: KakaoCustomOverlay[] = [];
  let transitCandidates: DirectionsResult[] = [];
  let originAddress: { key: string; label: string } | null = null;
  let places: RoutePlaces = { origin: ORIGIN_FALLBACK_LABEL, destination: '' };

  const resolveOriginLabel = (origin: { latitude: number; longitude: number }) => new Promise<string>((resolve) => {
    const key = `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}`;
    if (originAddress?.key === key) {
      resolve(originAddress.label);
      return;
    }
    const maps = deps.getMaps();
    if (!maps) {
      resolve(ORIGIN_FALLBACK_LABEL);
      return;
    }

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      settled = true;
      resolve(ORIGIN_FALLBACK_LABEL);
    }, REVERSE_GEOCODE_TIMEOUT_MS);
    new maps.services.Geocoder().coord2Address(origin.longitude, origin.latitude, (results, status) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      const first = status === maps.services.Status.OK ? results[0] : undefined;
      const label = first?.road_address?.address_name || first?.address?.address_name || ORIGIN_FALLBACK_LABEL;
      originAddress = { key, label };
      resolve(label);
    });
  });

  const clearEndpoints = () => {
    endpointMarkers.forEach((overlay) => overlay.setMap(null));
    endpointMarkers = [];
  };

  const showEndpoints = (origin: { latitude: number; longitude: number }, store: Store) => {
    clearEndpoints();
    const maps = deps.getMaps();
    const map = deps.getMap();
    if (!maps || !map) return;

    const endpoints = [
      { kind: 'start', label: '출발', latitude: origin.latitude, longitude: origin.longitude },
      { kind: 'end', label: '도착', latitude: store.latitude, longitude: store.longitude },
    ];
    endpoints.forEach(({ kind, label, latitude, longitude }) => {
      const element = document.createElement('div');
      element.className = `direction-endpoint-marker ${kind}`;
      const text = document.createElement('span');
      text.textContent = label;
      const tail = document.createElement('i');
      element.append(text, tail);
      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(latitude, longitude),
        content: element,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: ENDPOINT_MARKER_Z,
      });
      overlay.setMap(map);
      endpointMarkers.push(overlay);
    });
  };

  const clearLines = () => {
    drawnLines.forEach(({ polylines }) => polylines.forEach((polyline) => polyline.setMap(null)));
    drawnLines = [];
    const maps = deps.getMaps();
    const map = deps.getMap();
    if (maps && map && zoomHandler) maps.event.removeListener(map, 'zoom_changed', zoomHandler);
    zoomHandler = null;
  };

  // 오른쪽 이동량은 화면 픽셀 기준이라 확대 수준이 바뀔 때마다 좌표를 다시 계산한다.
  const shiftedPath = (maps: KakaoMapsApi, map: KakaoMap, path: DirectionsPoint[]) => {
    const projection = map.getProjection();
    return offsetPathToRight(
      path.map((point) => new maps.LatLng(point.latitude, point.longitude)),
      {
        toScreen: (position) => projection.containerPointFromCoords(position),
        fromScreen: ({ x, y }) => projection.coordsFromContainerPoint(new maps.Point(x, y)),
      },
      ROUTE_OFFSET_PX,
    );
  };

  const reshapeLines = () => {
    const maps = deps.getMaps();
    const map = deps.getMap();
    if (!maps || !map) return;
    drawnLines.forEach(({ line, polylines }) => {
      const path = shiftedPath(maps, map, line.path);
      polylines.forEach((polyline) => polyline.setPath(path));
    });
  };

  const drawLines = (lines: RouteLine[]) => {
    clearLines();
    const maps = deps.getMaps();
    const map = deps.getMap();
    if (!maps || !map) return;

    const bounds = new maps.LatLngBounds();
    let hasPoint = false;
    lines.forEach((line) => {
      if (!line.path.length) return;
      const path = shiftedPath(maps, map, line.path);
      // 실선 경로 안에 흰 점선을 한 겹 더 그려 지도 위에서 진행 방향이 잘 보이게 한다.
      const polylines = [
        new maps.Polyline({
          path,
          strokeWeight: 7,
          strokeColor: line.color,
          strokeOpacity: 0.95,
          strokeStyle: 'solid',
          zIndex: 1,
        }),
        new maps.Polyline({
          path,
          strokeWeight: 2,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeStyle: 'shortdash',
          zIndex: 2,
        }),
      ];
      polylines.forEach((polyline) => polyline.setMap(map));
      drawnLines.push({ line, polylines });
      line.path.forEach((point) => bounds.extend(new maps.LatLng(point.latitude, point.longitude)));
      hasPoint = true;
    });

    zoomHandler = reshapeLines;
    maps.event.addListener(map, 'zoom_changed', zoomHandler);
    if (hasPoint) map.setBounds(bounds);
  };

  const clearItems = () => {
    itemMarkers.forEach((marker) => marker?.overlay.setMap(null));
    popup?.setMap(null);
    routeItems = [];
    itemEls = [];
    itemMarkers = [];
    popup = null;
    activeIndex = -1;
  };

  const clearRouteOverlays = () => {
    clearLines();
    clearItems();
  };

  const setItemActive = (index: number, active: boolean) => {
    const item = itemEls[index];
    const marker = itemMarkers[index];
    item?.classList.toggle('active', active);
    if (active) item?.setAttribute('aria-current', 'step');
    else item?.removeAttribute('aria-current');
    marker?.element.classList.toggle('active', active);
    marker?.overlay.setZIndex(active ? MARKER_ACTIVE_Z : MARKER_Z);
  };

  // 마우스를 올리면 목록·지도 양쪽에 같은 항목을 강조만 한다. 말풍선과 지도 이동은 클릭했을 때만 한다.
  const setItemHovered = (index: number, hovered: boolean) => {
    itemEls[index]?.classList.toggle('hovered', hovered);
    const marker = itemMarkers[index];
    if (!marker) return;
    marker.element.classList.toggle('hovered', hovered);
    marker.overlay.setZIndex(hovered || index === activeIndex ? MARKER_ACTIVE_Z : MARKER_Z);
  };

  const closePopup = () => {
    popup?.setMap(null);
    popup = null;
    if (activeIndex !== -1) setItemActive(activeIndex, false);
    activeIndex = -1;
  };

  const buildPopup = (index: number) => {
    const item = routeItems[index];
    const root = document.createElement('div');
    root.className = 'direction-guide-popup';

    const icon = createRouteIcon(item.icon, 'direction-guide-icon');
    const text = document.createElement('span');
    text.className = 'direction-guide-popup-text';
    text.textContent = item.text;

    const nav = document.createElement('div');
    nav.className = 'direction-guide-popup-nav';
    nav.append(
      createIconButton('‹', '이전 안내', () => selectItem(index - 1), index === 0),
      createIconButton('›', '다음 안내', () => selectItem(index + 1), index === routeItems.length - 1),
    );
    const close = createIconButton('×', '안내 닫기', closePopup);
    close.className = 'direction-guide-popup-close';

    root.append(icon, text, nav, close);
    return root;
  };

  function selectItem(index: number) {
    const item = routeItems[index];
    if (!item) return;

    if (activeIndex !== -1) setItemActive(activeIndex, false);
    activeIndex = index;
    setItemActive(index, true);
    itemEls[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    popup?.setMap(null);
    popup = null;
    const maps = deps.getMaps();
    const map = deps.getMap();
    if (!maps || !map || !item.point) return;

    const position = new maps.LatLng(item.point.latitude, item.point.longitude);
    popup = new maps.CustomOverlay({
      position,
      content: buildPopup(index),
      xAnchor: 0.5,
      yAnchor: 1,
      zIndex: POPUP_Z,
      clickable: true,
    });
    popup.setMap(map);
    if (map.getLevel() > FOCUS_MAX_LEVEL) map.setLevel(FOCUS_MAX_LEVEL);
    map.panTo(position);
  }

  const createItemMarker = (item: RouteItem, index: number) => {
    const element = item.marker === 'number'
      ? document.createElement('div')
      : createRouteIcon(item.icon, 'direction-step-marker');
    if (item.marker === 'number') {
      element.className = 'direction-guide-marker';
      element.textContent = item.label;
    }
    element.title = item.text;
    element.addEventListener('click', () => selectItem(index));
    element.addEventListener('mouseenter', () => {
      setItemHovered(index, true);
      if (stepsExpanded) itemEls[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    element.addEventListener('mouseleave', () => setItemHovered(index, false));
    return element;
  };

  // 상세 경로가 접혀 있으면 자동차·도보의 번호 마커도 지도에서 숨긴다. 대중교통 구간 아이콘은 그대로 둔다.
  const applyStepsExpanded = () => {
    stepsToggleEl.setAttribute('aria-expanded', String(stepsExpanded));
    stepsPanelEl.classList.toggle('expanded', stepsExpanded);
    stepsEl.hidden = !stepsExpanded;
    const map = deps.getMap();
    routeItems.forEach((item, index) => {
      if (item.marker === 'number') itemMarkers[index]?.overlay.setMap(stepsExpanded ? map : null);
    });
    if (!stepsExpanded) closePopup();
  };

  const toggleSteps = () => {
    stepsExpanded = !stepsExpanded;
    applyStepsExpanded();
  };

  const renderRouteItems = (items: RouteItem[]) => {
    clearItems();
    stepsEl.replaceChildren();
    if (!items.length) {
      stepsPanelEl.hidden = true;
      return;
    }

    routeItems = items;
    const maps = deps.getMaps();
    const map = deps.getMap();

    items.forEach((item, index) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'direction-guide-item';
      if (item.ride) {
        el.classList.add(`ride-${item.ride.role}`);
        el.style.setProperty('--line-color', item.ride.color);
      }
      el.addEventListener('mouseenter', () => setItemHovered(index, true));
      el.addEventListener('mouseleave', () => setItemHovered(index, false));
      el.addEventListener('focus', () => setItemHovered(index, true));
      el.addEventListener('blur', () => setItemHovered(index, false));
      const number = document.createElement('span');
      number.className = `direction-guide-no ${item.kind}`;
      number.textContent = item.label;
      const icon = createRouteIcon(item.icon, 'direction-guide-icon');
      const body = document.createElement('span');
      body.className = 'direction-guide-body';
      const text = document.createElement('span');
      text.className = 'direction-guide-text';
      text.textContent = item.text;
      body.appendChild(text);
      if (item.chips.length) body.appendChild(createChips(item.chips));
      if (item.meta) {
        const meta = document.createElement('small');
        meta.textContent = item.meta;
        body.appendChild(meta);
      }
      el.append(number, icon, body);
      stepsEl.appendChild(el);
      itemEls.push(el);

      const substops = item.substops?.names.length ? item.substops : null;
      if (substops) {
        // 버스·지하철 구간은 눌러서 중간 역·정류장을 펼친다. 지도에서 구간을 선택하는 동작은 그대로 둔다.
        const listId = `directionSubstops${index}`;
        const list = document.createElement('div');
        list.id = listId;
        list.className = 'direction-substops';
        list.style.setProperty('--line-color', substops.color);
        list.hidden = true;
        substops.names.forEach((name) => {
          const stop = document.createElement('span');
          stop.textContent = name;
          list.appendChild(stop);
        });
        el.classList.add('expandable');
        el.setAttribute('aria-expanded', 'false');
        el.setAttribute('aria-controls', listId);
        el.appendChild(createRouteIcon({ type: 'chevron' }, 'direction-guide-chevron'));
        el.addEventListener('click', () => {
          const expanded = list.hidden;
          list.hidden = !expanded;
          el.setAttribute('aria-expanded', String(expanded));
          selectItem(index);
        });
        stepsEl.appendChild(list);
      } else {
        el.addEventListener('click', () => selectItem(index));
      }

      // 출발·도착 지점은 showEndpoints()의 핀 마커가 대신 표시한다.
      if (item.marker === 'none' || !maps || !map || !item.point) {
        itemMarkers.push(null);
        return;
      }
      const element = createItemMarker(item, index);
      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(item.point.latitude, item.point.longitude),
        content: element,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: MARKER_Z,
        clickable: true,
      });
      itemMarkers.push({ overlay, element });
    });

    const stepCount = items.filter((item) => item.kind === 'step').length;
    stepsCountEl.textContent = `안내 ${stepCount}개`;
    stepsPanelEl.hidden = false;
    // 마커를 지도에 올릴지(접힘 여부)는 여기서 한 번에 정한다.
    items.forEach((item, index) => {
      if (item.marker !== 'number') itemMarkers[index]?.overlay.setMap(map);
    });
    applyStepsExpanded();
  };

  const setStatus = (message: string, isError = false) => {
    statusEl.textContent = message;
    statusEl.classList.toggle('error', isError);
  };

  const renderModeTabs = () => {
    modeTabs.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === currentMode);
    });
  };

  const clearResults = () => {
    routeHeadEl.hidden = true;
    routeHeadInfoEl.replaceChildren();
    summaryEl.hidden = true;
    summaryEl.replaceChildren();
    candidatesEl.hidden = true;
    candidatesEl.replaceChildren();
    stepsPanelEl.hidden = true;
    stepsEl.replaceChildren();
  };

  const renderSummary = (result: DirectionsResult) => {
    summaryEl.replaceChildren();
    const stats: Array<{ label: string; value: string; wide?: boolean }> = [
      { label: '소요 시간', value: formatDuration(result.durationSeconds) },
      { label: '거리', value: formatDistance(result.distanceMeters) },
    ];

    if (result.carInfo?.fare) {
      const { taxi, toll } = result.carInfo.fare;
      if (typeof taxi === 'number') stats.push({ label: '예상 택시비', value: formatFare(taxi) });
      if (typeof toll === 'number' && toll > 0) stats.push({ label: '통행료', value: formatFare(toll) });
    }

    if (result.transitInfo) {
      const fare = formatTransitFare(result.transitInfo.fare);
      if (fare) stats.push({ label: '요금', value: fare.text, wide: fare.isRange });
      stats.push({ label: '환승', value: `${result.transitInfo.transfers}회` });
    }

    summaryEl.dataset.statCount = String(stats.length);
    stats.forEach(({ label, value, wide }) => {
      const cell = document.createElement('div');
      cell.className = wide ? 'direction-stat wide' : 'direction-stat';
      const labelEl = document.createElement('small');
      labelEl.textContent = label;
      const valueEl = document.createElement('b');
      valueEl.textContent = value;
      cell.append(labelEl, valueEl);
      summaryEl.appendChild(cell);
    });

    // 카카오가 준 결과 링크(도보·대중교통)를 우선 쓰고, 없으면(자동차) 출발·도착으로 만든 링크를 쓴다.
    setRouteLink(result.landingUrl ?? routeFallbackUrl);
    summaryEl.hidden = false;
  };

  const selectTransitCandidate = async (candidate: DirectionsResult) => {
    if (!currentStore || !currentOrigin) return;
    const store = currentStore;
    const origin = currentOrigin;
    const myRequestId = ++requestId;
    setStatus('상세 경로를 불러오는 중입니다.');

    try {
      const detail = await getTransitDetail(store.storeId, origin.latitude, origin.longitude, candidate);
      if (myRequestId !== requestId) return;
      candidatesEl.hidden = true;
      candidatesEl.replaceChildren();
      fillRouteHead(routeHeadInfoEl, detail);
      routeHeadEl.hidden = false;
      renderSummary(detail);
      renderRouteItems(buildTransitItems(
        detail.steps,
        places,
        origin,
        { latitude: store.latitude, longitude: store.longitude },
      ));
      const colors = stepColors(detail.steps);
      drawLines(detail.steps.map((step, stepIndex) => ({
        path: step.path,
        color: colors[stepIndex],
      })));
      setStatus('');
    } catch (error) {
      if (myRequestId !== requestId) return;
      setStatus(`상세 경로 조회 실패: ${errorMessage(error)}`, true);
    }
  };

  const buildCandidateCard = (candidate: DirectionsResult, index: number) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = index === 0 ? 'direction-candidate recommended' : 'direction-candidate';

    const head = document.createElement('span');
    head.className = 'direction-candidate-head';
    fillRouteHead(head, candidate);

    const route = document.createElement('span');
    route.className = 'direction-candidate-route';
    const rides = candidate.steps.filter(isRideStep);
    // 도보 구간은 버스 순번에 영향이 없어서 탑승 구간만으로 계산해도 상세 화면과 같은 색이 나온다.
    const rideColors = stepColors(rides);
    rides.forEach((step, rideIndex) => {
      const color = rideColors[rideIndex];
      const row = document.createElement('span');
      row.className = 'direction-candidate-stop';
      const icon = createRouteIcon({ type: stepIconType(step), color }, 'direction-candidate-icon');
      const body = document.createElement('span');
      const name = document.createElement('span');
      name.className = 'direction-candidate-stop-name';
      name.textContent = boardStopName(step);
      body.append(name, createChips(vehicleChips(step, color)));
      row.append(icon, body);
      route.appendChild(row);
    });
    const lastRide = rides[rides.length - 1];
    if (lastRide) {
      const row = document.createElement('span');
      row.className = 'direction-candidate-stop';
      const dot = document.createElement('span');
      dot.className = 'direction-candidate-dot';
      const name = document.createElement('span');
      name.className = 'direction-candidate-stop-name';
      name.textContent = `${alightStopName(lastRide)} 하차`;
      row.append(dot, name);
      route.appendChild(row);
    }

    button.append(head, route);
    button.addEventListener('click', () => void selectTransitCandidate(candidate));
    return button;
  };

  const renderTransitCandidates = (candidates: DirectionsResult[]) => {
    candidatesEl.replaceChildren();
    if (!candidates.length) {
      candidatesEl.hidden = true;
      setStatus('대중교통 경로를 찾을 수 없습니다.', true);
      return;
    }
    candidates.forEach((candidate, index) => candidatesEl.appendChild(buildCandidateCard(candidate, index)));
    candidatesEl.hidden = false;
  };

  const showTransitCandidates = () => {
    // 불러오던 상세 경로가 목록 위에 덮어쓰지 않도록 무효화한다.
    requestId += 1;
    clearResults();
    clearRouteOverlays();
    renderTransitCandidates(transitCandidates);
    setRouteLink(routeFallbackUrl);
    setStatus('');
  };

  const loadDirections = async () => {
    if (!currentStore) return;
    const store = currentStore;
    clearResults();
    clearRouteOverlays();
    transitCandidates = [];
    setStatus('경로를 찾고 있습니다.');
    const myRequestId = ++requestId;

    let origin = currentOrigin;
    if (!origin) {
      try {
        const located = await deps.getOrigin();
        if (myRequestId !== requestId) return;
        origin = { ...located, label: null };
        currentOrigin = origin;
      } catch (error) {
        if (myRequestId !== requestId) return;
        setStatus(`${errorMessage(error)} 출발지를 검색해 주세요.`, true);
        originPicker.focus();
        return;
      }
    }

    try {
      showEndpoints(origin, store);
      const [results, originLabel] = await Promise.all([
        getStoreDirections(store.storeId, currentMode, origin.latitude, origin.longitude),
        origin.label ?? resolveOriginLabel(origin),
      ]);
      if (myRequestId !== requestId) return;
      places = { origin: originLabel, destination: store.storeName };
      originPicker.setValue(originLabel);
      routeFallbackUrl = kakaoRouteUrl(
        { name: originLabel, latitude: origin.latitude, longitude: origin.longitude },
        { name: store.storeName, latitude: store.latitude, longitude: store.longitude },
      );
      setRouteLink(routeFallbackUrl);

      if (!results.length) {
        setStatus('경로를 찾을 수 없습니다.', true);
        return;
      }

      if (currentMode === 'TRANSIT') {
        transitCandidates = results;
        renderTransitCandidates(results);
        setStatus('');
        return;
      }

      const [result] = results;
      renderSummary(result);
      if (currentMode === 'CAR') {
        renderRouteItems(buildCarItems(result.carInfo?.guides ?? [], places));
      } else {
        renderRouteItems(buildWalkItems(
          result.steps,
          places,
          origin,
          { latitude: store.latitude, longitude: store.longitude },
        ));
      }
      drawLines([{ path: result.path, color: ROUTE_COLOR }]);
      setStatus('');
    } catch (error) {
      if (myRequestId !== requestId) return;
      setStatus(`경로 조회 실패: ${errorMessage(error)}`, true);
    }
  };

  const locateOrigin = async () => {
    originPicker.setLocating(true);
    try {
      const located = await deps.getOrigin();
      currentOrigin = { ...located, label: null };
      if (currentStore) void loadDirections();
    } catch (error) {
      setStatus(`${errorMessage(error)} 출발지를 검색해 주세요.`, true);
    } finally {
      originPicker.setLocating(false);
    }
  };

  const originPicker = createOriginPicker({
    input: originInput,
    locateButton: originLocateButton,
    results: originResultsEl,
    getMaps: deps.getMaps,
    onPick: (candidate) => {
      currentOrigin = { latitude: candidate.latitude, longitude: candidate.longitude, label: candidate.name };
      if (currentStore) void loadDirections();
    },
    onLocate: () => void locateOrigin(),
  });

  // 검색 버튼: 입력칸이 비었으면 현재 위치, 지금 출발지 그대로면 선택된 이동수단으로 재검색,
  // 새로 입력한 글자면 첫 검색 결과를 출발지로 정한 뒤 검색한다.
  const searchRoute = async () => {
    if (!currentStore) return;
    const text = originInput.value.trim();
    if (!text) {
      void locateOrigin();
      return;
    }
    if (currentOrigin && text === places.origin) {
      void loadDirections();
      return;
    }

    searchButton.disabled = true;
    setStatus(`'${text}' 위치를 찾고 있습니다.`);
    try {
      const picked = await originPicker.pickFirstMatch(text);
      if (!picked) setStatus(`'${text}' 검색 결과가 없습니다. 다른 검색어를 입력해 주세요.`, true);
    } finally {
      searchButton.disabled = false;
    }
  };

  const handleSearchClick = () => void searchRoute();

  const handleModeClick = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLButtonElement>('button[data-mode]');
    if (!target?.dataset.mode || target.dataset.mode === currentMode) return;
    currentMode = target.dataset.mode as DirectionsMode;
    renderModeTabs();
    void loadDirections();
  };

  const close = () => {
    if (!currentStore) return;
    window.clearTimeout(closeTimeoutId);
    // 진행 중인 조회가 닫힌 뒤에 결과·마커를 다시 그리지 않도록 무효화한다.
    requestId += 1;
    panel.classList.remove('open');
    clearRouteOverlays();
    clearEndpoints();
    routeFallbackUrl = null;
    currentStore = null;
    closeTimeoutId = window.setTimeout(() => {
      if (!panel.classList.contains('open')) panel.hidden = true;
    }, 240);
    deps.onExit?.();
  };

  modeTabs.addEventListener('click', handleModeClick);
  backButton.addEventListener('click', close);
  closeButton.addEventListener('click', close);
  listBackButton.addEventListener('click', showTransitCandidates);
  searchButton.addEventListener('click', handleSearchClick);
  stepsToggleEl.addEventListener('click', toggleSteps);

  const openForStore = (store: Store) => {
    window.clearTimeout(closeTimeoutId);
    if (!currentStore) deps.onEnter?.();
    currentStore = store;
    currentMode = 'CAR';
    destNameEl.textContent = store.storeName;
    destAddressEl.textContent = store.address;
    renderModeTabs();
    panel.hidden = false;
    window.requestAnimationFrame(() => panel.classList.add('open'));
    void loadDirections();
  };

  const dispose = () => {
    window.clearTimeout(closeTimeoutId);
    modeTabs.removeEventListener('click', handleModeClick);
    backButton.removeEventListener('click', close);
    closeButton.removeEventListener('click', close);
    listBackButton.removeEventListener('click', showTransitCandidates);
    searchButton.removeEventListener('click', handleSearchClick);
    stepsToggleEl.removeEventListener('click', toggleSteps);
    originPicker.dispose();
    clearRouteOverlays();
    clearEndpoints();
  };

  return { openForStore, close, dispose };
}
