import * as Application from "expo-application";
import type * as Notifications from "expo-notifications";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { FIREBASE_AUTH, FIRESTORE_DB } from "@/FirebaseConfig";
import { timeSync } from "@/services/timeSync";

/**
 * Delivery & sync telemetry for takeover pushes. Each device keeps one doc per
 * send at notificationLogs/{sendId}/deliveries/{uid}; fields accumulate in
 * memory and are merged in at a few milestones (tap, outcome, session end),
 * so a session costs ~3 writes. The send function rolls these up for the
 * admin dashboard.
 *
 * Timestamps passed to mark() are local Date.now() values for the fields in
 * LOCAL_TIME_FIELDS; they are shifted onto the server clock at flush time, once
 * timeSync has an offset (on a cold start the tap is handled before it does).
 */
const LOCAL_TIME_FIELDS = new Set([
  "deliveredAt",
  "receivedAt",
  "openedAt",
  "sessionStartAt",
  "readyAt",
  "playStartedAt",
  "endedAt",
]);

type Fields = Record<string, unknown>;

// JS bundle start, reported raw as msSinceAppStart
const JS_STARTED_AT = Date.now();

const pending = new Map<string, Fields>();
// Notification identifiers already reported — the cold-start lookup and the
// response listener can both see the same tap.
const seenNotifications = new Set<string>();

function param(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&]${key}=([^&#]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function mark(sendId: string | null | undefined, fields: Fields): void {
  if (!sendId) return; // push from before tracking existed
  pending.set(sendId, { ...pending.get(sendId), ...fields });
}

export async function flush(sendId: string | null | undefined): Promise<void> {
  if (!sendId) return;
  const fields = pending.get(sendId);
  if (!fields) return;
  pending.delete(sendId);
  try {
    // Cold start: wait for the persisted session and a clock offset
    await Promise.all([FIREBASE_AUTH.authStateReady(), timeSync.initialize()]);
    const uid = FIREBASE_AUTH.currentUser?.uid;
    if (!uid) return;

    const { offsetMs } = timeSync.getDiagnostics();
    const data: Fields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue; // Firestore rejects the whole write
      data[key] =
        LOCAL_TIME_FIELDS.has(key) && typeof value === "number"
          ? Math.round(value + offsetMs)
          : value;
    }
    await setDoc(
      doc(FIRESTORE_DB, "notificationLogs", sendId, "deliveries", uid),
      {
        ...data,
        platform: Platform.OS,
        appVersion: `${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`,
        clock: timeSync.getDiagnostics(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    // Telemetry must never affect playback
    console.log("takeoverTelemetry flush failed:", error);
  }
}

function screenOf(notification: Notifications.Notification): string | null {
  const screen = notification.request.content.data?.screen;
  return typeof screen === "string" ? screen : null;
}

/** Common fields carried by the push link itself. */
function linkFields(screen: string): Fields {
  return {
    sentAt: num(param(screen, "sentAt")),
    playAt: num(param(screen, "playAt")),
  };
}

/**
 * `notification.date` differs by platform: on iOS it is when the OS delivered
 * the notification (device clock, in seconds); on Android it is FCM's send time
 * (Google's clock, ms) — not device receipt.
 */
function deliveryFields(notification: Notifications.Notification): Fields {
  const raw = notification.date;
  if (typeof raw !== "number" || raw <= 0) return {};
  const ms = raw < 1e12 ? raw * 1000 : raw;
  return Platform.OS === "ios" ? { deliveredAt: ms } : { fcmSentAt: Math.round(ms) };
}

/**
 * A takeover push was tapped. `launchedApp` is true only from the launch-time
 * lookup (NavigationContainer's getInitialURL), which runs once per process.
 * On a cold start the response listener may see the same tap first, so a
 * repeat from the launch path upgrades the record instead of being dropped.
 */
export function recordTap(
  response: Notifications.NotificationResponse,
  launchedApp = false,
): void {
  const { notification } = response;
  const id = notification.request.identifier;
  const screen = screenOf(notification);
  if (!screen) return;
  const sendId = param(screen, "sendId");
  if (seenNotifications.has(id)) {
    if (launchedApp) {
      mark(sendId, { coldStart: true });
      void flush(sendId);
    }
    return;
  }
  seenNotifications.add(id);
  const now = Date.now();
  mark(sendId, {
    ...linkFields(screen),
    ...deliveryFields(notification),
    openedAt: now,
    coldStart: launchedApp,
    msSinceAppStart: now - JS_STARTED_AT,
  });
  void flush(sendId);
}

/** A takeover push arrived while the app was in the foreground. */
export function recordForegroundReceive(
  notification: Notifications.Notification,
): void {
  const screen = screenOf(notification);
  if (!screen) return;
  const sendId = param(screen, "sendId");
  const now = Date.now();
  // In the foreground the JS listener fires on arrival, so this is a true
  // device receipt time on both platforms.
  mark(sendId, {
    ...linkFields(screen),
    ...(Platform.OS === "android" ? deliveryFields(notification) : {}),
    deliveredAt: now,
    receivedAt: now,
    foreground: true,
  });
  void flush(sendId);
}
