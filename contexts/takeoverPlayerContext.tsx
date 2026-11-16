import { useEventListener } from "expo";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { flush as flushTelemetry, mark } from "@/services/takeoverTelemetry";
import { timeSync } from "@/services/timeSync";
import { videoSync } from "@/services/videoSync";
import { MediaType, VideoDownloadProgress } from "@/types/videos";
import { triggerUniqueVibration } from "@/utils/vibrationHelper";

export type TakeoverParams = {
  videoFile?: string;
  videoIds?: string;
  sentAt?: string;
  delaySeconds?: string;
  playAt?: string;
  /** notificationLogs id, for delivery telemetry (absent on old pushes) */
  sendId?: string;
};

export type PlaylistEntry = {
  id: string;
  name: string;
  durationSec: number;
  mediaType: MediaType;
  thumbnailURL?: string;
  legacyFileName?: string;
  /** Local file URI once downloaded, null while still remote */
  uri: string | null;
};

export type Phase =
  | "idle"
  | "resolving"
  | "downloading"
  | "countdown"
  | "playing"
  | "missed"
  | "error";

/** How far player.currentTime may drift from the server clock before we seek. */
const DRIFT_TOLERANCE_SEC = 1.25;
const DRIFT_CHECK_INTERVAL_MS = 3000;
/**
 * Late joiners get a short artificial countdown before we seek+play, instead
 * of a cold seek. Without this, the freshly-created native player has zero
 * lead time to buffer the target offset, so its first real frame lands
 * behind the computed position until the next drift check corrects it.
 */
const LATE_JOIN_PRIME_MS = 2000;

/** Maps seconds elapsed since playAt to a playlist position, for joining late but in sync. */
export function locateInPlaylist(
  elapsedSec: number,
  entries: PlaylistEntry[]
): { index: number; offsetSec: number } | null {
  let start = 0;
  for (let i = 0; i < entries.length; i++) {
    const duration = entries[i].durationSec || 0;
    if (elapsedSec < start + duration) {
      return { index: i, offsetSec: Math.max(0, elapsedSec - start) };
    }
    start += duration;
  }
  return null;
}

interface TakeoverPlayerContextType {
  /** Raw params of the active takeover; null when no session is running */
  sessionParams: TakeoverParams | null;
  phase: Phase;
  error: string | null;
  countdown: number | null;
  entries: PlaylistEntry[] | null;
  currentIndex: number;
  downloadProgress: VideoDownloadProgress | null;
  player: VideoPlayer;
  /** True while the playing entry is audio-only (no video track to show in PiP) */
  isAudioEntry: boolean;
  /** Starts a takeover session. No-op when the same playAt session is already live. */
  startSession: (params: TakeoverParams | undefined) => void;
  /** Permanently ends the session (mini-player close button, playlist end). */
  endSession: () => void;
  /** Re-derives index/offset from the server clock and seeks if drifted. */
  resync: () => void;
  isVideoScreenFocused: boolean;
  setVideoScreenFocused: (focused: boolean) => void;
}

const TakeoverPlayerContext = createContext<TakeoverPlayerContextType | null>(
  null
);

