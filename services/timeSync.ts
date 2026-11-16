import AsyncStorage from "@react-native-async-storage/async-storage";

// A measured offset stays valid this long; within the window app opens
// reuse the cached value and make zero getServerTime invocations
const OFFSET_CACHE_KEY = "timeSyncOffset";
const OFFSET_TTL_MS = 12 * 60 * 60 * 1000;

export class FirebaseTimeSync {
  private offsetFromServer = 0;
  private isInitialized = false;
  // Diagnostics for delivery telemetry: how trustworthy is the offset?
  private rttMs: number | null = null;
  private measuredAt: number | null = null;
  private fallback = false;
  private functionUrl = ""; // Will be set dynamically
  // Shared by concurrent callers (App start + a cold-start tap's telemetry)
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.functionUrl = `https://getservertime-rg22ywldxq-uc.a.run.app`;
  }

  initialize(): Promise<void> {
    this.initPromise ??= this.measure();
    return this.initPromise;
  }

  private async measure() {

    try {
      const cached = await AsyncStorage.getItem(OFFSET_CACHE_KEY);
      if (cached) {
        const { offset, measuredAt, rttMs } = JSON.parse(cached);
        if (
          typeof offset === "number" &&
          typeof measuredAt === "number" &&
          Date.now() - measuredAt < OFFSET_TTL_MS
        ) {
          this.offsetFromServer = offset;
          this.measuredAt = measuredAt;
          this.rttMs = typeof rttMs === "number" ? rttMs : null;
          this.isInitialized = true;
          return;
        }
      }
    } catch {
      // Bad cache — fall through to a fresh measurement
    }

    try {
      const start = Date.now();
      const response = await fetch(this.functionUrl);
      const end = Date.now();
      const data = await response.json();

      if (!data.success) {
        console.log("Server time request failed", response);
        throw new Error("Server time request failed");
      }

      const networkDelay = (end - start) / 2;
      const serverTime = data.serverTime + networkDelay;
      this.offsetFromServer = serverTime - Date.now();
      this.rttMs = end - start;
      this.measuredAt = Date.now();
      this.fallback = false;
      this.isInitialized = true;

      await AsyncStorage.setItem(
        OFFSET_CACHE_KEY,
        JSON.stringify({
          offset: this.offsetFromServer,
          measuredAt: this.measuredAt,
          rttMs: this.rttMs,
        })
      );

      console.log(
        `Firebase time sync initialized. Offset: ${this.offsetFromServer}ms`
      );
    } catch (error) {
      console.log("Failed to sync time with Firebase server:", error);
      this.offsetFromServer = 0; // Fallback to local time
      this.fallback = true;
      this.isInitialized = true;
    }
  }

  getSyncedTime(): number {
    return Date.now() + this.offsetFromServer;
  }

  /** Offset quality, recorded alongside every delivery report. */
  getDiagnostics() {
    return {
      offsetMs: Math.round(this.offsetFromServer),
      rttMs: this.rttMs,
      ageMs: this.measuredAt === null ? null : Date.now() - this.measuredAt,
      fallback: this.fallback,
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const timeSync = new FirebaseTimeSync();
