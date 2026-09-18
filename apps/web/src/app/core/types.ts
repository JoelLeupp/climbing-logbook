// Mirrors the JSON shape returned by apps/api (camelCase, dates as ISO strings).
// Kept separate from packages/db's Drizzle types since those describe DB rows
// (Date objects), not wire format.

export type ClimbKind = 'route' | 'boulder';
export type LogStatus = 'flash' | 'redpoint' | 'project' | 'todo';
export type MediaEntityType = 'area' | 'sector' | 'climb' | 'log_entry';
export type MediaKind = 'image' | 'video';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ClimbingArea {
  id: string;
  name: string;
  description: string | null;
  howToGetThere: string | null;
  comment: string | null;
  personalRating: number | null;
  latitude: number;
  longitude: number;
  createdBy: string | null;
  createdAt: string;
}

export interface Sector {
  id: string;
  areaId: string;
  name: string;
  description: string | null;
  notes: string | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  createdBy: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Climb {
  id: string;
  sectorId: string;
  kind: ClimbKind;
  name: string;
  difficulty: string | null;
  rating: number | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  tags?: Tag[];
}

export interface LogEntry {
  id: string;
  userId: string;
  climbId: string;
  status: LogStatus;
  attempts: number | null;
  notes: string | null;
  climbedAt: string | null;
  createdAt: string;
}

export interface Media {
  id: string;
  entityType: MediaEntityType;
  entityId: string;
  kind: MediaKind;
  url: string;
  uploadedBy: string | null;
  createdAt: string;
}
