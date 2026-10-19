import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { ChoiceKey } from '../types/quiz';

export interface FingerCountResult {
  count: number;
  extendedFingers: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  mappedChoice: ChoiceKey | null;
  confidence: number;
  hintText?: string;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

class HandDetectorService {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<HandLandmarker | null> | null = null;

  public async initialize(): Promise<HandLandmarker | null> {
    if (this.handLandmarker) return this.handLandmarker;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        // Try GPU first, fallback to CPU if needed
        try {
          this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuError) {
          console.warn('GPU delegate failed for HandLandmarker, falling back to CPU:', gpuError);
          this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        this.isInitializing = false;
        return this.handLandmarker;
      } catch (err) {
        console.error('Failed to initialize MediaPipe HandLandmarker:', err);
        this.isInitializing = false;
        return null;
      }
    })();

    return this.initPromise;
  }

  public isReady(): boolean {
    return this.handLandmarker !== null;
  }

  public detect(videoElement: HTMLVideoElement, timestampMs: number) {
    if (!this.handLandmarker) return null;
    try {
      return this.handLandmarker.detectForVideo(videoElement, timestampMs);
    } catch {
      return null;
    }
  }

  /**
   * Count extended fingers and map to question choices:
   * 1 finger -> A
   * 2 fingers -> B
   * 3 fingers -> C
   * 5 fingers -> D
   */
  public analyzeHandFingers(landmarks: NormalizedLandmark[]): FingerCountResult {
    if (!landmarks || landmarks.length < 21) {
      return {
        count: 0,
        extendedFingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
        mappedChoice: null,
        confidence: 0,
      };
    }

    const wrist = landmarks[0];
    const thumbMcp = landmarks[2];
    const thumbIp = landmarks[3];
    const thumbTip = landmarks[4];

    const indexMcp = landmarks[5];
    const indexPip = landmarks[6];
    const indexTip = landmarks[8];

    const middleMcp = landmarks[9];
    const middlePip = landmarks[10];
    const middleTip = landmarks[12];

    const ringMcp = landmarks[13];
    const ringPip = landmarks[14];
    const ringTip = landmarks[16];

    const pinkyMcp = landmarks[17];
    const pinkyPip = landmarks[18];
    const pinkyTip = landmarks[20];

    // Distance helper
    const dist = (p1: NormalizedLandmark, p2: NormalizedLandmark) => {
      return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    };

    // For 4 long fingers:
    // They are extended if Tip is further from Wrist than PIP and MCP,
    // and tip.y is higher up (smaller y in camera coords) than pip.y
    const isExtended = (tip: NormalizedLandmark, pip: NormalizedLandmark, mcp: NormalizedLandmark) => {
      const tipToWrist = dist(tip, wrist);
      const pipToWrist = dist(pip, wrist);
      const isHigher = tip.y < pip.y;
      return isHigher && tipToWrist > pipToWrist * 1.15;
    };

    const isIndexExtended = isExtended(indexTip, indexPip, indexMcp);
    const isMiddleExtended = isExtended(middleTip, middlePip, middleMcp);
    const isRingExtended = isExtended(ringTip, ringPip, ringMcp);
    const isPinkyExtended = isExtended(pinkyTip, pinkyPip, pinkyMcp);

    // Thumb extension:
    // When open, thumb tip is far from index MCP (5) and pinky MCP (17)
    // and thumb tip is further from wrist than thumb MCP (2)
    const thumbTipToPinky = dist(thumbTip, pinkyMcp);
    const thumbIpToPinky = dist(thumbIp, pinkyMcp);
    const thumbTipToWrist = dist(thumbTip, wrist);
    const thumbMcpToWrist = dist(thumbMcp, wrist);

    const isThumbExtended =
      thumbTipToWrist > thumbMcpToWrist * 1.2 &&
      (thumbTipToPinky > thumbIpToPinky * 1.15 || dist(thumbTip, indexMcp) > dist(thumbIp, indexMcp) * 1.25);

    // Collect extended status
    const extendedFingers = {
      thumb: isThumbExtended,
      index: isIndexExtended,
      middle: isMiddleExtended,
      ring: isRingExtended,
      pinky: isPinkyExtended,
    };

    // Count how many fingers are up
    let count = 0;
    if (isThumbExtended) count++;
    if (isIndexExtended) count++;
    if (isMiddleExtended) count++;
    if (isRingExtended) count++;
    if (isPinkyExtended) count++;

    let mappedChoice: ChoiceKey | null = null;
    let hintText: string | undefined = undefined;

    if (count === 1) {
      mappedChoice = 'A';
    } else if (count === 2) {
      mappedChoice = 'B';
    } else if (count === 3) {
      mappedChoice = 'C';
    } else if (count === 5) {
      mappedChoice = 'D';
    } else if (count === 4) {
      // Prompt user to open thumb for 5 (D) or close pinky/ring for 3 (C)
      hintText = 'Giơ 5 ngón chọn D hoặc gập bớt 1 ngón chọn C';
    }

    return {
      count,
      extendedFingers,
      mappedChoice,
      confidence: 0.9,
      hintText,
    };
  }

  /**
   * Draw glowing futuristic skeleton on the canvas
   */
  public drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    width: number,
    height: number,
    mappedChoice: ChoiceKey | null
  ) {
    ctx.save();

    // Hand connections
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm base
      [5, 9], [9, 13], [13, 17],
    ];

    // Dynamic accent color based on choice
    let strokeColor = 'rgba(56, 189, 248, 0.8)'; // cyan
    let glowColor = '#38bdf8';
    if (mappedChoice === 'A') {
      strokeColor = 'rgba(239, 68, 68, 0.85)'; // Red for A
      glowColor = '#ef4444';
    } else if (mappedChoice === 'B') {
      strokeColor = 'rgba(59, 130, 246, 0.85)'; // Blue for B
      glowColor = '#3b82f6';
    } else if (mappedChoice === 'C') {
      strokeColor = 'rgba(245, 158, 11, 0.85)'; // Amber for C
      glowColor = '#f59e0b';
    } else if (mappedChoice === 'D') {
      strokeColor = 'rgba(16, 185, 129, 0.85)'; // Green for D
      glowColor = '#10b981';
    }

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    // Draw connection lines
    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }

    // Draw landmark joint points
    landmarks.forEach((lm, idx) => {
      const x = lm.x * width;
      const y = lm.y * height;
      const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;

      ctx.beginPath();
      ctx.arc(x, y, isTip ? 6 : 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ffffff' : glowColor;
      ctx.shadowBlur = isTip ? 14 : 6;
      ctx.shadowColor = '#ffffff';
      ctx.fill();
    });

    ctx.restore();
  }
}

export const handDetector = new HandDetectorService();
