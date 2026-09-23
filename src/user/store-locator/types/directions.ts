export type DirectionsMode = 'WALK' | 'CAR' | 'TRANSIT';

export interface DirectionsPoint {
  latitude: number;
  longitude: number;
}

export interface DirectionsStep {
  type: string;
  guidance: string;
  distanceMeters: number;
  durationSeconds: number;
  stops: string[];
  vehicles: string[];
  path: DirectionsPoint[];
}

export interface TransitFare {
  value: number | null;
  min: number | null;
  max: number | null;
}

export interface TransitInfo {
  fare: TransitFare;
  transfers: number;
  type: string;
}

export interface CarFare {
  taxi: number | null;
  toll: number | null;
}

export interface CarGuide {
  name: string;
  guidance: string;
  distanceMeters: number;
  durationSeconds: number;
  point: DirectionsPoint;
}

export interface CarInfo {
  fare: CarFare;
  guides: CarGuide[];
}

export interface DirectionsResult {
  mode: DirectionsMode;
  distanceMeters: number;
  durationSeconds: number;
  path: DirectionsPoint[];
  steps: DirectionsStep[];
  landingUrl: string | null;
  transitInfo: TransitInfo | null;
  carInfo: CarInfo | null;
}
