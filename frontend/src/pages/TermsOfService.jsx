import { LegalPage } from "../components/LegalPage";
import { TERMS_SECTIONS, TERMS_LAST_UPDATED } from "../content/termsOfService";

export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service" lastUpdated={TERMS_LAST_UPDATED} sections={TERMS_SECTIONS} testid="terms-page"
      other={{ to: "/privacy", label: "Privacy Policy" }}
      contact={{
        title: "20. Contact Information", subject: "PreMeet terms question",
        intro: "For questions about these Terms, your plan or payments, or your use of PreMeet, get in touch. We'll review your message and respond as soon as reasonably practicable.",
      }} />
  );
}
