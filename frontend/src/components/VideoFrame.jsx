import { useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import { Loader2, Video } from "lucide-react";

export function VideoFrame({ url, token, onLeft, onJoined }) {
  const host = useRef(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(true);
  const handlers = useRef({ onLeft, onJoined });
  handlers.current = { onLeft, onJoined };

  useEffect(() => {
    if (!url || !host.current) return;
    const existing = DailyIframe.getCallInstance();
    if (existing) existing.destroy();
    const frame = DailyIframe.createFrame(host.current, {
      showLeaveButton: true, showFullscreenButton: true,
      iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "12px" },
    });
    frame.on("joined-meeting", () => { setJoining(false); handlers.current.onJoined?.(); });
    frame.on("left-meeting", () => handlers.current.onLeft?.());
    frame.on("error", (e) => setError(e?.errorMsg || "The call ran into a problem."));
    frame.join({ url, token }).then(() => setJoining(false)).catch((e) => setError(e?.message || "Couldn't join the call."));
    return () => { frame.destroy(); };
  }, [url, token]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl bg-ink overflow-hidden" data-testid="video-frame">
      <div ref={host} className="absolute inset-0" />
      {joining && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3 pointer-events-none">
          <Loader2 className="h-6 w-6 animate-spin" /> <span className="text-sm">Opening the room…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-6 text-center" data-testid="video-error">
          <Video className="h-7 w-7 text-signal" /> <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
