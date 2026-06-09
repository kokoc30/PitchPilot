import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import type {
  FaceLandmarker,
  FaceLandmarkerResult,
  NormalizedLandmark,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  createMediaPipeTrackerBundle,
  getErrorMessage,
  getMediaPipeSupportStatus,
} from "../lib/mediapipe";

export type FaceDirection = "center" | "left" | "right" | "up" | "down" | "unknown";
export type CameraFacingEstimate = "good" | "partial" | "low" | "unknown";
export type PostureSignal = "upright" | "leaning" | "not_detected" | "unknown";
export type HeadMovement = "stable" | "moving" | "unknown";
export type MediaPipeTrackingStatus = "idle" | "loading" | "active" | "error" | "unsupported";

export type TrackingLandmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type FaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MediaPipeTrackingState = {
  isSupported: boolean;
  isInitializing: boolean;
  isTracking: boolean;
  trackingStatus: MediaPipeTrackingStatus;
  trackingError: string | null;
  poseEnabled: boolean;
  poseError: string | null;
  faceVisible: boolean;
  poseVisible: boolean;
  faceConfidence: number | null;
  poseConfidence: number | null;
  faceDirection: FaceDirection;
  cameraFacingEstimate: CameraFacingEstimate;
  postureSignal: PostureSignal;
  headMovement: HeadMovement;
  fps: number;
  lastFrameTime: number | null;
  faceLandmarksCount: number;
  poseLandmarksCount: number;
  faceLandmarks: TrackingLandmark[];
  poseLandmarks: TrackingLandmark[];
  faceBounds: FaceBounds | null;
  videoWidth: number;
  videoHeight: number;
};

export type UseMediaPipeTrackingOptions = {
  videoRef: RefObject<HTMLVideoElement>;
  isCameraActive: boolean;
  enabled?: boolean;
  targetFps?: number;
};

export type UseMediaPipeTrackingResult = MediaPipeTrackingState & {
  initialize: () => Promise<boolean>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  resetTracking: () => void;
};

const DEFAULT_TARGET_FPS = 12;
const FACE_CENTER_THRESHOLD = 0.13;
const FACE_PARTIAL_THRESHOLD = 0.26;
const HEAD_MOVEMENT_THRESHOLD = 0.022;
const IMPORTANT_FACE_POINTS = new Set([1, 33, 61, 133, 199, 263, 291, 362]);
const LEFT_SHOULDER_INDEX = 11;
const RIGHT_SHOULDER_INDEX = 12;
const MIN_SHOULDER_VISIBILITY = 0.45;
const SHOULDER_TILT_THRESHOLD = 0.06;

function createInitialState(): MediaPipeTrackingState {
  const support = getMediaPipeSupportStatus();

  return {
    isSupported: support.supported,
    isInitializing: false,
    isTracking: false,
    trackingStatus: support.supported ? "idle" : "unsupported",
    trackingError: support.reason,
    poseEnabled: false,
    poseError: null,
    faceVisible: false,
    poseVisible: false,
    faceConfidence: null,
    poseConfidence: null,
    faceDirection: "unknown",
    cameraFacingEstimate: "unknown",
    postureSignal: "unknown",
    headMovement: "unknown",
    fps: 0,
    lastFrameTime: null,
    faceLandmarksCount: 0,
    poseLandmarksCount: 0,
    faceLandmarks: [],
    poseLandmarks: [],
    faceBounds: null,
    videoWidth: 0,
    videoHeight: 0,
  };
}

function changedStateKeys(
  current: MediaPipeTrackingState,
  patch: Partial<MediaPipeTrackingState>,
) {
  return (Object.keys(patch) as Array<keyof MediaPipeTrackingState>).some(
    (key) => current[key] !== patch[key],
  );
}

function copyLandmark(landmark: NormalizedLandmark): TrackingLandmark {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility:
      Number.isFinite(landmark.visibility) && landmark.visibility > 0
        ? landmark.visibility
        : undefined,
  };
}

function sampleFaceLandmarks(landmarks: NormalizedLandmark[]) {
  return landmarks
    .filter((_, index) => index % 12 === 0 || IMPORTANT_FACE_POINTS.has(index))
    .map(copyLandmark);
}

function copyPoseLandmarks(landmarks: NormalizedLandmark[]) {
  return landmarks.map(copyLandmark);
}

