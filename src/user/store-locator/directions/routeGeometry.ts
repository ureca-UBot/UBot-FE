export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenProjection<T> {
  toScreen(position: T): ScreenPoint;
  fromScreen(point: ScreenPoint): T;
}

// 화면에서 이보다 가까운 점은 합친다. 축소 상태에서 조밀한 좌표의 방향이 튀어 선이 들쭉날쭉해지는 것을 막는다.
const MIN_SEGMENT_PX = 2;

/**
 * 경로를 진행 방향 오른쪽(우측통행)으로 offsetPx만큼 평행 이동한다.
 * 같은 도로를 왕복하는 유턴 구간은 가는 길·오는 길이 도로 중심 양쪽으로 갈라져 U자로 보인다.
 * 각 구간을 따로 밀고 끝점끼리 이어 붙이므로, 유턴 꼭짓점에서는 두 선을 잇는 짧은 가로선이 생긴다.
 * 화면 픽셀 기준이라 지도 확대 수준이 바뀌면 다시 계산해야 한다.
 */
export function offsetPathToRight<T>(path: T[], projection: ScreenProjection<T>, offsetPx: number): T[] {
  if (path.length < 2 || offsetPx === 0) return path;

  const screen: ScreenPoint[] = [];
  path.forEach((position, index) => {
    const point = projection.toScreen(position);
    const last = screen[screen.length - 1];
    const isLast = index === path.length - 1;
    if (!last || isLast || Math.hypot(point.x - last.x, point.y - last.y) >= MIN_SEGMENT_PX) {
      screen.push(point);
    }
  });

  const shifted: T[] = [];
  for (let index = 0; index < screen.length - 1; index += 1) {
    const from = screen[index];
    const to = screen[index + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.01) continue;
    // 화면 좌표는 y가 아래로 커지므로, 진행 방향 (dx, dy)의 오른쪽 법선은 (-dy, dx)다.
    const nx = (-dy / length) * offsetPx;
    const ny = (dx / length) * offsetPx;
    shifted.push(projection.fromScreen({ x: from.x + nx, y: from.y + ny }));
    shifted.push(projection.fromScreen({ x: to.x + nx, y: to.y + ny }));
  }
  return shifted.length ? shifted : path;
}
