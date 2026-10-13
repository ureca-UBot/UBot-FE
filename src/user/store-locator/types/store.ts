export interface StoreService {
  code: string;
  name: string;
}

export interface Store {
  storeId: number;
  storeName: string;
  sido: string;
  sigungu: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
  businessHours: string | null;
  distanceKm?: number;
  services?: StoreService[];
}

export interface MapStore extends Store {
  distanceKm?: number;
}

// BE StoreMapResult: 채팅 답변이 기준 위치 반경에서 조회한 매장 목록입니다.
// placeName이 null이면 사용자의 현재 위치를 기준으로 조회한 결과입니다.
export interface StoreSearchResult {
  center: { latitude: number; longitude: number };
  placeName: string | null;
  radiusKm: number;
  stores: Store[];
}

export interface MapCluster {
  latitude: number;
  longitude: number;
  count: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext?: boolean;
}

export interface LocationSearchResult {
  name: string;
  address: string;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
}

export interface MapBoundsQuery {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  types?: string[];
}
