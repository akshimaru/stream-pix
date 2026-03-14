"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildAlertSpeechText, socketEvents, type OverlayAlertEvent, type OverlayBootstrap } from "@streampix/shared";
import { getSocket } from "@/lib/socket";
import { playOverlayAlertSound } from "@/lib/alert-sound";
import { speakBrowserTts } from "@/lib/browser-tts";

export function LiveOverlay({ bootstrap }: { bootstrap: OverlayBootstrap }) {
  const [queue, setQueue] = useState<OverlayAlertEvent[]>([]);
  const [current, setCurrent] = useState<OverlayAlertEvent | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit(socketEvents.overlaySubscribe, {
      token: bootstrap.overlayToken,
    });

    const onAlert = (payload: OverlayAlertEvent) => {
      setQueue((currentQueue) => [...currentQueue, payload]);
    };

    socket.on(socketEvents.overlayAlert, onAlert);
    return () => {
      socket.off(socketEvents.overlayAlert, onAlert);
    };
  }, [bootstrap.overlayToken]);

  useEffect(() => {
    if (current || queue.length === 0) {
      return;
    }

    let cancelled = false;
    const next = queue[0];

    if (!next) {
      return;
    }

    const rest = queue.slice(1);
    setCurrent(next);
    setQueue(rest);

    const durationPromise = new Promise<void>((resolve) => {
      timeoutRef.current = setTimeout(resolve, next.durationMs);
    });

    const speechPromise = playOverlayAlertSound({
      preset: next.settings.alertSound,
      volume: next.settings.volume,
    }).then(() =>
      speakBrowserTts({
        text: buildAlertSpeechText({
          supporterName: next.supporterName,
          amount: next.amount,
          message: next.message,
          isAnonymous: next.isAnonymous,
        }),
        voiceName: next.voice.name,
        language: next.voice.language,
        speed: next.voice.speed,
        pitch: next.voice.pitch,
        volume: next.voice.volume,
      }),
    );

    void Promise.all([durationPromise, speechPromise]).then(() => {
      if (!cancelled) {
        setCurrent(null);
      }
    });

    return () => {
      cancelled = true;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [current, queue]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const positionClass = useMemo(() => {
    switch (bootstrap.settings.position) {
      case "TOP_LEFT":
        return "items-start justify-start";
      case "TOP_RIGHT":
        return "items-start justify-end";
      case "BOTTOM_LEFT":
        return "items-end justify-start";
      case "CENTER":
        return "items-center justify-center";
      default:
        return "items-end justify-end";
    }
  }, [bootstrap.settings.position]);

  return (
    <div className={`flex min-h-screen w-full p-8 ${positionClass}`}>
      <AnimatePresence>
        {current ? (
          <motion.div
            key={current.alertId}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.28 }}
            className="relative overflow-hidden rounded-[32px] border border-white/15 px-6 py-5 text-white shadow-neon backdrop-blur"
            style={{
              width: bootstrap.settings.cardWidth,
              background: `linear-gradient(135deg, ${bootstrap.settings.primaryColor}22, rgba(6,10,20,0.96), ${bootstrap.settings.secondaryColor}18)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background: `radial-gradient(circle at top right, ${bootstrap.settings.accentColor}55, transparent 38%)`,
              }}
            />
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-[0.32em] text-white/55">{bootstrap.displayName}</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-[var(--font-orbitron)] text-2xl font-black">
                    {bootstrap.settings.showName ? current.supporterName : "Novo StreamPix"}
                  </p>
                  {bootstrap.settings.showAmount ? (
                    <p className="mt-1 text-sm text-cyan-200/80">R$ {current.amount.toFixed(2)} em tempo real</p>
                  ) : null}
                </div>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${bootstrap.settings.secondaryColor}66, ${bootstrap.settings.accentColor}55)`,
                  }}
                >
                  PIX
                </div>
              </div>
              <p className="mt-4 text-lg leading-relaxed text-white/88">{current.message}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
