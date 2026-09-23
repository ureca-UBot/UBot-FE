import { getStoreDirections, getTransitDetail } from '../api/directions';
import type { KakaoMap, KakaoMapsApi, KakaoPolyline } from '../types/kakao';
import type { Store } from '../types/store';
import type { DirectionsMode, DirectionsResult } from '../types/directions';

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

  const clearPolyline = () => {
    polyline?.setMap(null);
    polyline = null;
  };

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

  const renderCarGuides = (guides: NonNullable<DirectionsResult['carInfo']>['guides']) => {
    stepsEl.replaceChildren();
    if (!guides.length) {
      stepsEl.hidden = true;
      return;
    }

    guides.forEach((guide) => {
      const item = document.createElement('div');
      item.className = 'direction-step';
      const head = document.createElement('div');
      head.className = 'direction-step-head';
      const guidance = document.createElement('span');
      guidance.textContent = guide.guidance || guide.name;
      head.appendChild(guidance);
      const meta = document.createElement('small');
      meta.textContent = `${formatDistance(guide.distanceMeters)} · ${formatDuration(guide.durationSeconds)}`;
      item.append(head, meta);
      stepsEl.appendChild(item);
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
    clearPolyline();
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
    clearPolyline();
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
    clearPolyline();
  };

  return { openForStore, dispose };
}
