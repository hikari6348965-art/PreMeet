import { CalendarDays, Clock3, Zap } from "lucide-react";
import "./problem.css";

const problems = [
  {
    icon: Clock3,
    title: "Unprepared Meetings",
    copy: "Waste time researching and preparing before every meeting."
  },
  {
    icon: CalendarDays,
    title: "Unproductive Discussions",
    copy: "Lose focus without clear context, goals, or direction."
  },
  {
    icon: Zap,
    title: "Manual Meeting Work",
    copy: "Spend time writing summaries and tracking action items."
  },
];

export default function Problem() {
  return (
    <section className="problem-section page-width">
      <div className="section-heading centered-heading"><span className="eyebrow">The Problem</span><h2>Meetings are hard.</h2><p>Scheduling, coordination, and follow-ups take time —<br className="desktop-break" /> and often lead to no real results.</p></div>
      <div className="problem-grid">
        {problems.map(({ icon: Icon, title, copy }) => <article className="problem-item" key={title}><span className="icon-disc"><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
      </div>
    </section>
  );
}