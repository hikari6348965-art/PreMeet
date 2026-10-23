import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { VideoFrame } from "../components/VideoFrame";
import { MeetingNotes } from "../components/MeetingNotes";
import { formatDateTime } from "../components/ui-helpers";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, Radio, Video } from "lucide-react";

export default function MeetingRoom() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [room, setRoom] = useState(null);
  const [starting, setStarting] = useState(false);
  const [leftAt, setLeftAt] = useState(0);

  useEffect(() => { api.get(`/meetings/${id}`).then(({ data }) => setMeeting(data.meeting)).catch(() => toast.error("Meeting not found")); }, [id]);

  const start = async () => {
    setStarting(true);
    try { const { data } = await api.post(`/meetings/${id}/room`); setRoom(data); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
    finally { setStarting(false); }
  };

  const copyInvite = () => { navigator.clipboard.writeText(room.invite_url); toast.success("Invite link copied"); };

  if (!meeting) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div data-testid="meeting-room-page">
      <Link to={`/app/meetings/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4" data-testid="room-back-link">
        <ArrowLeft className="h-4 w-4" /> Back to brief
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Video room</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDateTime(meeting.start_time)}{meeting.attendees?.length ? ` · ${meeting.attendees.join(", ")}` : ""}</p>
        </div>
        {room && (
          <div className="flex items-center gap-2">
            <span data-testid="room-recording-status"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${room.recording ? "bg-ink text-white" : "bg-secondary text-muted-foreground"}`}>
              <Radio className={`h-3.5 w-3.5 ${room.recording ? "text-signal bc-blink" : ""}`} /> {room.recording ? "REC · call is recorded" : "Not recording"}
            </span>
            <button onClick={copyInvite} data-testid="room-copy-invite-btn"
              className="h-9 px-3.5 rounded-lg border border-border bg-card text-sm font-medium flex items-center gap-1.5 hover:border-ink transition-colors">
              <Copy className="h-4 w-4" /> Copy invite link
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        <div className="h-[460px] lg:h-[620px]">
          {room ? (
            <VideoFrame url={room.url} token={room.token} onLeft={() => setLeftAt(Date.now())} />
          ) : (
            <div className="h-full rounded-xl bg-ink text-white relative overflow-hidden bc-grain flex flex-col items-center justify-center text-center p-8">
              <div className="h-14 w-14 rounded-2xl bg-signal text-ink flex items-center justify-center"><Video className="h-7 w-7" /></div>
              <h2 className="mt-5 text-2xl font-bold">Ready when you are</h2>
              <p className="mt-2 text-white/70 max-w-sm text-sm">Start the room, then share the invite link with your attendees. After the call, upload the recording and PreMeet pulls out the decisions and action items.</p>
              <button onClick={start} disabled={starting} data-testid="room-start-btn"
                className="mt-6 h-11 px-6 rounded-lg bg-signal text-ink font-bold flex items-center gap-2 hover:brightness-95 transition active:scale-[0.98] disabled:opacity-60">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />} Start the call
              </button>
            </div>
          )}
        </div>
        <aside className="rounded-xl border border-border bg-card p-5 lg:max-h-[620px] lg:overflow-y-auto">
          <MeetingNotes meetingId={id} canProcess={!!(room?.recording || meeting.video_room?.recording)} autoProcessKey={leftAt} />
        </aside>
      </div>
    </div>
  );
}
