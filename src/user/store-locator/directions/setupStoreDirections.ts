import { getStoreDirections, getTransitDetail } from '../api/directions';
import type { KakaoCustomOverlay, KakaoMap, KakaoMapsApi, KakaoPolyline } from '../types/kakao';
import type { Store } from '../types/store';
import type { CarGuide, DirectionsMode, DirectionsResult } from '../types/directions';

type GuideKind = 'start' | 'end' | 'step';

const GUIDE_MARKER_Z = 3;
const GUIDE_MARKER_ACTIVE_Z = 6;
const GUIDE_POPUP_Z = 10;
const GUIDE_FOCUS_MAX_LEVEL = 4;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))}m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)}km`;
}

function formatFare(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function stepTypeLabel(type: string) {
  if (type === 'WALKING') return '도보';
  if (type === 'BUS') return '버스';
  if (type === 'SUBWAY') return '지하철';
  return type;
}

function transitTypeLabel(type: string | undefined) {
  if (type === 'BUS') return '버스';
  if (type === 'SUBWAY') return '지하철';
  return '버스+지하철';
}

// 카카오는 경로 첫/마지막 guide로 출발지·목적지를 함께 내려준다.
function guideKind(guides: CarGuide[], index: number): GuideKind {
  const guidance = guides[index].guidance ?? '';
  if (index === 0 && /출발/.test(guidance)) return 'start';
  if (index === guides.length - 1 && /목적지|도착/.test(guidance)) return 'end';
  return 'step';
}

// 출발·도착은 번호에서 빼고, 중간 안내만 1부터 센다.
function guideLabels(guides: CarGuide[]) {
  let stepNumber = 0;
  return guides.map((_, index) => {
    const kind = guideKind(guides, index);
    if (kind === 'start') return '출발';
    if (kind === 'end') return '도착';
    stepNumber += 1;
    return String(stepNumber);
  });
}

type GuideIconType = 'start' | 'end' | 'straight' | 'left' | 'right' | 'uturn';

const SVG_NS = 'http://www.w3.org/2000/svg';

const GUIDE_ICON_PATHS: Record<GuideIconType, { paths: string[]; filled?: boolean }> = {
  start: { paths: ['M12 7a5 5 0 1 1 0 10a5 5 0 1 1 0-10z'], filled: true },
  end: { paths: ['M6 21V4', 'M6 4h11l-2.5 4 2.5 4H6'] },
  straight: { paths: ['M12 20V5', 'M6.5 10.5 12 5l5.5 5.5'] },
  right: { paths: ['M7 20v-7a4 4 0 0 1 4-4h8', 'M15 5l4 4-4 4'] },
  left: { paths: ['M17 20v-7a4 4 0 0 0-4-4H5', 'M9 5 5 9l4 4'] },
  uturn: { paths: ['M16 20V9a4 4 0 0 0-8 0v7', 'M4.5 12.5 8 16l3.5-3.5'] },
};

function guideIconType(guide: CarGuide, kind: GuideKind): GuideIconType {
  if (kind === 'start' || kind === 'end') return kind;
  const guidance = guide.guidance ?? '';
  if (/유턴/.test(guidance)) return 'uturn';
  if (/좌/.test(guidance)) return 'left';
  if (/우/.test(guidance)) return 'right';
  return 'straight';
}

function createGuideIcon(type: GuideIconType, className: string) {
  const wrapper = document.createElement('span');
  wrapper.className = className;
  wrapper.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const { paths, filled } = GUIDE_ICON_PATHS[type];
  paths.forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  if (filled) svg.classList.add('filled');
  wrapper.appendChild(svg);
  return wrapper;
}

function describeGuide(guide: CarGuide, kind: GuideKind) {
  if (kind === 'start') return '출발';
  const action = kind === 'end' ? '목적지 도착' : (guide.guidance || '직진');
  if (!guide.distanceMeters) return action;
  const road = guide.name && !/출발지|목적지/.test(guide.name) ? `${guide.name} ` : '';
  return `${road}${formatDistance(guide.distanceMeters)} 이동, ${action}`;
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
}

export interface DirectionsController {
  openForStore(store: Store): void;
  dispose(): void;
}

const NOOP_CONTROLLER: DirectionsController = {
  openForStore: () => {},
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
  const summaryEl = document.querySelector<HTMLElement>('#directionSummary');
  const candidatesEl = document.querySelector<HTMLElement>('#directionCandidates');
  const stepsEl = document.querySelector<HTMLElement>('#directionSteps');

  if (!panel || !backButton || !closeButton || !destNameEl || !destAddressEl
    || !modeTabs || !statusEl || !summaryEl || !candidatesEl || !stepsEl) {
    return NOOP_CONTROLLER;
  }

  let currentStore: Store | null = null;
  let currentMode: DirectionsMode = 'CAR';
  let currentOrigin: { latitude: number; longitude: number } | null = null;
  let requestId = 0;
  let polyline: KakaoPolyline | null = null;
  let closeTimeoutId: number | undefined;
  let guides: CarGuide[] = [];
  let guideItems: HTMLButtonElement[] = [];
  let guideMarkers: Array<{ overlay: KakaoCustomOverlay; element: HTMLElement } | null> = [];
  let guidePopup: KakaoCustomOverlay | null = null;
  let activeGuideIndex = -1;

  const clearPolyline = () => {
    polyline?.setMap(null);
    polyline = null;
  };

  const clearGuides = () => {
    guideMarkers.forEach((marker) => marker?.overlay.setMap(null));
    guidePopup?.setMap(null);
    guides = [];
    guideItems = [];
    guideMarkers = [];
    guidePopup = null;
    activeGuideIndex = -1;
  };

  const clearRouteOverlays = () => {
    clearPolyline();
    clearGuides();
  };

  const setGuideActive = (index: number, active: boolean) => {
    const item = guideItems[index];
    const marker = guideMarkers[index];
    item?.classList.toggle('active', active);
    if (active) item?.setAttribute('aria-current', 'step');
    else item?.removeAttribute('aria-current');
    marker?.element.classList.toggle('active', active);
    marker?.overlay.setZIndex(active ? GUIDE_MARKER_ACTIVE_Z : GUIDE_MARKER_Z);
  };

  const closeGuidePopup = () => {
    guidePopup?.setMap(null);
    guidePopup = null;
    if (activeGuideIndex !== -1) setGuideActive(activeGuideIndex, false);
    activeGuideIndex = -1;
  };

  const buildGuidePopup = (index: number) => {
    const guide = guides[index];
    const kind = guideKind(guides, index);
    const root = document.createElement('div');
    root.className = 'direction-guide-popup';

    const icon = createGuideIcon(guideIconType(guide, kind), 'direction-guide-icon');
    const text = document.createElement('span');
    text.className = 'direction-guide-popup-text';
    text.textContent = describeGuide(guide, kind);

    const nav = document.createElement('div');
    nav.className = 'direction-guide-popup-nav';
    nav.append(
      createIconButton('‹', '이전 안내', () => selectGuide(index - 1), index === 0),
      createIconButton('›', '다음 안내', () => selectGuide(index + 1), index === guides.length - 1),
    );
    const close = createIconButton('×', '안내 닫기', closeGuidePopup);
    close.className = 'direction-guide-popup-close';

    root.append(icon, text, nav, close);
    return root;
  };

  function selectGuide(index: number) {
    const guide = guides[index];
    if (!guide) return;

    if (activeGuideIndex !== -1) setGuideActive(activeGuideIndex, false);
    activeGuideIndex = index;
    setGuideActive(index, true);
    guideItems[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    guidePopup?.setMap(null);
    guidePopup = null;
    const maps = deps.getMaps();
    const map = deps.getMap();
    if (!maps || !map || !guide.point) return;

    const position = new maps.LatLng(guide.point.latitude, guide.point.longitude);
    guidePopup = new maps.CustomOverlay({
      position,
      content: buildGuidePopup(index),
      xAnchor: 0.5,
      yAnchor: 1,
      zIndex: GUIDE_POPUP_Z,
      clickable: true,
    });
    guidePopup.setMap(map);
    if (map.getLevel() > GUIDE_FOCUS_MAX_LEVEL) map.setLevel(GUIDE_FOCUS_MAX_LEVEL);
    map.panTo(position);
  }

  const drawPath = (path: DirectionsResult['path']) => {
    const maps = deps.getMaps();
    const map = deps.getMap();
    clearPolyline();
    if (!maps || !map || !path.length) return;

    const kakaoPath = path.map((point) => new maps.LatLng(point.latitude, point.longitude));
    polyline = new maps.Polyline({
      path: kakaoPath,
      strokeWeight: 5,
      strokeColor: '#1677ff',
      strokeOpacity: 0.9,
      strokeStyle: 'solid',
    });
    polyline.setMap(map);

    const bounds = new maps.LatLngBounds();
    kakaoPath.forEach((point) => bounds.extend(point));
    map.setBounds(bounds);
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

  const renderCarGuides = (nextGuides: CarGuide[]) => {
    clearGuides();
    stepsEl.replaceChildren();
    if (!nextGuides.length) {
      stepsEl.hidden = true;
      return;
    }

    guides = nextGuides;
    const maps = deps.getMaps();
    const map = deps.getMap();
    const labels = guideLabels(nextGuides);

    nextGuides.forEach((guide, index) => {
      const kind = guideKind(nextGuides, index);
      const label = labels[index];
      const description = describeGuide(guide, kind);

      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'direction-guide-item';
      const number = document.createElement('span');
      number.className = `direction-guide-no ${kind}`;
      number.textContent = label;
      const icon = createGuideIcon(guideIconType(guide, kind), 'direction-guide-icon');
      const body = document.createElement('span');
      body.className = 'direction-guide-body';
      const text = document.createElement('span');
      text.className = 'direction-guide-text';
      text.textContent = description;
      body.appendChild(text);
      if (guide.durationSeconds > 0) {
        const meta = document.createElement('small');
        meta.textContent = `약 ${formatDuration(guide.durationSeconds)}`;
        body.appendChild(meta);
      }
      item.append(number, icon, body);
      item.addEventListener('click', () => selectGuide(index));
      stepsEl.appendChild(item);
      guideItems.push(item);

      if (!maps || !map || !guide.point) {
        guideMarkers.push(null);
        return;
      }
      const element = document.createElement('div');
      element.className = `direction-guide-marker ${kind}`;
      element.textContent = label;
      element.title = description;
      element.addEventListener('click', () => selectGuide(index));
      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(guide.point.latitude, guide.point.longitude),
        content: element,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: GUIDE_MARKER_Z,
        clickable: true,
      });
      overlay.setMap(map);
      guideMarkers.push({ overlay, element });
    });

    stepsEl.hidden = false;
  };

  const renderSummary = (result: DirectionsResult) => {
    summaryEl.replaceChildren();
    const time = document.createElement('b');
    time.textContent = formatDuration(result.durationSeconds);
    const distance = document.createElement('span');
    distance.textContent = formatDistance(result.distanceMeters);
    summaryEl.append(time, distance);

    if (result.carInfo?.fare) {
      const { taxi, toll } = result.carInfo.fare;
      if (typeof taxi === 'number') {
        const fare = document.createElement('em');
        fare.textContent = `택시비 약 ${formatFare(taxi)}`;
        summaryEl.appendChild(fare);
      }
      if (typeof toll === 'number' && toll > 0) {
        const tollEl = document.createElement('em');
        tollEl.textContent = `통행료 ${formatFare(toll)}`;
        summaryEl.appendChild(tollEl);
      }
    }

    if (result.transitInfo) {
      const { value, min, max } = result.transitInfo.fare;
      const fareText = typeof value === 'number'
        ? formatFare(value)
        : (typeof min === 'number' && typeof max === 'number' ? `${formatFare(min)} ~ ${formatFare(max)}` : '');
      if (fareText) {
        const fare = document.createElement('em');
        fare.textContent = fareText;
        summaryEl.appendChild(fare);
      }
      if (result.transitInfo.transfers > 0) {
        const transfers = document.createElement('em');
        transfers.textContent = `환승 ${result.transitInfo.transfers}회`;
        summaryEl.appendChild(transfers);
      }
    }

    if (result.landingUrl) {
      const link = document.createElement('a');
      link.href = result.landingUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.className = 'direction-landing-link';
      link.textContent = '카카오맵에서 보기';
      summaryEl.appendChild(link);
    }

    summaryEl.hidden = false;
  };

  const selectTransitCandidate = async (candidate: DirectionsResult) => {
    if (!currentStore || !currentOrigin) return;
    const myRequestId = ++requestId;
    setStatus('상세 경로를 불러오는 중입니다.');

    try {
      const detail = await getTransitDetail(
        currentStore.storeId,
        currentOrigin.latitude,
        currentOrigin.longitude,
        candidate,
      );
      if (myRequestId !== requestId) return;
      candidatesEl.hidden = true;
      candidatesEl.replaceChildren();
      renderSummary(detail);
      renderSteps(detail.steps);
      drawPath(detail.path);
      setStatus('');
    } catch (error) {
      if (myRequestId !== requestId) return;
      setStatus(`상세 경로 조회 실패: ${errorMessage(error)}`, true);
    }
  };

  const renderTransitCandidates = (candidates: DirectionsResult[]) => {
    candidatesEl.replaceChildren();
    if (!candidates.length) {
      candidatesEl.hidden = true;
      setStatus('대중교통 경로를 찾을 수 없습니다.', true);
      return;
    }

    candidates.forEach((candidate, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === 0 ? 'direction-candidate recommended' : 'direction-candidate';
      const time = document.createElement('b');
      time.textContent = formatDuration(candidate.durationSeconds);
      const meta = document.createElement('small');
      meta.textContent = `${transitTypeLabel(candidate.transitInfo?.type)} · 환승 ${candidate.transitInfo?.transfers ?? 0}회 · ${formatDistance(candidate.distanceMeters)}`;
      button.append(time, meta);
      button.addEventListener('click', () => void selectTransitCandidate(candidate));
      candidatesEl.appendChild(button);
    });

    candidatesEl.hidden = false;
  };

  const loadDirections = async () => {
    if (!currentStore) return;
    const store = currentStore;
    clearResults();
    clearRouteOverlays();
    setStatus('경로를 찾고 있습니다.');
    const myRequestId = ++requestId;

    try {
      const origin = currentOrigin ?? await deps.getOrigin();
      if (myRequestId !== requestId) return;
      currentOrigin = origin;

      const results = await getStoreDirections(store.storeId, currentMode, origin.latitude, origin.longitude);
      if (myRequestId !== requestId) return;

      if (!results.length) {
        setStatus('경로를 찾을 수 없습니다.', true);
        return;
      }

      if (currentMode === 'TRANSIT') {
        renderTransitCandidates(results);
        setStatus('');
        return;
      }

      const [result] = results;
      renderSummary(result);
      if (currentMode === 'CAR') renderCarGuides(result.carInfo?.guides ?? []);
      else renderSteps(result.steps);
      drawPath(result.path);
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
    window.clearTimeout(closeTimeoutId);
    panel.classList.remove('open');
    clearRouteOverlays();
    currentStore = null;
    closeTimeoutId = window.setTimeout(() => {
      if (!panel.classList.contains('open')) panel.hidden = true;
    }, 240);
  };

  modeTabs.addEventListener('click', handleModeClick);
  backButton.addEventListener('click', close);
  closeButton.addEventListener('click', close);

  const openForStore = (store: Store) => {
    window.clearTimeout(closeTimeoutId);
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
    clearRouteOverlays();
  };

  return { openForStore, dispose };
}
