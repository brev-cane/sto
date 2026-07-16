import AsyncStorage from "@react-native-async-storage/async-storage";

// A measured offset stays valid this long; within the window app opens
// reuse the cached value and make zero getServerTime invocations
const OFFSET_CACHE_KEY = "timeSyncOffset";
const OFFSET_TTL_MS = 12 * 60 * 60 * 1000;

export class FirebaseTimeSync {
  private offsetFromServer = 0;
  private isInitialized = false;
  private functionUrl = ""; // Will be set dynamically

  constructor() {
    this.functionUrl = `https://getservertime-rg22ywldxq-uc.a.run.app`;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      const cached = await AsyncStorage.getItem(OFFSET_CACHE_KEY);
      if (cached) {
        const { offset, measuredAt } = JSON.parse(cached);
        if (
          typeof offset === "number" &&
          typeof measuredAt === "number" &&
          Date.now() - measuredAt < OFFSET_TTL_MS
        ) {
          this.offsetFromServer = offset;
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
      this.isInitialized = true;

      await AsyncStorage.setItem(
        OFFSET_CACHE_KEY,
        JSON.stringify({
          offset: this.offsetFromServer,
          measuredAt: Date.now(),
        })
      );

      console.log(
        `Firebase time sync initialized. Offset: ${this.offsetFromServer}ms`
      );
    } catch (error) {
      console.log("Failed to sync time with Firebase server:", error);
      this.offsetFromServer = 0; // Fallback to local time
      this.isInitialized = true;
    }
  }

  getSyncedTime(): number {
    return Date.now() + this.offsetFromServer;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const timeSync = new FirebaseTimeSync();
