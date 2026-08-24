import type { VideoStatus } from "./videos";

/** Firestore banners/{bannerId} document, completed by the processBanner Cloud Function */
export interface CatalogBanner {
  id: string;
  name: string;
  status: VideoStatus;
  active: boolean;
  /** Catalog video doc ids this banner is attached to; empty = default set */
  videoIds: string[];
  /** Ascending sort position within the carousel */
  order: number;
  version: number;
  storagePath?: string;
  downloadURL?: string;
  sizeBytes?: number;
  md5?: string;
  error?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
