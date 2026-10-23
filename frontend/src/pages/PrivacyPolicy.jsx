import { LegalPage } from "../components/LegalPage";
import { PRIVACY_SECTIONS, PRIVACY_LAST_UPDATED } from "../content/privacyPolicy";

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={PRIVACY_LAST_UPDATED} sections={PRIVACY_SECTIONS} testid="privacy-page"
      other={{ to: "/terms", label: "Terms of Service" }}
      contact={{
        title: "17. Contact Us", subject: "PreMeet privacy request",
        intro: "For privacy questions, requests to access or delete your information, or concerns about how PreMeet processes your data, get in touch.",
        note: "Please don't include passwords, access tokens or other sensitive credentials in privacy-related messages.",
      }} />
  );
}
