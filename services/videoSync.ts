import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { AppState, AppStateStatus, NativeEventSubscription } from "react-native";
import { FIRESTORE_DB } from "@/FirebaseConfig";
import {
  CatalogVideo,
  ManifestEntry,
  SyncStatus,
  VideoDownloadProgress,
} from "@/types/videos";

const MANIFEST_KEY = "videoManifest.v1";

type Manifest = Record<string, ManifestEntry>;
type ProgressListener = (progress: VideoDownloadProgress) => void;
type SyncStatusListener = (status: SyncStatus | null) => void;

function videoDir(): Directory {
  return new Directory(Paths.document, "videos");
}

function fileFor(videoId: string, version: number): File {
  return new File(videoDir(), `${videoId}_v${version}.mp4`);
}

function snapshotToVideo(id: string, data: Record<string, any>): CatalogVideo {
  return { id, ...data } as CatalogVideo;
}

/**
 * Keeps the device's local copy of the video catalog in sync with Firestore so
 * that takeover videos are already on disk when a push arrives. Playback-time
 * gaps are covered by ensureVideo(), which downloads on demand with progress.
 */
export class VideoSyncService {
  private manifest: Manifest = {};
  private manifestLoaded: Promise<void> | null = null;
  private syncPromise: Promise<void> | null = null;
  private inFlight = new Map<string, Promise<string>>();
  private progressListeners = new Map<string, Set<ProgressListener>>();
  private appStateSub: NativeEventSubscription | null = null;
  private syncStatus: SyncStatus | null = null;
  private syncStatusListeners = new Set<SyncStatusListener>();

  /** Call once the user is signed in (catalog reads require auth). */
  start(): void {
    if (!this.appStateSub) {
      this.appStateSub = AppState.addEventListener(
        "change",
        (state: AppStateStatus) => {
          if (state === "active") {
            this.syncAll().catch((error) =>
              console.log("videoSync foreground sync failed:", error)
            );
          }
        }
      );
    }
    this.syncAll().catch((error) =>
      console.log("videoSync initial sync failed:", error)
    );
  }

  stop(): void {
    this.appStateSub?.remove();
    this.appStateSub = null;
  }

  /**
   * Subscribe to background sync progress (null = idle). The listener is
   * called immediately with the current status. Returns an unsubscribe fn.
   */
  subscribeSyncStatus(listener: SyncStatusListener): () => void {
    this.syncStatusListeners.add(listener);
    listener(this.syncStatus);
    return () => {
      this.syncStatusListeners.delete(listener);
    };
  }

  /** Downloads missing/outdated videos and removes ones no longer in the catalog. */
  syncAll(): Promise<void> {
    if (!this.syncPromise) {
      this.syncPromise = this.doSync().finally(() => {
        this.syncPromise = null;
      });
    }
    return this.syncPromise;
  }

  /** Local file URI if this video is fully downloaded, else null. */
  async getLocalUri(videoId: string): Promise<string | null> {
    await this.ensureManifestLoaded();
    const entry = this.manifest[videoId];
    if (!entry) return null;
    const file = fileFor(videoId, entry.version);
    return file.exists ? file.uri : null;
  }

  async getManifestEntry(videoId: string): Promise<ManifestEntry | null> {
    await this.ensureManifestLoaded();
    return this.manifest[videoId] ?? null;
  }

  async getCatalogVideo(videoId: string): Promise<CatalogVideo | null> {
    const snap = await getDoc(doc(FIRESTORE_DB, "videos", videoId));
    return snap.exists() ? snapshotToVideo(snap.id, snap.data()) : null;
  }

  /**
   * Resolves to a local file URI, downloading first if needed. Concurrent
   * calls for the same video share one download; late subscribers still get
   * progress events.
   */
  async ensureVideo(
    videoId: string,
    onProgress?: ProgressListener,
    signal?: AbortSignal
  ): Promise<string> {
    await this.ensureManifestLoaded();

    const local = await this.getLocalUri(videoId);
    if (local) return local;

    if (onProgress) this.addProgressListener(videoId, onProgress);
    try {
      let promise = this.inFlight.get(videoId);
      if (!promise) {
        promise = this.fetchAndDownload(videoId, signal).finally(() => {
          this.inFlight.delete(videoId);
        });
        this.inFlight.set(videoId, promise);
      }
      return await promise;
    } finally {
      if (onProgress) this.removeProgressListener(videoId, onProgress);
    }
  }

  private async fetchAndDownload(
    videoId: string,
    signal?: AbortSignal
  ): Promise<string> {
    const video = await this.getCatalogVideo(videoId);
    if (!video) {
      throw new Error(`Video not found in catalog: ${videoId}`);
    }
    if (video.status !== "ready" || !video.downloadURL) {
      throw new Error(`Video is not ready: ${videoId}`);
    }
    return this.download(video, signal);
  }

