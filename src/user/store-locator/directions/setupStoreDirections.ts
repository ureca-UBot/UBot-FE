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
import { createRouteIcon, type RouteIcon, type RouteIconType } from './icons';
import {
  MAX_VEHICLE_CHIPS,
  alightStopName,
  boardStopName,
  isRideStep,
  stepColor,
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
}

interface RouteLine {
  path: DirectionsPoint[];
  color: string;
  dashed?: boolean;
}

interface RoutePlaces {
  origin: string;
  destination: string;
}

const ROUTE_COLOR = '#1677ff';
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

function stepTypeLabel(type: string) {
  if (type === 'WALKING') return '도보';
  if (type === 'BUS') return '버스';
  if (type === 'SUBWAY') return '지하철';
  return type;
}

// 카카오는 경로 첫/마지막 guide로 출발지·목적지를 함께 내려준다.
function carGuideKind(guides: CarGuide[], index: number): ItemKind {
  const guidance = guides[index].guidance ?? '';
  if (index === 0 && /출발/.test(guidance)) return 'start';
  if (index === guides.length - 1 && /목적지|도착/.test(guidance)) return 'end';
  return 'step';
}

function carTurnIcon(guide: CarGuide): RouteIconType {
  const guidance = guide.guidance ?? '';
  if (/유턴/.test(guidance)) return 'uturn';
  if (/좌/.test(guidance)) return 'left';
  if (/우/.test(guidance)) return 'right';
  return 'straight';
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
      icon: { type: kind === 'step' ? carTurnIcon(guide) : kind },
      point: guide.point,
      marker: kind === 'step' ? 'number' : 'none',
      chips: [],
    };
  });
}

