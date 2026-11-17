import { useState } from "react";
import { Plus, X } from "lucide-react";
import "./faq.css";

const questions = [
    { question: "What is PreMeet?", answer: "PreMeet is an AI-powered meeting workspace for consultants and freelancers.\nIt brings meeting preparation, video calls, and transcription together.\nThen it turns conversations into organized insights and follow-ups." },
    { question: "Is PreMeet free to use?", answer: "Get started with three free AI meeting briefs each month.\nNo credit card is required to try PreMeet.\nYou can choose a paid plan if it better fits your workflow." },
    { question: "Can I integrate with other tools?", answer: "Connect Google Calendar, Gmail, HubSpot, and Zoho.\nBring relevant calendar, email, and CRM context into preparation.\nThe information available depends on your account and permissions." },
    { question: "How do I get started?", answer: "Create a free account and connect your calendar or email.\nOpen a client meeting and prepare with an AI-powered brief.\nMeet, transcribe the conversation, and organize follow-up actions." },
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(null);
    return (
        <section className="faq-section page-width" id="faq">
            <div className="faq-intro">
                <span className="eyebrow">FAQ</span>
                <h2>Got Questions?</h2>
                <p>Find answers to common questions below.</p>
                <a
                    className="outline-cta"
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=premeetteam@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Contact Us With Gmail<span aria-hidden="true">→</span>
                </a>
            </div>
            <div className="faq-list" id="faq-list">{questions.map(({ question, answer }, index) => {
                const isOpen = openIndex === index;
                return <div className={`faq-item${isOpen ? " is-open" : ""}`} key={question}><button type="button" className="faq-toggle" aria-expanded={isOpen} onClick={() => setOpenIndex(isOpen ? null : index)}><span>{question}</span>{isOpen ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}</button>{isOpen && <p className="faq-answer">{answer}</p>}</div>;
            })}</div>
        </section>
    );
}