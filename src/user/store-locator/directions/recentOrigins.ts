import type { OriginCandidate } from './originPicker';

const COOKIE_NAME = 'ubot_recent_origins';
// 쿠키는 4KB 제한이 있고 한글은 인코딩 후 글자당 9바이트라, 개수와 글자 수를 함께 제한한다.
const MAX_RECENT = 5;
const MAX_TEXT_LENGTH = 60;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function isCandidate(value: unknown): value is OriginCandidate {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.name === 'string'
    && typeof item.address === 'string'
    && typeof item.latitude === 'number' && Number.isFinite(item.latitude)
    && typeof item.longitude === 'number' && Number.isFinite(item.longitude);
}

function isSame(a: OriginCandidate, b: OriginCandidate) {
  return a.name === b.name && a.address === b.address;
}

function writeRecent(list: OriginCandidate[]) {
  const value = encodeURIComponent(JSON.stringify(list));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function loadRecentOrigins(): OriginCandidate[] {
  const raw = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(parsed) ? parsed.filter(isCandidate).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecentOrigin(candidate: OriginCandidate) {
  const entry: OriginCandidate = {
    name: candidate.name.slice(0, MAX_TEXT_LENGTH),
    address: candidate.address.slice(0, MAX_TEXT_LENGTH),
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  };
  const next = [entry, ...loadRecentOrigins().filter((item) => !isSame(item, entry))].slice(0, MAX_RECENT);
  writeRecent(next);
}

export function removeRecentOrigin(candidate: OriginCandidate) {
  writeRecent(loadRecentOrigins().filter((item) => !isSame(item, candidate)));
}
