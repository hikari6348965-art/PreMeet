
const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": "https://www.premeet.ink/#organization",
            "name": "PreMeet",
            "url": "https://www.premeet.ink/",
            "description": "PreMeet provides an AI-powered meeting workspace for consultants and freelancers, combining meeting preparation, video conferencing, transcription, and meeting intelligence."
        },
        {
            "@type": "WebSite",
            "@id": "https://www.premeet.ink/#website",
            "url": "https://www.premeet.ink/",
            "name": "PreMeet",
            "publisher": {
                "@id": "https://www.premeet.ink/#organization"
            },
            "inLanguage": "en"
        },
        {
            "@type": "SoftwareApplication",
            "@id": "https://www.premeet.ink/#software",
            "name": "PreMeet",
            "url": "https://www.premeet.ink/",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "PreMeet is an AI-powered meeting workspace for consultants and freelancers. It helps users prepare for client meetings using connected information sources, conduct video meetings, transcribe conversations, and organize meeting insights.",
            "creator": {
                "@id": "https://www.premeet.ink/#organization"
            },
            "audience": {
                "@type": "PeopleAudience",
                "audienceType": "Consultants and freelancers"
            },
            "featureList": [
                "AI-powered meeting briefs",
                "Meeting preparation using connected information sources",
                "Built-in video conferencing",
                "Meeting transcription",
                "AI-powered meeting intelligence",
                "Google Calendar integration",
                "Gmail integration",
                "HubSpot integration",
                "Zoho integration"
            ]
        },
        {
            "@type": "WebPage",
            "@id": "https://www.premeet.ink/#webpage",
            "url": "https://www.premeet.ink/",
            "name": "PreMeet — AI Meeting Workspace for Consultants and Freelancers",
            "description": "Prepare for client meetings, meet online, transcribe conversations, and organize meeting insights with PreMeet.",
            "isPartOf": {
                "@id": "https://www.premeet.ink/#website"
            },
            "about": {
                "@id": "https://www.premeet.ink/#software"
            },
            "inLanguage": "en"
        },
        {
            "@type": "FAQPage",
            "@id": "https://www.premeet.ink/#faq",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "What is PreMeet?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PreMeet is an AI-powered meeting workspace for consultants and freelancers. It combines meeting preparation, video conferencing, transcription, and AI-powered meeting intelligence."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Who is PreMeet designed for?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PreMeet is designed primarily for consultants and freelancers who regularly meet with clients and want to reduce the administrative work surrounding their meetings."
                    }
                },
                {
                    "@type": "Question",
                    "name": "What integrations does PreMeet support?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PreMeet supports Google Calendar, Gmail, HubSpot, and Zoho integrations."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Can PreMeet transcribe meetings?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes. PreMeet supports meeting transcription to help capture conversations and support the post-meeting workflow."
                    }
                },
                {
                    "@type": "Question",
                    "name": "How does PreMeet generate meeting briefs?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PreMeet uses information from multiple connected sources, including CRM data, to help generate relevant meeting briefs. Available information depends on connected accounts and permissions."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Can I try PreMeet for free?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PreMeet offers three free AI meeting briefs per month without requiring a credit card."
                    }
                }
            ]
        }
    ]
};

const schemaScript = document.createElement("script");
schemaScript.type = "application/ld+json";
schemaScript.textContent = JSON.stringify(structuredData);

document.head.appendChild(schemaScript);
