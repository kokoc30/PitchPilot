import { useEffect, useRef } from "react";
import type {
  FaceBounds,
  MediaPipeTrackingState,
  TrackingLandmark,
} from "../../hooks/useMediaPipeTracking";

type MediaPipeOverlayProps = {
  tracking: MediaPipeTrackingState;
};

type FrameTransform = {
  offsetX: number;
  offsetY: number;
  drawWidth: number;
  drawHeight: number;
};

const LEFT_SHOULDER_INDEX = 11;
const RIGHT_SHOULDER_INDEX = 12;

function prepareCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const pixelRatio = window.devicePixelRatio || 1;

  if (
    canvas.width !== Math.round(width * pixelRatio) ||
    canvas.height !== Math.round(height * pixelRatio)
  ) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  return { context, height, width };
}

function getFrameTransform(
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number,
): FrameTransform {
  if (!videoWidth || !videoHeight) {
    return {
      offsetX: 0,
      offsetY: 0,
      drawHeight: canvasHeight,
      drawWidth: canvasWidth,
    };
  }

  const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;

  return {
    drawHeight,
    drawWidth,
    offsetX: (canvasWidth - drawWidth) / 2,
    offsetY: (canvasHeight - drawHeight) / 2,
  };
}

function toCanvasPoint(landmark: TrackingLandmark, transform: FrameTransform) {
  return {
    x: transform.offsetX + landmark.x * transform.drawWidth,
    y: transform.offsetY + landmark.y * transform.drawHeight,
  };
}

function boundsToCanvas(bounds: FaceBounds, transform: FrameTransform) {
  const topLeft = toCanvasPoint({ x: bounds.x, y: bounds.y, z: 0 }, transform);

  return {
    height: bounds.height * transform.drawHeight,
    width: bounds.width * transform.drawWidth,
    x: topLeft.x,
    y: topLeft.y,
  };
}

function drawCenterGuide(context: CanvasRenderingContext2D, width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const guideWidth = Math.min(width * 0.22, 120);
  const guideHeight = Math.min(height * 0.26, 120);

  context.save();
  context.strokeStyle = "rgba(45, 212, 191, 0.34)";
  context.lineWidth = 1;
  context.setLineDash([6, 8]);
  context.beginPath();
  context.moveTo(centerX, centerY - guideHeight / 2);
  context.lineTo(centerX, centerY + guideHeight / 2);
  context.moveTo(centerX - guideWidth / 2, centerY);
  context.lineTo(centerX + guideWidth / 2, centerY);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = "rgba(45, 212, 191, 0.42)";
  context.strokeRect(
    centerX - guideWidth / 2,
    centerY - guideHeight / 2,
    guideWidth,
    guideHeight,
  );
  context.restore();
}

function drawFaceOverlay(
  context: CanvasRenderingContext2D,
  tracking: MediaPipeTrackingState,
  transform: FrameTransform,
) {
  if (!tracking.faceVisible) return;

  if (tracking.faceBounds) {
    const bounds = boundsToCanvas(tracking.faceBounds, transform);
    context.save();
    context.strokeStyle = "rgba(45, 212, 191, 0.86)";
    context.lineWidth = 2;
    context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    context.restore();
  }

  context.save();
  context.fillStyle = "rgba(129, 140, 248, 0.72)";
  for (const landmark of tracking.faceLandmarks) {
    const point = toCanvasPoint(landmark, transform);
    context.beginPath();
    context.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawPoseOverlay(
  context: CanvasRenderingContext2D,
  tracking: MediaPipeTrackingState,
  transform: FrameTransform,
) {
  if (!tracking.poseVisible) return;

  const leftShoulder = tracking.poseLandmarks[LEFT_SHOULDER_INDEX];
  const rightShoulder = tracking.poseLandmarks[RIGHT_SHOULDER_INDEX];
  if (!leftShoulder || !rightShoulder) return;

  const leftPoint = toCanvasPoint(leftShoulder, transform);
  const rightPoint = toCanvasPoint(rightShoulder, transform);

  context.save();
  context.strokeStyle = "rgba(251, 191, 36, 0.82)";
  context.fillStyle = "rgba(253, 230, 138, 0.88)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(leftPoint.x, leftPoint.y);
  context.lineTo(rightPoint.x, rightPoint.y);
  context.stroke();

  for (const point of [leftPoint, rightPoint]) {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function MediaPipeOverlay({ tracking }: MediaPipeOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prepared = prepareCanvas(canvas);
    if (!prepared) return;

    const { context, height, width } = prepared;

    if (!tracking.isTracking) {
      return;
    }

    const transform = getFrameTransform(
      width,
      height,
      tracking.videoWidth,
      tracking.videoHeight,
    );

    drawCenterGuide(context, width, height);
    drawFaceOverlay(context, tracking, transform);
    drawPoseOverlay(context, tracking, transform);
  }, [
    tracking.faceBounds,
    tracking.faceLandmarks,
    tracking.faceVisible,
    tracking.isTracking,
    tracking.poseLandmarks,
    tracking.poseVisible,
    tracking.videoHeight,
    tracking.videoWidth,
  ]);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      ref={canvasRef}
    />
  );
}
