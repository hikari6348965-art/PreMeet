import { BarChart3, Bell, CalendarDays, Link2, Video, TrendingUp } from "lucide-react";
import "./features.css";

const features = [
    { icon: CalendarDays, title: "Smart Scheduling", copy: "Let others book with you effortlessly." },
    { icon: Bell, title: "Automated Reminders", copy: "Never miss a meeting again." },
    { icon: TrendingUp, title: "Outcome Tracking", copy: "Measure what matters." },
    { icon: Video, title: "Seamless Video Calls", copy: "Meet without friction." },
    { icon: Link2, title: "Shareable Links", copy: "Invite anyone, anywhere." },
    { icon: BarChart3, title: "Detailed Analytics", copy: "Understand your impact." },
];

export default function Features() {
    return (
        <section className="features-section page-width" id="features">
            <div className="features-intro">
                <span className="eyebrow">Powerful Features</span>
                <h2>Everything you need for meaningful meetings.</h2>
                <p>From smart scheduling to automated follow-ups, PreMeet handles it all.</p>
                <a className="primary-cta" href="/register">Explore More Features <span aria-hidden="true">→</span></a>
            </div>
            <div className="feature-grid">
                {features.map(({ icon: Icon, title, copy }) => (
                    <article className="feature-item" key={title}>
                        <Icon className="feature-icon" aria-hidden="true" />
                        <div>
                            <h3>{title}</h3>
                            <p>{copy}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}