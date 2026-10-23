import { useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import { Loader2, Video } from "lucide-react";

const FRIENDLY = {
  "account-missing-payment-method": "Video calls are paused: the video provider account needs a payment method before calls can start.",
  "exp-room": "This room has expired. Start the call again to get a fresh room.",
  "exp-token": "Your call link expired. Reload the page to rejoin.",
};

export function VideoFrame({ url, token, onLeft, onJoined }) {
  const host = useRef(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(true);
  const handlers = useRef({ onLeft, onJoined });
  handlers.current = { onLeft, onJoined };

  useEffect(() => {
    if (!url || !host.current) return;
    // React StrictMode mounts effects twice and destroy() is async, so allow a transient second instance
    const frame = DailyIframe.createFrame(host.current, {
      allowMultipleCallInstances: true,
      showLeaveButton: true, showFullscreenButton: true,
      iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "12px" },
    });
    let active = true;
    let failed = false;
    const fail = (msg) => {
      if (!active) return;
      failed = true;
      const key = Object.keys(FRIENDLY).find((k) => (msg || "").includes(k));
      setError(key ? FRIENDLY[key] : "Couldn't connect to the call. Please try again.");
    };
    frame.on("joined-meeting", () => { if (!active) return; setJoining(false); handlers.current.onJoined?.(); });
    frame.on("left-meeting", () => { if (active && !failed) handlers.current.onLeft?.(); });
    frame.on("error", (e) => fail(e?.errorMsg || e?.error?.type));
    frame.join({ url, token }).then(() => { if (active) setJoining(false); }).catch((e) => fail(e?.message));
    return () => { active = false; frame.destroy(); };
  }, [url, token]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl bg-ink overflow-hidden" data-testid="video-frame">
      <div ref={host} className={`absolute inset-0 ${error ? "invisible" : ""}`} />
      {joining && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3 pointer-events-none">
          <Loader2 className="h-6 w-6 animate-spin" /> <span className="text-sm">Opening the room…</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-ink flex flex-col items-center justify-center text-white gap-3 p-6 text-center" data-testid="video-error">
          <Video className="h-7 w-7 text-signal" /> <p className="text-sm max-w-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
