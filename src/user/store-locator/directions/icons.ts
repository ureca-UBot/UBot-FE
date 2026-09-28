export type RouteIconType =
  | 'start'
  | 'end'
  | 'straight'
  | 'left'
  | 'right'
  | 'uturn'
  | 'crosswalk'
  | 'walk'
  | 'bus'
  | 'subway';

export interface RouteIcon {
  type: RouteIconType;
  color?: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// 모든 아이콘은 24x24 viewBox에서 같은 선 굵기로 그려지도록 stroke 기반으로 정의한다.
const ICON_PATHS: Record<RouteIconType, { paths: string[]; filled?: boolean }> = {
  start: { paths: ['M12 7a5 5 0 1 1 0 10a5 5 0 1 1 0-10z'], filled: true },
  end: { paths: ['M6 21V4', 'M6 4h11l-2.5 4 2.5 4H6'] },
  straight: { paths: ['M12 20V5', 'M6.5 10.5 12 5l5.5 5.5'] },
  right: { paths: ['M7 20v-7a4 4 0 0 1 4-4h8', 'M15 5l4 4-4 4'] },
  left: { paths: ['M17 20v-7a4 4 0 0 0-4-4H5', 'M9 5 5 9l4 4'] },
  uturn: { paths: ['M16 20V9a4 4 0 0 0-8 0v7', 'M4.5 12.5 8 16l3.5-3.5'] },
  crosswalk: { paths: ['M4 4v16', 'M20 4v16', 'M8 7h8', 'M8 12h8', 'M8 17h8'] },
  walk: {
    paths: [
      'M14 4.5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0z',
      'M12 8l-1.5 5',
      'M10.5 13l3 2.5 1 5',
      'M10.5 13 8.5 20.5',
      'M8 11.5l3-3.5 2.5 3 2.5 1',
    ],
  },
  bus: {
    paths: [
      'M7 4h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
      'M5 11h14',
      'M8 18v2',
      'M16 18v2',
      'M8.5 14.5h.01',
      'M15.5 14.5h.01',
    ],
  },
  subway: {
    paths: [
      'M8 3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z',
      'M5 10h14',
      'M9 13.5h.01',
      'M15 13.5h.01',
      'M9 17l-2 4',
      'M15 17l2 4',
    ],
  },
};

// 도보 안내는 지명이 섞인 문장이라 '우체국'의 '우'처럼 한 글자로 판정하면 오탐이 난다.
export function turnIconType(guidance: string | null | undefined): RouteIconType {
  const text = guidance ?? '';
  if (/유턴/.test(text)) return 'uturn';
  if (/횡단보도/.test(text)) return 'crosswalk';
  if (/좌회전|왼쪽|좌측/.test(text)) return 'left';
  if (/우회전|오른쪽|우측/.test(text)) return 'right';
  return 'straight';
}

export function createRouteIcon(icon: RouteIcon, className: string) {
  const wrapper = document.createElement('span');
  wrapper.className = className;
  wrapper.setAttribute('aria-hidden', 'true');
  if (icon.color) {
    wrapper.classList.add('tinted');
    wrapper.style.setProperty('--icon-color', icon.color);
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const { paths, filled } = ICON_PATHS[icon.type];
  paths.forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  if (filled) svg.classList.add('filled');
  wrapper.appendChild(svg);
  return wrapper;
}
