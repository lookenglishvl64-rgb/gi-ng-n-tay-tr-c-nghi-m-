import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { handDetector, FingerCountResult } from '../services/handDetector';
import { ChoiceKey } from '../types/quiz';

interface CameraViewProps {
  onFingerDetected: (result: FingerCountResult | null) => void;
  activeChoice: ChoiceKey | null;
  holdProgress: number; // 0 to 1
  isLocked: boolean;
  className?: string;
  miniMode?: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onFingerDetected,
  activeChoice,
  holdProgress,
  isLocked,
  className = '',
  miniMode = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [currentGesture, setCurrentGesture] = useState<FingerCountResult | null>(null);

  // Initialize MediaPipe model
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setModelLoading(true);
        const landmarker = await handDetector.initialize();
        if (mounted) {
          if (!landmarker) {
            setModelError('Không thể tải mô hình nhận diện cử chỉ. Vui lòng kiểm tra kết nối mạng.');
          }
          setModelLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setModelError('Lỗi khởi tạo nhận diện cử chỉ.');
          setModelLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Start webcam stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreamActive(true);
        };
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errorMsg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Trình duyệt chưa được cấp quyền truy cập Camera. Vui lòng cho phép Camera để chơi bằng cử chỉ.'
          : 'Không thể mở Camera. Vui lòng kiểm tra webcam hoặc chọn đáp án bằng bàn phím/chuột.';
      setCameraError(errorMsg);
      setStreamActive(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [startCamera]);

  // Frame processing loop
  useEffect(() => {
    let lastTime = -1;

    const processFrame = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        streamActive &&
        handDetector.isReady()
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const now = performance.now();

        if (now !== lastTime && canvas) {
          lastTime = now;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const detection = handDetector.detect(video, now);

            if (
              detection &&
              detection.landmarks &&
              detection.landmarks.length > 0 &&
              detection.landmarks[0]
            ) {
              const rawLandmarks = detection.landmarks[0];
              // Map landmarks for mirrored view
              const landmarks = rawLandmarks.map((lm) => ({
                x: 1 - lm.x, // mirror horizontally
                y: lm.y,
                z: lm.z,
              }));

              const result = handDetector.analyzeHandFingers(landmarks);
              setCurrentGesture(result);
              onFingerDetected(result);

              if (showSkeleton) {
                handDetector.drawLandmarks(
                  ctx,
                  landmarks,
                  canvas.width,
                  canvas.height,
                  result.mappedChoice
                );
              }
            } else {
              setCurrentGesture(null);
              onFingerDetected(null);
            }
          }
        }
      }
      animFrameId.current = requestAnimationFrame(processFrame);
    };

    animFrameId.current = requestAnimationFrame(processFrame);
    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [streamActive, showSkeleton, onFingerDetected]);

  const toggleCamera = () => {
    if (streamActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
      setStreamActive(false);
      onFingerDetected(null);
      setCurrentGesture(null);
    } else {
      startCamera();
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const getChoiceBadge = () => {
    if (!currentGesture || currentGesture.count === 0) return null;
    const choice = currentGesture.mappedChoice;
    if (choice) {
      const colors: Record<ChoiceKey, string> = {
        A: 'bg-rose-500 text-white shadow-rose-500/50',
        B: 'bg-blue-500 text-white shadow-blue-500/50',
        C: 'bg-amber-500 text-white shadow-amber-500/50',
        D: 'bg-emerald-500 text-white shadow-emerald-500/50',
      };
      return (
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-bounce ${colors[choice]}`}
        >
          <span>{currentGesture.count} ngón</span>
          <span>➜</span>
          <span>Chọn {choice}</span>
        </div>
      );
    } else if (currentGesture.count === 4) {
      return (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400 text-slate-900 shadow-md">
          <span>4 ngón (Giơ thêm ngón cái để thành D)</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col ${className}`}
    >
      {/* Video & Canvas Container */}
      <div className="relative w-full aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Hidden/Mirrored Video */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
        />

        {/* Skeleton Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Loading / Status Overlay */}
        {modelLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-white font-semibold text-sm">Đang nạp mô hình nhận diện tay AI...</p>
            <p className="text-slate-400 text-xs mt-1">Chuẩn bị camera của bạn</p>
          </div>
        )}

        {/* Error Overlay */}
        {(cameraError || modelError) && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-4 z-20">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-rose-200 font-semibold text-xs mb-3">{cameraError || modelError}</p>
            <button
              onClick={startCamera}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow"
            >
              Thử lại Camera
            </button>
          </div>
        )}

        {!streamActive && !modelLoading && !cameraError && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-4">
            <CameraOff className="w-12 h-12 mb-2 text-slate-500" />
            <p className="text-sm font-medium">Camera đang tắt</p>
            <button
              onClick={startCamera}
              className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
            >
              Bật Camera
            </button>
          </div>
        )}

        {/* Hold progress radial ring on camera */}
        {activeChoice && holdProgress > 0 && !isLocked && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-indigo-500/40 shadow-lg">
            <div className="relative w-6 h-6">
              <svg className="w-6 h-6 -rotate-90">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  className="stroke-slate-700 fill-none"
                  strokeWidth="3"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  className="stroke-indigo-400 fill-none transition-all duration-75"
                  strokeWidth="3"
                  strokeDasharray="56.5"
                  strokeDashoffset={56.5 * (1 - holdProgress)}
                />
              </svg>
            </div>
            <span className="text-xs font-bold text-indigo-300">
              Giữ yên: {Math.round(holdProgress * 100)}%
            </span>
          </div>
        )}

        {/* Live Detected Badge */}
        <div className="absolute top-3 right-3 z-30">{getChoiceBadge()}</div>

        {/* Gesture guide bottom pill */}
        {!miniMode && streamActive && (
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/85 backdrop-blur-sm rounded-xl p-2 border border-slate-700/60 flex items-center justify-around text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <span className="font-bold text-rose-400">1 ngón:</span> A
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-blue-400">2 ngón:</span> B
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-amber-400">3 ngón:</span> C
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-emerald-400">5 ngón:</span> D
            </span>
          </div>
        )}
      </div>

      {/* Camera Controls Bar */}
      <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCamera}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              streamActive
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title={streamActive ? 'Tắt camera' : 'Bật camera'}
          >
            {streamActive ? <Camera className="w-4 h-4 text-emerald-400" /> : <CameraOff className="w-4 h-4" />}
            <span className="text-[11px]">{streamActive ? 'Đang nhận diện' : 'Bật Cam'}</span>
          </button>

          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`p-1.5 rounded-lg text-xs transition ${
              showSkeleton
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Bật/Tắt vẽ khung xương bàn tay"
          >
            {showSkeleton ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={flipCamera}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            title="Đổi camera trước/sau"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
