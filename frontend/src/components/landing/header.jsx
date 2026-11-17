import "./header.css";

export default function Header() {
    return (
        <header className="site-header">
            <a className="header-action header-signin" href="/login">Sign In</a>
            <a className="header-action header-start" href="/login">
                Start Free <span aria-hidden="true">→</span>
            </a>
            <nav className="main-nav" aria-label="Main navigation">
                <a href="#features">Features</a>
                <a href="#faq">FAQs</a>
                <a 
                href="https://mail.google.com/mail/?view=cm&fs=1&to=premeetteam@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                >Contact Us</a>
            </nav>
            <a className="brand-lockup" href="#top" aria-label="PreMeet home">
                <img src="/brand/image.png" alt="PreMeet" />
            </a>
        </header>
    );
}