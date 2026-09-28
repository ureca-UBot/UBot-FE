import type { KakaoMapsApi } from '../types/kakao';
import { createRouteIcon } from './icons';
import { loadRecentOrigins, removeRecentOrigin, saveRecentOrigin } from './recentOrigins';

export interface OriginCandidate {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface OptionEntry {
  candidate: OriginCandidate;
  source: 'recent' | 'search';
}

const SEARCH_DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;
const MAX_MATCHED_RECENT = 3;
const OPTION_ID_PREFIX = 'directionOriginOption';

function isValidCandidate(candidate: OriginCandidate) {
  return Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude);
}

function searchKeyword(maps: KakaoMapsApi, query: string) {
  return new Promise<OriginCandidate[]>((resolve) => {
    new maps.services.Places().keywordSearch(query, (results, status) => {
      if (status !== maps.services.Status.OK) {
        resolve([]);
        return;
      }
      resolve(results.map((place) => ({
        name: place.place_name,
        address: place.road_address_name || place.address_name,
        latitude: Number(place.y),
        longitude: Number(place.x),
      })).filter(isValidCandidate));
    }, { size: MAX_RESULTS });
  });
}

function searchAddress(maps: KakaoMapsApi, query: string) {
  return new Promise<OriginCandidate[]>((resolve) => {
    new maps.services.Geocoder().addressSearch(query, (results, status) => {
      if (status !== maps.services.Status.OK) {
        resolve([]);
        return;
      }
      resolve(results.slice(0, MAX_RESULTS).map((result) => ({
        name: result.road_address?.address_name || result.address_name,
        address: result.address_name,
        latitude: Number(result.y),
        longitude: Number(result.x),
      })).filter(isValidCandidate));
    });
  });
}

// 백엔드 /locations/search는 로그인이 필요해서, 로그인 없이 쓰는 길찾기는 카카오 JS SDK로 직접 찾는다.
// 카카오 공개 API에는 자동완성 전용 API가 없어, 입력이 멈출 때마다 키워드 검색을 호출해 자동완성처럼 보여준다.
async function searchOrigins(maps: KakaoMapsApi, query: string) {
  const places = await searchKeyword(maps, query);
  return places.length ? places : searchAddress(maps, query);
}

// 입력이 없으면 최근 검색 전체를, 입력 중에는 입력어가 들어간 최근 검색만 위에 보여준다.
function matchRecent(query: string) {
  const recent = loadRecentOrigins();
  if (!query) return recent;
  const needle = query.toLowerCase();
  return recent
    .filter((item) => `${item.name} ${item.address}`.toLowerCase().includes(needle))
    .slice(0, MAX_MATCHED_RECENT);
}

interface OriginPickerOptions {
  input: HTMLInputElement;
  locateButton: HTMLButtonElement;
  results: HTMLElement;
  getMaps: () => KakaoMapsApi | null;
  onPick: (candidate: OriginCandidate) => void;
  onLocate: () => void;
}

export interface OriginPicker {
  setValue(text: string): void;
  setLocating(locating: boolean): void;
  focus(): void;
  // 입력칸 글자를 검색해 첫 결과를 출발지로 확정한다. 결과가 없으면 null.
  pickFirstMatch(query: string): Promise<OriginCandidate | null>;
  dispose(): void;
}