function calculateFaceBounds(landmarks: NormalizedLandmark[]): FaceBounds | null {
  if (landmarks.length === 0) return null;

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const landmark of landmarks) {
    minX = Math.min(minX, landmark.x);
    minY = Math.min(minY, landmark.y);
    maxX = Math.max(maxX, landmark.x);
    maxY = Math.max(maxY, landmark.y);
  }

  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.min(1, maxX) - Math.max(0, minX),
    height: Math.min(1, maxY) - Math.max(0, minY),
  };
}

function getBoundsCenter(bounds: FaceBounds | null) {
  if (!bounds) return null;

  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function estimateFaceDirection(bounds: FaceBounds | null): FaceDirection {
  const center = getBoundsCenter(bounds);
  if (!center) return "unknown";

  const horizontalOffset = center.x - 0.5;
  const verticalOffset = center.y - 0.5;
  const absX = Math.abs(horizontalOffset);
  const absY = Math.abs(verticalOffset);

  if (absX <= FACE_CENTER_THRESHOLD && absY <= FACE_CENTER_THRESHOLD) {
    return "center";
  }

  if (absX >= absY) {
    return horizontalOffset < 0 ? "left" : "right";
  }

  return verticalOffset < 0 ? "up" : "down";
}

function estimateCameraFacing(bounds: FaceBounds | null): CameraFacingEstimate {
  const center = getBoundsCenter(bounds);
  if (!center) return "unknown";

  const strongestOffset = Math.max(Math.abs(center.x - 0.5), Math.abs(center.y - 0.5));

  if (strongestOffset <= FACE_CENTER_THRESHOLD) return "good";
  if (strongestOffset <= FACE_PARTIAL_THRESHOLD) return "partial";
  return "low";
}

function estimateHeadMovement(
  bounds: FaceBounds | null,
  previousFaceCenterRef: MutableRefObject<{ x: number; y: number } | null>,
): HeadMovement {
  const center = getBoundsCenter(bounds);
  if (!center) {
    previousFaceCenterRef.current = null;
    return "unknown";
  }

  const previous = previousFaceCenterRef.current;
  previousFaceCenterRef.current = center;

  if (!previous) return "unknown";

  const movement = Math.hypot(center.x - previous.x, center.y - previous.y);
  return movement > HEAD_MOVEMENT_THRESHOLD ? "moving" : "stable";
}

function getAverageVisibility(landmarks: NormalizedLandmark[]) {
  const visibilityValues = landmarks
    .map((landmark) => landmark.visibility)
    .filter((visibility) => Number.isFinite(visibility) && visibility > 0);

  if (visibilityValues.length === 0) return null;

  const total = visibilityValues.reduce((sum, visibility) => sum + visibility, 0);
  return total / visibilityValues.length;
}

function isVisible(landmark: NormalizedLandmark | undefined, threshold: number) {
  if (!landmark) return false;
  return !Number.isFinite(landmark.visibility) || landmark.visibility >= threshold;
}

function estimatePosture(landmarks: NormalizedLandmark[]): PostureSignal {
  const leftShoulder = landmarks[LEFT_SHOULDER_INDEX];
  const rightShoulder = landmarks[RIGHT_SHOULDER_INDEX];

  if (
    !isVisible(leftShoulder, MIN_SHOULDER_VISIBILITY) ||
    !isVisible(rightShoulder, MIN_SHOULDER_VISIBILITY)
  ) {
    return "not_detected";
  }

  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
  return shoulderTilt <= SHOULDER_TILT_THRESHOLD ? "upright" : "leaning";
}

function calculateFps(frameTimesRef: MutableRefObject<number[]>, timestamp: number) {
  frameTimesRef.current = [...frameTimesRef.current, timestamp].filter(
    (frameTime) => timestamp - frameTime <= 1000,
  );

  return frameTimesRef.current.length;
}

function createTrackingSnapshot(
  faceResult: FaceLandmarkerResult | null,
  poseResult: PoseLandmarkerResult | null,
  video: HTMLVideoElement,
  timestamp: number,
  previousFaceCenterRef: MutableRefObject<{ x: number; y: number } | null>,
  frameTimesRef: MutableRefObject<number[]>,
): Partial<MediaPipeTrackingState> {
  const face = faceResult?.faceLandmarks[0] ?? [];
  const pose = poseResult?.landmarks[0] ?? [];
  const faceBounds = calculateFaceBounds(face);
  const faceVisible = face.length > 0;
  const poseVisible = pose.length > 0;

  return {
    cameraFacingEstimate: faceVisible ? estimateCameraFacing(faceBounds) : "unknown",
    faceBounds,
    faceConfidence: faceVisible ? 1 : null,
    faceDirection: faceVisible ? estimateFaceDirection(faceBounds) : "unknown",
    faceLandmarks: faceVisible ? sampleFaceLandmarks(face) : [],
    faceLandmarksCount: face.length,
    faceVisible,
    fps: calculateFps(frameTimesRef, timestamp),
    headMovement: faceVisible
      ? estimateHeadMovement(faceBounds, previousFaceCenterRef)
      : "unknown",
    lastFrameTime: Date.now(),
    poseConfidence: poseVisible ? getAverageVisibility(pose) : null,
    poseLandmarks: poseVisible ? copyPoseLandmarks(pose) : [],
    poseLandmarksCount: pose.length,
    poseVisible,
    postureSignal: poseVisible ? estimatePosture(pose) : "not_detected",
    videoHeight: video.videoHeight,
    videoWidth: video.videoWidth,
  };
}

export function useMediaPipeTracking({
  videoRef,
  isCameraActive,
  enabled = true,
  targetFps = DEFAULT_TARGET_FPS,
}: UseMediaPipeTrackingOptions): UseMediaPipeTrackingResult {
  const [state, setState] = useState<MediaPipeTrackingState>(() => createInitialState());
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const initializationPromiseRef = useRef<Promise<boolean> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef(false);
  const lastAnalysisTimeRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const previousFaceCenterRef = useRef<{ x: number; y: number } | null>(null);
  const enabledRef = useRef(enabled);
  const isCameraActiveRef = useRef(isCameraActive);
  const targetFpsRef = useRef(targetFps);

  const setTrackingState = useCallback((patch: Partial<MediaPipeTrackingState>) => {
    setState((current) => {
      if (!changedStateKeys(current, patch)) {
        return current;
      }

      return { ...current, ...patch };
    });
  }, []);

  const clearAnimationFrame = useCallback(() => {
    if (rafIdRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const closeTrackers = useCallback(() => {
    faceLandmarkerRef.current?.close();
    poseLandmarkerRef.current?.close();
    faceLandmarkerRef.current = null;
    poseLandmarkerRef.current = null;
  }, []);

  const resetSignals = useCallback(
    (patch?: Partial<MediaPipeTrackingState>) => {
      frameTimesRef.current = [];
      previousFaceCenterRef.current = null;
      lastAnalysisTimeRef.current = 0;
      setTrackingState({
        cameraFacingEstimate: "unknown",
        faceBounds: null,
        faceConfidence: null,
        faceDirection: "unknown",
        faceLandmarks: [],
        faceLandmarksCount: 0,
        faceVisible: false,
        fps: 0,
        headMovement: "unknown",
        lastFrameTime: null,
        poseConfidence: null,
        poseLandmarks: [],
        poseLandmarksCount: 0,
        poseVisible: false,
        postureSignal: "unknown",
        videoHeight: 0,
        videoWidth: 0,
        ...patch,
      });
    },
    [setTrackingState],
  );

  const stopTracking = useCallback(() => {
    isLoopRunningRef.current = false;
    clearAnimationFrame();
    resetSignals({
      isTracking: false,
      trackingError: null,
      trackingStatus: state.isSupported ? "idle" : "unsupported",
    });
  }, [clearAnimationFrame, resetSignals, state.isSupported]);

  const initialize = useCallback(async () => {
    const support = getMediaPipeSupportStatus();

    if (!support.supported) {
      setTrackingState({
        isInitializing: false,
        isSupported: false,
        isTracking: false,
        trackingError: support.reason,
        trackingStatus: "unsupported",
      });
      return false;
    }

    if (faceLandmarkerRef.current) {
      setTrackingState({
        isSupported: true,
        poseEnabled: Boolean(poseLandmarkerRef.current),
      });
      return true;
    }

    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    initializationPromiseRef.current = (async () => {
      setTrackingState({
        isInitializing: true,
        isSupported: true,
        trackingError: null,
        trackingStatus: "loading",
      });

      try {
        const bundle = await createMediaPipeTrackerBundle();
        faceLandmarkerRef.current = bundle.faceLandmarker;
        poseLandmarkerRef.current = bundle.poseLandmarker;
        setTrackingState({
          isInitializing: false,
          poseEnabled: Boolean(bundle.poseLandmarker),
          poseError: bundle.poseError,
          trackingError: null,
          trackingStatus: "idle",
        });
        return true;
      } catch (error) {
        closeTrackers();
        setTrackingState({
          isInitializing: false,
          isTracking: false,
          poseEnabled: false,
          trackingError: getErrorMessage(error),
          trackingStatus: "error",
        });
        return false;
      } finally {
        initializationPromiseRef.current = null;
      }
    })();

    return initializationPromiseRef.current;
  }, [closeTrackers, setTrackingState]);

  const analyzeFrame = useCallback(
    (timestamp: number) => {
      if (!isLoopRunningRef.current || !enabledRef.current || !isCameraActiveRef.current) {
        isLoopRunningRef.current = false;
        return;
      }

      const scheduleNextFrame = () => {
        if (isLoopRunningRef.current && typeof window !== "undefined") {
          rafIdRef.current = window.requestAnimationFrame(analyzeFrame);
        }
      };

      const analysisInterval = 1000 / Math.max(1, targetFpsRef.current);
      if (timestamp - lastAnalysisTimeRef.current < analysisInterval) {
        scheduleNextFrame();
        return;
      }

      const video = videoRef.current;

      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
        scheduleNextFrame();
        return;
      }

      const faceLandmarker = faceLandmarkerRef.current;
      if (!faceLandmarker) {
        setTrackingState({
          isTracking: false,
          trackingError: "Face tracking is not initialized.",
          trackingStatus: "error",
        });
        isLoopRunningRef.current = false;
        return;
      }

      lastAnalysisTimeRef.current = timestamp;

      try {
        const faceResult = faceLandmarker.detectForVideo(video, timestamp);
        let poseResult: PoseLandmarkerResult | null = null;
        let poseError: string | null | undefined;

        if (poseLandmarkerRef.current) {
          try {
            poseResult = poseLandmarkerRef.current.detectForVideo(video, timestamp);
          } catch (error) {
            poseLandmarkerRef.current.close();
            poseLandmarkerRef.current = null;
            poseError = `Pose tracking disabled: ${getErrorMessage(error)}`;
          }
        }

        const snapshot = createTrackingSnapshot(
          faceResult,
          poseResult,
          video,
          timestamp,
          previousFaceCenterRef,
          frameTimesRef,
        );

        poseResult?.close();

        setTrackingState({
          ...snapshot,
          ...(poseError ? { poseError } : {}),
          isInitializing: false,
          isTracking: true,
          poseEnabled: Boolean(poseLandmarkerRef.current),
          trackingError: null,
          trackingStatus: "active",
        });
      } catch (error) {
        isLoopRunningRef.current = false;
        clearAnimationFrame();
        setTrackingState({
          isInitializing: false,
          isTracking: false,
          trackingError: getErrorMessage(error),
          trackingStatus: "error",
        });
        return;
      }

      scheduleNextFrame();
    },
    [clearAnimationFrame, setTrackingState, videoRef],
  );

  const startTracking = useCallback(async () => {
    if (!enabledRef.current || !isCameraActiveRef.current) {
      stopTracking();
      return;
    }

    const initialized = await initialize();
    if (
      !initialized ||
      !enabledRef.current ||
      !isCameraActiveRef.current ||
      isLoopRunningRef.current
    ) {
      return;
    }

    isLoopRunningRef.current = true;
    setTrackingState({
      isInitializing: false,
      isTracking: true,
      trackingError: null,
      trackingStatus: "active",
    });

    if (typeof window !== "undefined") {
      rafIdRef.current = window.requestAnimationFrame(analyzeFrame);
    }
  }, [analyzeFrame, initialize, setTrackingState, stopTracking]);

  const resetTracking = useCallback(() => {
    isLoopRunningRef.current = false;
    clearAnimationFrame();
    closeTrackers();
    initializationPromiseRef.current = null;
    resetSignals({
      isInitializing: false,
      isTracking: false,
      poseEnabled: false,
      poseError: null,
      trackingError: null,
      trackingStatus: state.isSupported ? "idle" : "unsupported",
    });
  }, [clearAnimationFrame, closeTrackers, resetSignals, state.isSupported]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  useEffect(() => {
    targetFpsRef.current = targetFps;
  }, [targetFps]);

  useEffect(() => {
    if (!enabled || !isCameraActive) {
      stopTracking();
      return;
    }

    void startTracking();
  }, [enabled, isCameraActive, startTracking, stopTracking]);

  useEffect(() => {
    return () => {
      isLoopRunningRef.current = false;
      clearAnimationFrame();
      closeTrackers();
    };
  }, [clearAnimationFrame, closeTrackers]);

  return {
    ...state,
    initialize,
    resetTracking,
    startTracking,
    stopTracking,
  };
}
