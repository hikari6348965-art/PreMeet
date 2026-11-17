import "./footer.css";

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-inner page-width">
                <div className="footer-links">
                    <span>© 2026 PreMeet</span>
                    <span className="footer-separator">|</span>
                    <a href="/privacy">Privacy Policy</a>
                    <span className="footer-separator">|</span>
                    <a href="/terms">Terms of Service</a>
                </div>
                <a className="footer-brand" href="#top" aria-label="PreMeet home">
                    <img src="/brand/logo-white.png" alt="PreMeet" />
                </a>
            </div>
        </footer>
    );
}