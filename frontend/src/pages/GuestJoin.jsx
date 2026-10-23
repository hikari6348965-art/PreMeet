import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { VideoFrame } from "../components/VideoFrame";
import { FileText, Loader2, Video } from "lucide-react";

export default function GuestJoin() {
  const { meetingId } = useParams();
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [room, setRoom] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(false);

  const join = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { const { data } = await api.post(`/public/rooms/${meetingId}/join`, { k: params.get("k") || "", name }); setRoom(data); }
    catch (err) { setError(formatApiErrorDetail(err.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col" data-testid="guest-join-page">
      <header className="px-6 h-16 flex items-center gap-2 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg bg-signal text-ink flex items-center justify-center"><FileText className="h-4 w-4" /></div>
        <span className="font-display font-bold text-lg">BriefCraft</span>
        {room && <span className="ml-3 text-sm text-white/60 truncate">{room.title}</span>}
      </header>
      {room && !left ? (
        <div className="flex-1 p-4"><div className="h-[calc(100vh-6rem)]"><VideoFrame url={room.url} token={room.token} onLeft={() => setLeft(true)} /></div></div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          {left ? (
            <p className="text-lg font-display" data-testid="guest-left-message">You've left the call. Thanks for joining.</p>
          ) : (
            <form onSubmit={join} className="w-full max-w-sm bc-rise">
              <Video className="h-8 w-8 text-signal" />
              <h1 className="mt-4 text-3xl font-bold">Join the call</h1>
              <p className="mt-2 text-white/60 text-sm">This call may be recorded to create meeting notes for the host.</p>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="Your name"
                data-testid="guest-name-input"
                className="mt-6 w-full h-11 rounded-lg bg-white/5 border border-white/15 px-3 text-sm placeholder:text-white/40 focus:outline-none focus:border-signal" />
              {error && <p className="mt-3 text-sm text-red-300" data-testid="guest-join-error">{error}</p>}
              <button disabled={busy} data-testid="guest-join-btn"
                className="mt-4 w-full h-11 rounded-lg bg-signal text-ink font-bold flex items-center justify-center gap-2 hover:brightness-95 transition active:scale-[0.98] disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Join now
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
