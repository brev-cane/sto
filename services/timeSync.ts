export class FirebaseTimeSync {
  private offsetFromServer = 0;
  private isInitialized = false;
  private functionUrl = ""; // Will be set dynamically

  constructor() {
    this.functionUrl = `https://getservertime-rg22ywldxq-uc.a.run.app`;
  }

  async initialize() {
    try {
      const measurements = [];

      // Take 3 measurements to get more accurate offset
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        const response = await fetch(this.functionUrl);
        const end = Date.now();
        const data = await response.json();

        if (!data.success) {
          console.log("Server time request failed", response);
          throw new Error("Server time request failed");
        }

        const roundTripTime = end - start;
        const networkDelay = roundTripTime / 2;
        const serverTime = data.serverTime + networkDelay;
        const localTime = Date.now();

        measurements.push(serverTime - localTime);
      }

      // Use median to reduce impact of network spikes
      measurements.sort((a, b) => a - b);
      this.offsetFromServer = measurements[1]; // median
      this.isInitialized = true;

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
