export interface LinkPlace {
  name: string;
  latitude: number;
  longitude: number;
}

// 카카오맵 URL은 '이름,위도,경도'를 쉼표로 구분하므로 이름 안의 쉼표는 공백으로 바꾼다.
function encodePlace({ name, latitude, longitude }: LinkPlace) {
  const safeName = encodeURIComponent(name.replace(/,/g, ' ').trim() || '위치');
  return `${safeName},${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

export function kakaoMapPlaceUrl(place: LinkPlace) {
  return `https://map.kakao.com/link/map/${encodePlace(place)}`;
}

export function kakaoRouteUrl(from: LinkPlace, to: LinkPlace) {
  return `https://map.kakao.com/link/from/${encodePlace(from)}/to/${encodePlace(to)}`;
}
