import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Volume2, VolumeX, Radar } from "lucide-react";
import { CameraView } from "@/components/CameraView";
import { StatusIndicator } from "@/components/StatusIndicator";
import { useCamera } from "@/hooks/useCamera";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import type { Detection } from "@/components/DetectionOverlay";

// Simulated AI detection (replace with real AI backend call)
function simulateDetection(): Detection[] {
  const objects = [
    { label: "Person", direction: "Ahead", distance: "3m", severity: "warning" as const },
    { label: "Bench", direction: "Left", distance: "1.5m", severity: "danger" as const },
    { label: "Bicycle", direction: "Right", distance: "4m", severity: "warning" as const },
    { label: "Curb", direction: "Ahead", distance: "2m", severity: "danger" as const },
    { label: "Car", direction: "Right", distance: "5m", severity: "warning" as const },
  ];
  const count = Math.floor(Math.random() * 3);
  if (count === 0) return [];
  const shuffled = objects.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getStatus(detections: Detection[]): "safe" | "warning" | "danger" {
  if (detections.some((d) => d.severity === "danger")) return "danger";
  if (detections.some((d) => d.severity === "warning")) return "warning";
  return "safe";
}

function buildVoiceMessage(detections: Detection[]): string | null {
  if (detections.length === 0) return null;
  const danger = detections.filter((d) => d.severity === "danger");
  if (danger.length > 0) {
    return danger.map((d) => `${d.label} ${d.direction.toLowerCase()}, ${d.distance}`).join(". ");
  }
  return `Caution: ${detections.map((d) => `${d.label} ${d.direction.toLowerCase()}`).join(", ")}`;
}

export default function Index() {
  const { videoRef, canvasRef, isActive, error, start, stop, captureFrame } = useCamera();
  const { speak, cancel } = useVoiceGuidance();
  const [detections, setDetections] = useState<Detection[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [scanning, setScanning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const status = isActive ? (scanning ? getStatus(detections) : "safe") : "idle";

  const toggleCamera = useCallback(async () => {
    if (isActive) {
      stop();
      cancel();
      setDetections([]);
      setScanning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      await start();
    }
  }, [isActive, start, stop, cancel]);

  const toggleScanning = useCallback(() => {
    if (!isActive) return;
    if (scanning) {
      setScanning(false);
      setDetections([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setScanning(true);
    }
  }, [isActive, scanning]);

  useEffect(() => {
    if (!scanning || !isActive) return;
    intervalRef.current = setInterval(() => {
      // In production: captureFrame() → send to AI → get detections
      const results = simulateDetection();
      setDetections(results);
      if (voiceEnabled) {
        const msg = buildVoiceMessage(results);
        if (msg) speak(msg);
      }
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scanning, isActive, voiceEnabled, captureFrame, speak]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 gap-6 max-w-md mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Safe<span className="text-primary">Step</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AI Navigation Assistant</p>
      </motion.div>

      {/* Status */}
      <StatusIndicator status={status} />

      {/* Camera */}
      <CameraView
        detections={detections}
        isActive={isActive}
        videoRef={videoRef}
        canvasRef={canvasRef}
        error={error}
      />

      {/* Controls */}
      <div className="flex gap-4 w-full">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleCamera}
          className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl text-lg font-semibold transition-colors ${
            isActive
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}
          aria-label={isActive ? "Stop camera" : "Start camera"}
        >
          {isActive ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          {isActive ? "Stop" : "Start"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleScanning}
          disabled={!isActive}
          className={`flex items-center justify-center gap-2 px-6 py-5 rounded-2xl font-semibold transition-colors ${
            scanning
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-secondary-foreground"
          } disabled:opacity-30`}
          aria-label={scanning ? "Stop scanning" : "Start scanning"}
        >
          <Radar className="w-6 h-6" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setVoiceEnabled((v) => !v);
            if (voiceEnabled) cancel();
          }}
          className={`flex items-center justify-center px-6 py-5 rounded-2xl font-semibold transition-colors ${
            voiceEnabled
              ? "bg-secondary text-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
          aria-label={voiceEnabled ? "Mute voice" : "Enable voice"}
        >
          {voiceEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </motion.button>
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center px-4">
        Point your camera ahead. SafeStep detects obstacles and guides you with voice alerts.
      </p>
    </div>
  );
}
