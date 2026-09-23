export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoPoint {
  x: number;
  y: number;
}

export interface KakaoBounds {
  extend(position: KakaoLatLng): void;
  getSouthWest(): KakaoLatLng;
  getNorthEast(): KakaoLatLng;
}

export type KakaoMarkerImage = object;

export interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
  getPosition(): KakaoLatLng;
}

export interface KakaoInfoWindow {
  close(): void;
  setContent(content: HTMLElement | string): void;
  open(map: KakaoMap, marker: KakaoMarker): void;
}

export interface KakaoPolyline {
  setMap(map: KakaoMap | null): void;
  setPath(path: KakaoLatLng[]): void;
}

export interface KakaoMap {
  addControl(control: object, position: unknown): void;
  getBounds(): KakaoBounds;
  getCenter(): KakaoLatLng;
  getLevel(): number;
  panTo(position: KakaoLatLng): void;
  relayout(): void;
  setBounds(bounds: KakaoBounds): void;
  setCenter(position: KakaoLatLng): void;
  setLevel(level: number): void;
  setMaxLevel(level: number): void;
  setMinLevel(level: number): void;
}

export type KakaoEventTarget = KakaoMap | KakaoMarker;
export type KakaoEventHandler = () => void;

export interface KakaoMapsApi {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (element: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: {
    map?: KakaoMap;
    position: KakaoLatLng;
    title?: string;
    image?: KakaoMarkerImage;
    zIndex?: number;
  }) => KakaoMarker;
  MarkerImage: new (
    source: string,
    size: object,
    options?: { offset?: object },
  ) => KakaoMarkerImage;
  Size: new (width: number, height: number) => object;
  Point: new (x: number, y: number) => object;
  InfoWindow: new (options?: { zIndex?: number }) => KakaoInfoWindow;
  Polyline: new (options: {
    path: KakaoLatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
  }) => KakaoPolyline;
  ZoomControl: new () => object;
  ControlPosition: { RIGHT: unknown };
  event: {
    addListener(target: KakaoEventTarget, event: string, handler: KakaoEventHandler): void;
    removeListener(target: KakaoEventTarget, event: string, handler: KakaoEventHandler): void;
  };
  services: {
    Geocoder: new () => {
      addressSearch(
        address: string,
        callback: (results: Array<{ x: string; y: string }>, status: string) => void,
      ): void;
    };
    Status: { OK: string };
  };
}

declare global {
  interface Window {
    kakao?: {
      maps?: KakaoMapsApi;
    };
  }
}
