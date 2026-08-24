export type VideoStatus = "processing" | "ready" | "failed";

export type MediaType = "video" | "audio";

/** Firestore videos/{videoId} document, written by the transcode Cloud Function */
export interface CatalogVideo {
  id: string;
  name: string;
  status: VideoStatus;
  active: boolean;
  /** Absent on docs created before audio support — treat as "video" */
  mediaType?: MediaType;
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
  mediaType: MediaType;
  thumbnailURL?: string;
  legacyFileName?: string;
}

export type VideoDownloadProgress = {
  videoId: string;
  bytesWritten: number;
  /** -1 when the server did not send Content-Length */
  totalBytes: number;
};

/** Progress of a background catalog sync (item-level, not bytes) */
export type SyncStatus = {
  /** Number of media items that need downloading this sync */
  total: number;
  /** Items finished so far (failed downloads are not counted) */
  completed: number;
  /** Name of the item currently downloading, null once the loop ends */
  currentName: string | null;
};
