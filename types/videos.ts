export type VideoStatus = "processing" | "ready" | "failed";

/** Firestore videos/{videoId} document, written by the transcode Cloud Function */
export interface CatalogVideo {
  id: string;
  name: string;
  status: VideoStatus;
  active: boolean;
  version: number;
  storagePath: string;
  downloadURL: string;
  thumbnailURL?: string;
  sizeBytes: number;
  md5: string;
  durationSec: number;
  /** Bundled filename this video replaced (seeded catalog); doubles as its doc id */
  legacyFileName?: string;
  error?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Locally downloaded copy of a catalog video */
export interface ManifestEntry {
  videoId: string;
  version: number;
  sizeBytes: number;
  md5: string;
  durationSec: number;
  name: string;
  legacyFileName?: string;
}

export type VideoDownloadProgress = {
  videoId: string;
  bytesWritten: number;
  /** -1 when the server did not send Content-Length */
  totalBytes: number;
};
