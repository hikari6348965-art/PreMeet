import "./reviews.css";

const reviews = [
    { initials: "AM", person: "Arun Mehta", role: "Phsyological Therapist", text: "PreMeet brings relevant calendar, email, and CRM context into an AI brief, helping me prepare for client conversations.", tint: "review-blue" },
    { initials: "IS", person: "Isha Sharma", role: "Product Manager", text: "With built-in video conferencing, I can meet clients in PreMeet and focus on the discussion. I don't even have to worry about taking notes. It just automatically does that.", tint: "review-rose" },
    { initials: "RK", person: "Rohan Kapoor", role: "Freelancer", text: "After a meeting, transcription and meeting intelligence help organize discussion points, decisions, commitments, and follow-ups.", tint: "review-green" },
];

export default function Reviews() {
    return (
        <section className="reviews-section page-width" id="reviews">
            <div className="reviews-intro">
                <span className="eyebrow">Trusted by Professionals</span>
                <h2>What our users say</h2>
                <p>Real people. Real results.</p>
            </div>
            <div className="reviews-content">
                <div className="review-grid">
                    {reviews.map((review) => (
                        <article className="review-item" key={review.person}>
                            <span className={`review-avatar ${review.tint}`} role="img" aria-label={`Placeholder portrait for ${review.person}`}>
                                <svg viewBox="0 0 40 40" aria-hidden="true">
                                    <circle className="portrait-back" cx="20" cy="20" r="20" />
                                    <path className="portrait-shirt" d="M7 39c1-8 5-12 13-12s12 4 13 12" />
                                    <ellipse className="portrait-face" cx="20" cy="18" rx="8" ry="10" />
                                    <path className="portrait-hair" d="M12 17c0-8 4-12 9-12 5 0 8 4 8 10-3-1-5-3-6-5-2 3-6 5-11 5z" />
                                </svg>
                            </span>
                            <div className="review-quote">
                                <p>“{review.text}”</p><span>— {review.person}</span>
                                <small>{review.role}</small>
                            </div>
                        </article>
                    ))}
                </div>
                <div className="review-pagination" aria-label="Review page 1 of 3">
                    <span className="active-dot" />
                </div>
            </div>
        </section>
    );
}