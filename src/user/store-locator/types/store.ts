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