  private async doSync(): Promise<void> {
    await this.ensureManifestLoaded();

    const snapshot = await getDocs(
      query(
        collection(FIRESTORE_DB, "videos"),
        where("status", "==", "ready"),
        where("active", "==", true)
      )
    );
    const catalog = snapshot.docs.map((d) => snapshotToVideo(d.id, d.data()));
    const catalogIds = new Set(catalog.map((v) => v.id));

    const pending = catalog.filter((video) => {
      const entry = this.manifest[video.id];
      return !(
        entry?.version === video.version &&
        fileFor(video.id, entry.version).exists
      );
    });

    let completed = 0;
    try {
      for (const video of pending) {
        this.setSyncStatus({
          total: pending.length,
          completed,
          currentName: video.name,
        });
        try {
          // Reuse an in-flight on-demand download instead of starting a second one
          let promise = this.inFlight.get(video.id);
          if (!promise) {
            promise = this.download(video).finally(() => {
              this.inFlight.delete(video.id);
            });
            this.inFlight.set(video.id, promise);
          }
          await promise;
          completed += 1;
        } catch (error) {
          console.log(`videoSync: download failed for ${video.id}:`, error);
        }
      }
    } finally {
      if (pending.length > 0) {
        this.setSyncStatus({
          total: pending.length,
          completed,
          currentName: null,
        });
      }
      this.setSyncStatus(null);
    }

    // Drop local copies of videos removed from (or deactivated in) the catalog
    let manifestChanged = false;
    for (const videoId of Object.keys(this.manifest)) {
      if (!catalogIds.has(videoId)) {
        this.deleteLocalFiles(videoId);
        delete this.manifest[videoId];
        manifestChanged = true;
      }
    }
    if (manifestChanged) await this.persistManifest();
  }

  private async download(
    video: CatalogVideo,
    signal?: AbortSignal
  ): Promise<string> {
    const dir = videoDir();
    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });

    const dest = fileFor(video.id, video.version);
    await File.downloadFileAsync(video.downloadURL, dest, {
      idempotent: true,
      signal,
      onProgress: ({ bytesWritten, totalBytes }) =>
        this.emitProgress({ videoId: video.id, bytesWritten, totalBytes }),
    });

    // Integrity check: a truncated or corrupted file must never be recorded as
    // downloaded, or synced playback would fail silently at playAt.
    const sizeOk = !video.sizeBytes || dest.size === video.sizeBytes;
    const md5Ok = !video.md5 || dest.md5 === video.md5;
    if (!sizeOk || !md5Ok) {
      try {
        dest.delete();
      } catch {
        // best effort
      }
      throw new Error(`Downloaded file failed verification: ${video.id}`);
    }

    this.manifest[video.id] = {
      videoId: video.id,
      version: video.version,
      sizeBytes: video.sizeBytes,
      md5: video.md5,
      durationSec: video.durationSec,
      name: video.name,
      mediaType: video.mediaType ?? "video",
      ...(video.thumbnailURL ? { thumbnailURL: video.thumbnailURL } : {}),
      ...(video.legacyFileName ? { legacyFileName: video.legacyFileName } : {}),
    };
    await this.persistManifest();
    this.deleteLocalFiles(video.id, video.version);
    return dest.uri;
  }

  /** Deletes local files for a video, optionally keeping one version. */
  private deleteLocalFiles(videoId: string, keepVersion?: number): void {
    const dir = videoDir();
    if (!dir.exists) return;
    const keepName = keepVersion != null ? `${videoId}_v${keepVersion}.mp4` : null;
    for (const item of dir.list()) {
      if (
        item instanceof File &&
        item.name.startsWith(`${videoId}_v`) &&
        item.name !== keepName
      ) {
        try {
          item.delete();
        } catch (error) {
          console.log(`videoSync: failed to delete ${item.name}:`, error);
        }
      }
    }
  }

  private ensureManifestLoaded(): Promise<void> {
    if (!this.manifestLoaded) {
      this.manifestLoaded = AsyncStorage.getItem(MANIFEST_KEY)
        .then((raw) => {
          this.manifest = raw ? JSON.parse(raw) : {};
        })
        .catch(() => {
          this.manifest = {};
        });
    }
    return this.manifestLoaded;
  }

  private async persistManifest(): Promise<void> {
    try {
      await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(this.manifest));
    } catch (error) {
      console.log("videoSync: failed to persist manifest:", error);
    }
  }

  private addProgressListener(videoId: string, listener: ProgressListener) {
    let set = this.progressListeners.get(videoId);
    if (!set) {
      set = new Set();
      this.progressListeners.set(videoId, set);
    }
    set.add(listener);
  }

  private removeProgressListener(videoId: string, listener: ProgressListener) {
    const set = this.progressListeners.get(videoId);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) this.progressListeners.delete(videoId);
  }

  private emitProgress(progress: VideoDownloadProgress) {
    const set = this.progressListeners.get(progress.videoId);
    if (!set) return;
    for (const listener of set) listener(progress);
  }

  private setSyncStatus(status: SyncStatus | null) {
    this.syncStatus = status;
    for (const listener of this.syncStatusListeners) listener(status);
  }
}

export const videoSync = new VideoSyncService();
