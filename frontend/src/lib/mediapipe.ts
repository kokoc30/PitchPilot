import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

export const MEDIAPIPE_TASKS_VERSION = "0.10.35";
export const MEDIAPIPE_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/wasm`;
export const MEDIAPIPE_FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
export const MEDIAPIPE_POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export const MEDIAPIPE_ASSET_STRATEGY =
  "MediaPipe Tasks Vision loads WASM from jsDelivr and face/pose .task models from Google's public MediaPipe model bucket.";

export type MediaPipeSupportStatus = {
  supported: boolean;
  reason: string | null;
};

export type MediaPipeTrackerBundle = {
  faceLandmarker: FaceLandmarker;
  poseLandmarker: PoseLandmarker | null;
  poseError: string | null;
};

export function getMediaPipeSupportStatus(): MediaPipeSupportStatus {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      supported: false,
      reason: "MediaPipe tracking requires a browser environment.",
    };
  }

  if (!("WebAssembly" in window)) {
    return {
      supported: false,
      reason: "This browser does not expose WebAssembly, which MediaPipe requires.",
    };
  }

  if (typeof window.requestAnimationFrame !== "function") {
    return {
      supported: false,
      reason: "This browser does not support requestAnimationFrame.",
    };
  }

  return { supported: true, reason: null };
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "MediaPipe tracking failed to initialize.";
}

export async function createMediaPipeTrackerBundle(): Promise<MediaPipeTrackerBundle> {
  const { FaceLandmarker, FilesetResolver, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );

  const visionFiles = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE_URL);
  const faceLandmarker = await FaceLandmarker.createFromOptions(visionFiles, {
    baseOptions: {
      delegate: "CPU",
      modelAssetPath: MEDIAPIPE_FACE_MODEL_URL,
    },
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    runningMode: "VIDEO",
  });

  let poseLandmarker: PoseLandmarker | null = null;
  let poseError: string | null = null;

  try {
    poseLandmarker = await PoseLandmarker.createFromOptions(visionFiles, {
      baseOptions: {
        delegate: "CPU",
        modelAssetPath: MEDIAPIPE_POSE_MODEL_URL,
      },
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      numPoses: 1,
      outputSegmentationMasks: false,
      runningMode: "VIDEO",
    });
  } catch (error) {
    poseError = `Pose tracking disabled: ${getErrorMessage(error)}`;
  }

  return {
    faceLandmarker,
    poseLandmarker,
    poseError,
  };
}
