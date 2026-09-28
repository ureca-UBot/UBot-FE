export interface BubblePlacement {
  // 지도 컨테이너 기준 마커 끝점의 현재 화면 좌표
  marker: { x: number; y: number };
  // 이동 후 마커가 있기를 바라는 화면 좌표 (가운데로 옮길 때는 지도 중앙, 아니면 현재 위치)
  desired: { x: number; y: number };
  bubbleWidth: number;
  bubbleHeight: number;
  // 마커 끝점에서 말풍선 아래 끝까지의 거리 (마커 높이 + 꼬리)
  gap: number;
  mapWidth: number;
  mapHeight: number;
  padding: number;
}

/**
 * 말풍선이 지도 밖으로 나가지 않도록 지도를 얼마나 옮겨야 하는지(panBy에 넘길 픽셀)를 계산한다.
 * 말풍선은 마커 위 가운데에 뜨므로 좌우·위쪽 넘침을, 마커 자체는 아래쪽 넘침을 본다.
 * 반환값만큼 지도를 옮기면 마커가 desired에서 넘친 만큼 안쪽으로 밀린 자리에 온다.
 */
export function bubblePanOffset({
  marker,
  desired,
  bubbleWidth,
  bubbleHeight,
  gap,
  mapWidth,
  mapHeight,
  padding,
}: BubblePlacement) {
  const halfWidth = bubbleWidth / 2;
  const top = desired.y - gap - bubbleHeight;

  let overflowX = 0;
  if (desired.x - halfWidth < padding) overflowX = desired.x - halfWidth - padding;
  else if (desired.x + halfWidth > mapWidth - padding) overflowX = desired.x + halfWidth - (mapWidth - padding);

  let overflowY = 0;
  if (top < padding) overflowY = top - padding;
  else if (desired.y > mapHeight - padding) overflowY = desired.y - (mapHeight - padding);

  const finalX = desired.x - overflowX;
  const finalY = desired.y - overflowY;
  return { x: marker.x - finalX, y: marker.y - finalY };
}