function vehicleChips(step: DirectionsStep): RouteChip[] {
  const vehicles = uniqueVehicles(step);
  const color = stepColor(step);
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
  const items: RouteItem[] = [{
    kind: 'start',
    label: '출발',
    text: `출발 · ${places.origin}`,
    meta: '',
    icon: { type: 'start' },
    point: origin,
    marker: 'none',
    chips: [],
  }];

  steps.forEach((step, index) => {
    const icon = { type: stepIconType(step), color: stepColor(step) };
    const point = step.path[0] ?? null;
    const label = String(index + 1);

    if (isRideStep(step)) {
      const stopCount = Math.max(1, step.stops.length - 1);
      const unit = step.type === 'SUBWAY' ? '개 역' : '개 정류장';
      items.push({
        kind: 'step',
        label,
        text: `${boardStopName(step)} → ${alightStopName(step)}`,
        meta: `${stopCount}${unit} 이동 · 약 ${formatDuration(step.durationSeconds)}`,
        icon,
        point,
        marker: 'icon',
        chips: vehicleChips(step),
      });
      return;
    }

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

  items.push({
    kind: 'end',
    label: '도착',
    text: `도착 · ${places.destination}`,
    meta: '',
    icon: { type: 'end' },
    point: destination,
    marker: 'none',
    chips: [],
  });
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
  const stepsEl = document.querySelector<HTMLElement>('#directionSteps');
  const mapLinkEl = document.querySelector<HTMLAnchorElement>('#directionMapLink');
  const resultBarEl = mapLinkEl?.closest<HTMLElement>('.store-result-bar');

  if (!panel || !backButton || !closeButton || !destNameEl || !destAddressEl || !modeTabs || !statusEl
    || !routeHeadEl || !routeHeadInfoEl || !listBackButton || !summaryEl || !candidatesEl || !stepsEl
    || !mapLinkEl || !resultBarEl) {
    return NOOP_CONTROLLER;
  }

  // 카카오맵 링크는 지도 위 '검색 결과' 줄의 지도 오른쪽 끝에 둔다.
  const setMapLink = (url: string | null) => {
    if (url) mapLinkEl.href = url;
    else mapLinkEl.removeAttribute('href');
    mapLinkEl.hidden = !url;
    resultBarEl.classList.toggle('with-direction-link', Boolean(url));
  };

  let currentStore: Store | null = null;
  let currentMode: DirectionsMode = 'CAR';
  let currentOrigin: { latitude: number; longitude: number } | null = null;
  let requestId = 0;
  let closeTimeoutId: number | undefined;
  let polylines: KakaoPolyline[] = [];
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
    polylines.forEach((polyline) => polyline.setMap(null));
    polylines = [];
  };

  const drawLines = (lines: RouteLine[]) => {
    clearLines();
    const maps = deps.getMaps();
    const map = deps.getMap();
    if (!maps || !map) return;

    const bounds = new maps.LatLngBounds();
    let hasPoint = false;
    lines.forEach(({ path, color, dashed }) => {
      if (!path.length) return;
      const kakaoPath = path.map((point) => new maps.LatLng(point.latitude, point.longitude));
      const polyline = new maps.Polyline({
        path: kakaoPath,
        strokeWeight: dashed ? 5 : 6,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeStyle: dashed ? 'shortdash' : 'solid',
      });
      polyline.setMap(map);
      polylines.push(polyline);
      kakaoPath.forEach((point) => bounds.extend(point));
      hasPoint = true;
    });
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
    return element;
  };

  const renderRouteItems = (items: RouteItem[]) => {
    clearItems();
    stepsEl.replaceChildren();
    if (!items.length) {
      stepsEl.hidden = true;
      return;
    }

    routeItems = items;
    const maps = deps.getMaps();
    const map = deps.getMap();

    items.forEach((item, index) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'direction-guide-item';
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
      el.addEventListener('click', () => selectItem(index));
      stepsEl.appendChild(el);
      itemEls.push(el);

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
      overlay.setMap(map);
      itemMarkers.push({ overlay, element });
    });

    stepsEl.hidden = false;
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
    setMapLink(null);
    routeHeadEl.hidden = true;
    routeHeadInfoEl.replaceChildren();
    summaryEl.hidden = true;
    summaryEl.replaceChildren();
    candidatesEl.hidden = true;
    candidatesEl.replaceChildren();
    stepsEl.hidden = true;
    stepsEl.replaceChildren();
  };

  const renderSteps = (steps: DirectionsResult['steps']) => {
    stepsEl.replaceChildren();
    if (!steps.length) {
      stepsEl.hidden = true;
      return;
    }

    steps.forEach((step) => {
      const item = document.createElement('div');
      item.className = 'direction-step';
      const head = document.createElement('div');
      head.className = 'direction-step-head';
      const badge = document.createElement('i');
      badge.textContent = stepTypeLabel(step.type);
      const guidance = document.createElement('span');
      guidance.textContent = step.guidance;
      head.append(badge, guidance);
      const meta = document.createElement('small');
      meta.textContent = `${formatDistance(step.distanceMeters)} · ${formatDuration(step.durationSeconds)}`;
      item.append(head, meta);
      if (step.vehicles.length) {
        const vehicles = document.createElement('small');
        vehicles.className = 'direction-step-vehicles';
        vehicles.textContent = step.vehicles.join(', ');
        item.appendChild(vehicles);
      }
      stepsEl.appendChild(item);
    });
    stepsEl.hidden = false;
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

    setMapLink(result.landingUrl);
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
      drawLines(detail.steps.map((step) => ({
        path: step.path,
        color: stepColor(step),
        dashed: step.type === 'WALKING',
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
    rides.forEach((step) => {
      const row = document.createElement('span');
      row.className = 'direction-candidate-stop';
      const icon = createRouteIcon({ type: stepIconType(step), color: stepColor(step) }, 'direction-candidate-icon');
      const body = document.createElement('span');
      const name = document.createElement('span');
      name.className = 'direction-candidate-stop-name';
      name.textContent = boardStopName(step);
      body.append(name, createChips(vehicleChips(step)));
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

    try {
      const origin = currentOrigin ?? await deps.getOrigin();
      if (myRequestId !== requestId) return;
      currentOrigin = origin;
      showEndpoints(origin, store);

      const [results, originLabel] = await Promise.all([
        getStoreDirections(store.storeId, currentMode, origin.latitude, origin.longitude),
        resolveOriginLabel(origin),
      ]);
      if (myRequestId !== requestId) return;
      places = { origin: originLabel, destination: store.storeName };

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
      if (currentMode === 'CAR') renderRouteItems(buildCarItems(result.carInfo?.guides ?? [], places));
      else renderSteps(result.steps);
      drawLines([{ path: result.path, color: ROUTE_COLOR }]);
      setStatus('');
    } catch (error) {
      if (myRequestId !== requestId) return;
      setStatus(`경로 조회 실패: ${errorMessage(error)}`, true);
    }
  };

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
    setMapLink(null);
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
    clearRouteOverlays();
    clearEndpoints();
    setMapLink(null);
  };

  return { openForStore, close, dispose };
}