export function createOriginPicker(options: OriginPickerOptions): OriginPicker {
  const { input, locateButton, results } = options;
  let entries: OptionEntry[] = [];
  let activeIndex = -1;
  let debounceId: number | undefined;
  let searchToken = 0;
  let lastSearch: { query: string; results: OriginCandidate[] } | null = null;

  const optionEls = () => [...results.querySelectorAll<HTMLElement>('[role="option"]')];

  const closeResults = () => {
    window.clearTimeout(debounceId);
    searchToken += 1;
    results.hidden = true;
    results.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    entries = [];
    activeIndex = -1;
  };

  const setActive = (index: number) => {
    activeIndex = index;
    optionEls().forEach((option, optionIndex) => {
      option.classList.toggle('active', optionIndex === index);
      if (optionIndex === index) option.scrollIntoView({ block: 'nearest' });
    });
    if (index >= 0) input.setAttribute('aria-activedescendant', `${OPTION_ID_PREFIX}${index}`);
    else input.removeAttribute('aria-activedescendant');
  };

  const commit = (candidate: OriginCandidate) => {
    input.value = candidate.name;
    saveRecentOrigin(candidate);
    closeResults();
    options.onPick(candidate);
  };

  const appendSection = (title: string) => {
    const header = document.createElement('li');
    header.className = 'direction-origin-section';
    header.setAttribute('role', 'presentation');
    header.textContent = title;
    results.appendChild(header);
  };

  // 삭제·재렌더는 입력칸 포커스를 유지한 채 일어나야 해서, 필요한 순간에 호출할 수 있도록 선언형 함수로 둔다.
  function renderDropdown(query: string) {
    const recent = matchRecent(query);
    const searched = lastSearch?.query === query ? lastSearch.results : null;
    results.replaceChildren();
    entries = [];
    activeIndex = -1;

    const appendOption = (candidate: OriginCandidate, source: OptionEntry['source']) => {
      const index = entries.length;
      entries.push({ candidate, source });
      const option = document.createElement('li');
      option.id = `${OPTION_ID_PREFIX}${index}`;
      option.setAttribute('role', 'option');
      option.className = `direction-origin-option ${source}`;
      if (source === 'recent') option.appendChild(createRouteIcon({ type: 'recent' }, 'direction-origin-option-icon'));
      const text = document.createElement('span');
      text.className = 'direction-origin-option-text';
      const name = document.createElement('b');
      name.textContent = candidate.name;
      const address = document.createElement('small');
      address.textContent = candidate.address;
      text.append(name, address);
      option.appendChild(text);

      if (source === 'recent') {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.tabIndex = -1;
        remove.className = 'direction-origin-remove';
        remove.setAttribute('aria-label', `최근 검색에서 ${candidate.name} 삭제`);
        remove.textContent = '×';
        // 항목 선택(mousedown)과 입력칸 blur로 목록이 닫히는 것을 모두 막는다.
        remove.addEventListener('mousedown', (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        remove.addEventListener('click', () => {
          removeRecentOrigin(candidate);
          renderDropdown(query);
        });
        option.appendChild(remove);
      }

      // mousedown에서 막아야 입력칸 blur(목록 닫힘)보다 먼저 선택된다.
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        commit(candidate);
      });
      results.appendChild(option);
    };

    if (recent.length) {
      appendSection('최근 검색');
      recent.forEach((candidate) => appendOption(candidate, 'recent'));
    }
    if (searched) {
      if (recent.length && searched.length) appendSection('검색 결과');
      searched.forEach((candidate) => appendOption(candidate, 'search'));
      if (!searched.length) {
        const empty = document.createElement('li');
        empty.className = 'direction-origin-empty';
        empty.setAttribute('role', 'presentation');
        empty.textContent = `'${query}' 검색 결과가 없습니다.`;
        results.appendChild(empty);
      }
    }

    if (!results.childElementCount) {
      closeResults();
      return;
    }
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  const runSearch = async (query: string) => {
    const maps = options.getMaps();
    if (!maps) return;
    const token = ++searchToken;
    const list = await searchOrigins(maps, query);
    if (token !== searchToken || document.activeElement !== input) return;
    lastSearch = { query, results: list };
    renderDropdown(query);
  };

  const handleFocus = () => {
    // 이미 채워진 출발지를 새로 검색하기 쉽도록 전체 선택하고, 최근 검색을 먼저 보여준다.
    input.select();
    renderDropdown('');
  };

  const handleInput = () => {
    window.clearTimeout(debounceId);
    const query = input.value.trim();
    renderDropdown(query);
    if (query.length >= MIN_QUERY_LENGTH) {
      debounceId = window.setTimeout(() => void runSearch(query), SEARCH_DEBOUNCE_MS);
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    const open = !results.hidden && entries.length > 0;
    if (event.key === 'ArrowDown' && open) {
      event.preventDefault();
      setActive((activeIndex + 1) % entries.length);
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault();
      setActive(activeIndex <= 0 ? entries.length - 1 : activeIndex - 1);
    } else if (event.key === 'Delete' && open && entries[activeIndex]?.source === 'recent') {
      event.preventDefault();
      removeRecentOrigin(entries[activeIndex].candidate);
      renderDropdown(input.value.trim());
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (open && activeIndex >= 0) {
        commit(entries[activeIndex].candidate);
        return;
      }
      const query = input.value.trim();
      const firstResult = lastSearch?.query === query ? lastSearch.results[0] : undefined;
      if (firstResult) {
        commit(firstResult);
      } else if (query.length >= MIN_QUERY_LENGTH) {
        window.clearTimeout(debounceId);
        void runSearch(query);
      }
    } else if (event.key === 'Escape') {
      closeResults();
    }
  };

  const handleLocate = () => {
    closeResults();
    options.onLocate();
  };

  input.addEventListener('focus', handleFocus);
  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeydown);
  input.addEventListener('blur', closeResults);
  locateButton.addEventListener('click', handleLocate);

  return {
    setValue(text) {
      if (document.activeElement !== input) input.value = text;
    },
    setLocating(locating) {
      locateButton.disabled = locating;
      locateButton.classList.toggle('locating', locating);
      locateButton.setAttribute('aria-busy', String(locating));
    },
    focus() {
      input.focus();
    },
    async pickFirstMatch(query) {
      const maps = options.getMaps();
      if (!maps) return null;
      closeResults();
      const [first] = await searchOrigins(maps, query);
      if (!first) return null;
      commit(first);
      return first;
    },
    dispose() {
      closeResults();
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keydown', handleKeydown);
      input.removeEventListener('blur', closeResults);
      locateButton.removeEventListener('click', handleLocate);
    },
  };
}