export function TakeoverPlayerProvider({ children }: { children: ReactNode }) {
  const [sessionParams, setSessionParams] = useState<TakeoverParams | null>(
    null
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [entries, setEntries] = useState<PlaylistEntry[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [downloadProgress, setDownloadProgress] =
    useState<VideoDownloadProgress | null>(null);
  const [isVideoScreenFocused, setVideoScreenFocused] = useState(false);

  const pendingSeekRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  // Bumped whenever a session is replaced/ended so in-flight async work from
  // the previous run can detect it is stale (replaces per-effect `cancelled`).
  const runIdRef = useRef(0);

  // Latest-value mirrors so resync() can run from intervals/AppState without
  // re-subscribing on every state change.
  const phaseRef = useRef<Phase>(phase);
  const entriesRef = useRef<PlaylistEntry[] | null>(entries);
  const currentIndexRef = useRef(currentIndex);
  const playAtMsRef = useRef<number | null>(null);
  // Wall-clock deadline for the late-join priming window; null when not armed.
  const lateJoinDeadlineRef = useRef<number | null>(null);
  // Telemetry for the running session (see services/takeoverTelemetry)
  const sendIdRef = useRef<string | null>(null);
  const maxDriftRef = useRef(0);
  const seekCountRef = useRef(0);

  const currentEntry = entries?.[currentIndex] ?? null;
  const currentUri = currentEntry?.uri ?? null;
  const isAudioEntry = currentEntry?.mediaType === "audio";
  const player = useVideoPlayer(
    currentUri
      ? {
          uri: currentUri,
          // Populates the lock-screen / notification card that
          // `showNowPlayingNotification` puts up for audio entries.
          metadata: {
            title: currentEntry?.name,
            artist: "Stadium Takeover",
            artwork: currentEntry?.thumbnailURL,
          },
        }
      : null,
    (player) => {
      if (player) {
        player.loop = false;
        // A takeover must survive the user leaving the app, but the two media
        // types get there differently: video entries auto-enter Picture in
        // Picture (see the VideoView props on the Video screen and the
        // mini-player), while audio-only entries have no video track to show
        // and instead keep playing in the background with now-playing
        // controls. Video stays false on purpose — iOS only skips the
        // background pause while the view is actually in PiP, so enabling it
        // would leave invisible audio playing whenever PiP fails to start.
        //
        // The source string carries the entry's metadata, so a new entry
        // always rebuilds the player and re-runs this with the right values.
        player.staysActiveInBackground = isAudioEntry;
        player.showNowPlayingNotification = isAudioEntry;
      }
    }
  );
  const playerRef = useRef(player);

  useEffect(() => {
    phaseRef.current = phase;
    entriesRef.current = entries;
    currentIndexRef.current = currentIndex;
    playerRef.current = player;
  });

  // Silence the current player right away. Swapping the source to null only
  // *releases* the shared native object, and its audio keeps playing until
  // native cleanup actually runs.
  const stopPlayback = useCallback(() => {
    try {
      playerRef.current?.pause();
    } catch {
      // Player was already released natively — nothing left to stop.
    }
  }, []);

  /** Reports how the running session ended, with its drift stats. */
  const finishTelemetry = useCallback((endReason: string) => {
    const sendId = sendIdRef.current;
    if (!sendId) return;
    sendIdRef.current = null;
    mark(sendId, {
      endedAt: Date.now(),
      endReason,
      maxDriftSec: Math.round(maxDriftRef.current * 100) / 100,
      seekCount: seekCountRef.current,
    });
    void flushTelemetry(sendId);
  }, []);

  const endWith = useCallback((reason: string) => {
    finishTelemetry(reason);
    stopPlayback();
    abortRef.current?.abort();
    abortRef.current = null;
    runIdRef.current++;
    pendingSeekRef.current = 0;
    playAtMsRef.current = null;
    lateJoinDeadlineRef.current = null;
    setSessionParams(null);
    setPhase("idle");
    setError(null);
    setCountdown(null);
    setEntries(null);
    setCurrentIndex(0);
    setDownloadProgress(null);
  }, [stopPlayback, finishTelemetry]);

  // Public close (mini-player button) — also used as an onPress handler, so
  // it must ignore its argument.
  const endSession = useCallback(() => endWith("userClosed"), [endWith]);

  const startSession = useCallback((params: TakeoverParams | undefined) => {
    const playAt = params?.playAt;
    const playlistIds = (params?.videoIds ?? params?.videoFile ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Restore path (mini-player tap, screen re-focus): the session is already
    // live — restarting would replay downloads/countdown. Errors may retry.
    if (
      playAtMsRef.current !== null &&
      playAt &&
      playAtMsRef.current === parseInt(playAt, 10) &&
      phaseRef.current !== "error" &&
      phaseRef.current !== "idle"
    ) {
      return;
    }

    // Tear down whatever was running before
    finishTelemetry("replaced");
    stopPlayback();
    abortRef.current?.abort();
    const runId = ++runIdRef.current;
    const abort = new AbortController();
    abortRef.current = abort;
    pendingSeekRef.current = 0;
    playAtMsRef.current = null;
    lateJoinDeadlineRef.current = null;
    setEntries(null);
    setCurrentIndex(0);
    setDownloadProgress(null);
    setCountdown(null);
    setError(null);
    setSessionParams(null);

    const fail = (message: string) => {
      setError(message);
      setPhase("error");
    };
    if (!params) return fail("Missing parameters.");
    if (!playlistIds.length) return fail("Invalid or missing video file(s).");
    if (!playAt) return fail("Missing playAt timestamp parameter.");

    playAtMsRef.current = parseInt(playAt, 10);
    setSessionParams(params);
    setPhase("resolving");

    const sendId = params.sendId ?? null;
    sendIdRef.current = sendId;
    maxDriftRef.current = 0;
    seekCountRef.current = 0;
    mark(sendId, {
      sessionStartAt: Date.now(),
      playAt: playAtMsRef.current,
      playlistLength: playlistIds.length,
    });

    const isStale = () => runIdRef.current !== runId;

    // Resolve playlist ids against the local store / catalog, then make sure
    // the video we need first is on disk — downloading it with visible
    // progress; remaining entries keep downloading in the background.
    (async () => {
      try {
        // 1. Metadata (name/duration) for every playlist entry
        const resolved: PlaylistEntry[] = [];
        for (const id of playlistIds) {
          const manifestEntry = await videoSync.getManifestEntry(id);
          if (manifestEntry) {
            resolved.push({
              id,
              name: manifestEntry.name,
              durationSec: manifestEntry.durationSec,
              mediaType: manifestEntry.mediaType ?? "video",
              thumbnailURL: manifestEntry.thumbnailURL,
              legacyFileName: manifestEntry.legacyFileName,
              uri: await videoSync.getLocalUri(id),
            });
            continue;
          }
          const catalogVideo = await videoSync.getCatalogVideo(id);
          if (!catalogVideo || catalogVideo.status !== "ready") {
            throw new Error("Invalid or missing video file(s).");
          }
          resolved.push({
            id,
            name: catalogVideo.name,
            durationSec: catalogVideo.durationSec,
            mediaType: catalogVideo.mediaType ?? "video",
            thumbnailURL: catalogVideo.thumbnailURL,
            legacyFileName: catalogVideo.legacyFileName,
            uri: null,
          });
        }
        if (isStale()) return;
        setEntries(resolved);

        // 2. Which file do we need first? Index 0 normally; a later index
        // when joining after playAt.
        const elapsedSec =
          (timeSync.getSyncedTime() - parseInt(playAt, 10)) / 1000;
        const location =
          elapsedSec > 5 ? locateInPlaylist(elapsedSec, resolved) : null;
        if (elapsedSec > 5 && !location) {
          // The whole playlist already finished — countdown effect will show
          // "missed", no download needed.
          setPhase("countdown");
          return;
        }
        const targetIndex = location?.index ?? 0;

        // 3. Download the target with progress, then let the countdown take over
        if (!resolved[targetIndex].uri) {
          setPhase("downloading");
          const downloadStart = Date.now();
          let downloadBytes: number | null = null;
          const uri = await videoSync.ensureVideo(
            resolved[targetIndex].id,
            (p) => {
              downloadBytes = p.totalBytes;
              if (!isStale()) setDownloadProgress(p);
            },
            abort.signal
          );
          if (isStale()) return;
          mark(sendId, {
            cacheHit: false,
            downloadMs: Date.now() - downloadStart,
            downloadBytes,
          });
          resolved[targetIndex] = { ...resolved[targetIndex], uri };
          setEntries([...resolved]);
        } else {
          mark(sendId, { cacheHit: true });
        }
        mark(sendId, { readyAt: Date.now() });

        for (const [i, entry] of resolved.entries()) {
          if (i === targetIndex || entry.uri) continue;
          videoSync
            .ensureVideo(entry.id)
            .then((uri) => {
              if (isStale()) return;
              setEntries((prev) => {
                if (!prev) return prev;
                const next = [...prev];
                next[i] = { ...next[i], uri };
                return next;
              });
            })
            .catch((err) =>
              console.log(`Prefetch failed for ${entry.id}:`, err)
            );
        }

        setPhase("countdown");
      } catch (err: any) {
        if (isStale() || err?.name === "AbortError") return;
        console.log("Video preparation failed:", err);
        mark(sendId, {
          outcome: "error",
          errorMsg: String(err?.message ?? err).slice(0, 200),
        });
        void flushTelemetry(sendId);
        setError(
          err?.message === "Invalid or missing video file(s)."
            ? err.message
            : "Could not download the video. Check your connection and try again."
        );
        setPhase("error");
      }
    })();
  }, [stopPlayback, finishTelemetry]);

  /**
   * The sync authority: recomputes where playback should be from the server
   * clock and corrects index/position. Runs on a drift interval while
   * playing, on app-foreground, and when the full screen regains focus.
   */
  const resync = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const playAtMs = playAtMsRef.current;
    const currentEntries = entriesRef.current;
    if (playAtMs === null || !currentEntries) return;

    const elapsedSec = (timeSync.getSyncedTime() - playAtMs) / 1000;
    const location = locateInPlaylist(elapsedSec, currentEntries);
    if (!location) {
      // The playlist is over — nothing left to stay in sync with.
      endWith("completed");
      return;
    }

    if (location.index !== currentIndexRef.current) {
      // The clock says we should be in a later entry (e.g. playback stalled
      // or the app was suspended past a boundary).
      if (!currentEntries[location.index].uri) {
        // Without a local file there is nothing to play in sync, so leave.
        endWith("missingFile");
        return;
      }
      pendingSeekRef.current = location.offsetSec;
      setCurrentIndex(location.index);
      return;
    }

    // Seeking while the (re)created player is still loading a new source
    // would thrash; the next tick catches up once it is ready.
    const p = playerRef.current;
    if (!p || p.status !== "readyToPlay") return;
    const drift = Math.abs(p.currentTime - location.offsetSec);
    if (drift > maxDriftRef.current) maxDriftRef.current = drift;
    if (drift > DRIFT_TOLERANCE_SEC) {
      seekCountRef.current++;
      p.currentTime = location.offsetSec;
    }
    if (!p.playing) p.play();
  }, [endWith]);

  // Once we're in the playing phase, every (re)created player — initial start,
  // playlist advance, late-join into a later video — starts playback here,
  // applying a pending late-join seek first.
  useEffect(() => {
    if (phase !== "playing" || !player) return;
    if (pendingSeekRef.current > 0) {
      player.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = 0;
    }
    player.play();
  }, [phase, player, currentIndex]);

  useEventListener(player, "playToEnd", () => {
    if (entries && currentIndex < entries.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextEntry = entries[nextIndex];

      // Background prefetch may not have finished (or failed); without a
      // local file there is nothing to play in sync, so leave.
      if (!nextEntry.uri) {
        endWith("missingFile");
        return;
      }

      // If the next video is the same as current, we need to seek to beginning and replay
      // because useVideoPlayer won't reinitialize with the same source
      if (nextEntry.uri === entries[currentIndex].uri && player) {
        player.currentTime = 0;
        player.play();
      }

      setCurrentIndex(nextIndex);
    } else {
      endWith("completed");
    }
  });

  // Sync countdown with server timestamp; on expiry either play from the
  // start (grace period) or join late at the in-sync offset.
  useEffect(() => {
    if (phase !== "countdown" || playAtMsRef.current === null || !entries)
      return;

    const targetTimestamp = playAtMsRef.current;

    const reportOutcome = (fields: Record<string, unknown>) => {
      mark(sendIdRef.current, fields);
      void flushTelemetry(sendIdRef.current);
    };

    const startPlayback = (index: number, offsetSec: number, lateJoin: boolean) => {
      reportOutcome({
        outcome: lateJoin ? "lateJoin" : "onTime",
        playStartedAt: Date.now(),
        // How far past playAt playback actually began (grace period included)
        lateBySec:
          Math.round(((timeSync.getSyncedTime() - targetTimestamp) / 1000) * 100) / 100,
        startIndex: index,
      });
      pendingSeekRef.current = offsetSec;
      setCountdown(0);
      setCurrentIndex(index);
      // The play effect picks it up from here (and applies the seek)
      setPhase("playing");
    };

    // Late join: assign the player source now so it has real time to buffer,
    // show a short countdown (matches the on-time UX instead of a jump cut),
    // then re-derive the offset from the clock at the end of the window —
    // the priming time itself must not go stale.
    const armLateJoin = (index: number) => {
      if (lateJoinDeadlineRef.current === null) {
        lateJoinDeadlineRef.current = Date.now() + LATE_JOIN_PRIME_MS;
        setCurrentIndex(index);
      }

      const msLeft = lateJoinDeadlineRef.current - Date.now();
      if (msLeft > 0) {
        setCountdown(Math.ceil(msLeft / 1000));
        return;
      }

      const freshElapsedSec = (timeSync.getSyncedTime() - targetTimestamp) / 1000;
      const freshLocation = locateInPlaylist(freshElapsedSec, entries);
      if (!freshLocation) {
        reportOutcome({ outcome: "missed" });
        setPhase("missed");
        return;
      }
      if (entries[freshLocation.index].uri) {
        lateJoinDeadlineRef.current = null;
        startPlayback(freshLocation.index, freshLocation.offsetSec, true);
      }
    };

    const updateCountdown = () => {
      const now = timeSync.getSyncedTime();
      const remaining = Math.floor((targetTimestamp - now) / 1000);

      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }

      const elapsedSec = (now - targetTimestamp) / 1000;
      if (elapsedSec <= 5) {
        // Grace period: start from the beginning
        if (entries[0].uri) startPlayback(0, 0, false);
        return;
      }

      const location = locateInPlaylist(elapsedSec, entries);
      if (!location) {
        reportOutcome({ outcome: "missed" });
        setPhase("missed");
        return;
      }
      // Join in sync mid-playlist once the needed file is on disk
      if (entries[location.index].uri) {
        armLateJoin(location.index);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateCountdown, 100);

    return () => clearInterval(interval);
  }, [phase, entries]);

  // Countdown heads-up buzz — lives here so it fires even while minimized
  useEffect(() => {
    if (countdown === 5) {
      triggerUniqueVibration();
    }
  }, [countdown]);

  // Drift correction while playing
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(resync, DRIFT_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase, resync]);

  // Coming back from background: the player may have paused or fallen behind
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") resync();
    });
    return () => subscription.remove();
  }, [resync]);

  // A failed or missed session only makes sense on the full screen; never
  // leave a stuck mini-player card behind.
  useEffect(() => {
    if (
      (phase === "error" || phase === "missed") &&
      !isVideoScreenFocused &&
      sessionParams
    ) {
      endWith(phase);
    }
  }, [phase, isVideoScreenFocused, sessionParams, endWith]);

  return (
    <TakeoverPlayerContext.Provider
      value={{
        sessionParams,
        phase,
        error,
        countdown,
        entries,
        currentIndex,
        downloadProgress,
        player,
        isAudioEntry,
        startSession,
        endSession,
        resync,
        isVideoScreenFocused,
        setVideoScreenFocused,
      }}
    >
      {children}
    </TakeoverPlayerContext.Provider>
  );
}

export function useTakeoverPlayer() {
  const context = useContext(TakeoverPlayerContext);
  if (!context) {
    throw new Error(
      "useTakeoverPlayer must be used within a TakeoverPlayerProvider"
    );
  }
  return context;
}
