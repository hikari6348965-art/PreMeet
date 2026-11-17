import "./hero.css";
const trustFaces = [
    "https://img.magnific.com/free-photo/close-up-portrait-curly-handsome-european-male_176532-8133.jpg?semt=ais_hybrid&w=740&q=80",
    "https://besthinditips.in/wp-content/uploads/2026/06/linkedin-profile-picture-ai-prompt-smart-casual-man.webp-1024x1024.webp",
    "https://marszalstudio.pl/wp-content/uploads/2024/01/fajne-zdjecia-profilowe-19.webp",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnWDYorUpVNCPMhGr1c399mdA-nlNGNeIw-4HJACDYkw&s=10",
    "https://i.pinimg.com/236x/bc/37/bb/bc37bbae423af2e926618754f7e992f4.jpg"
];

export default function Hero() {
    return (
        <section className="hero-section page-width" id="top">
            <div className="hero-copy">
                <p className="eyebrow hero-eyebrow">Meet with purpose</p>
                <h1>Make Every Meeting<br />More <span>Productive.</span></h1>
                <p className="hero-description">PreMeet helps you prepare for meetings with AI-generated briefs, host video calls, and automatically create meeting summaries — all in one place.</p>
                <a className="primary-cta" href="/register">Start Free <span aria-hidden="true">→</span></a>
                <div className="trust-row">
                    <div className="trust-avatars" aria-label="PreMeet community members">
                        {trustFaces.map((face) => (
                            <span
                                className={`trust-avatar`}
                                style={{ backgroundImage: `url(${face})` }}
                                key={face}
                            />
                        ))}
                    </div>
                    <div className="trust-details">
                        <span
                            className="trust-stars"
                            aria-label="5 out of 5 stars"
                        >★★★★★
                        </span>
                        <span>Trusted by 10,000+ professionals</span>
                    </div>
                </div>
            </div>
            <div className="hero-visual">
                <div className="hero-halo" />
                <div className="hero-orbit" />
                <span className="hero-sparkle" aria-hidden="true">✦</span>
                <img src="/brand/premeet-founder.png" alt="PreMeet founder standing confidently in a black suit" />
            </div>
        </section>
    );
}