export const TERMS_LAST_UPDATED = "October 23, 2026";

// Each block: string = paragraph, { list: [...] } = bullet list, { h: "..." } = sub-heading
export const TERMS_SECTIONS = [
  {
    id: "introduction", title: "1. Introduction", body: [
      "Welcome to PreMeet (\"PreMeet,\" \"we,\" \"our,\" or \"us\").",
      "These Terms of Service (\"Terms\") govern your access to and use of the PreMeet website, application and related services (together, the \"Service\").",
      "PreMeet is an AI-powered meeting preparation platform. It helps you organize relevant information and prepare for meetings through briefs, summaries, suggested questions and talking points, and it lets you host video calls and keep notes from them.",
      "By accessing or using PreMeet, you agree to these Terms. If you do not agree, you must not use the Service.",
      "If you use PreMeet on behalf of a company or other organization, you represent that you have authority to accept these Terms on its behalf. In that case, \"you\" may refer to both you and that organization, as appropriate.",
    ],
  },
  {
    id: "eligibility", title: "2. Eligibility and Accounts", body: [
      { h: "2.1 Eligibility" },
      "You may use PreMeet only if you are legally permitted to enter into a binding agreement under the laws that apply to you. If you are under the age of majority where you live, you may use the Service only where legally permitted and with any required parent or guardian consent.",
      "You must comply with applicable laws and with the terms of any third-party services you connect to PreMeet.",
      { h: "2.2 Account Registration" },
      "Most features require an account. You can sign up with an email and password or with Google. You agree to:",
      { list: [
        "Provide accurate and current information.",
        "Keep your account information reasonably up to date.",
        "Protect your login credentials.",
        "Not share your account in a way that breaks your plan's limits or security restrictions.",
        "Tell us promptly if you suspect unauthorized access.",
      ] },
      "You are responsible for activity carried out through your account. This does not apply where applicable law provides otherwise, or where the activity results from our failure to meet our legal obligations.",
      { h: "2.3 Account Restrictions" },
      "We may restrict access to an account if reasonably necessary to investigate suspected fraud, unauthorized access, security threats, violations of these Terms or legal requirements. Where appropriate and legally permitted, we will give notice and an opportunity to address the issue.",
    ],
  },
  {
    id: "service", title: "3. Description of the Service", body: [
      "PreMeet currently provides features such as:",
      { list: [
        "Importing upcoming meetings from Google Calendar, or adding meetings manually.",
        "One-page meeting briefs built from your notes, client records, past call notes and, if connected, relevant Gmail threads, with source citations.",
        "Suggested questions, talking points and summaries of previous interactions.",
        "Tracking of outstanding commitments and follow-up items.",
        "Client Memory: profiles of the contacts and companies you work with.",
        "Built-in video calls with shareable guest invite links.",
        "Meeting notes: notes you write yourself, plus AI-extracted summaries, decisions and action items from recordings you upload, with PDF export.",
        "Email notifications when a brief is ready.",
      ] },
      "Features may vary by plan, by the integrations you connect, and by availability. We may introduce, change, suspend or discontinue features as the Service develops, subject to applicable law and any specific contractual commitments. We do not guarantee uninterrupted availability, or that every feature will remain available indefinitely.",
    ],
  },
  {
    id: "integrations", title: "4. Third-Party Integrations and Services", body: [
      "PreMeet lets you connect, or relies on, third-party services. These include Google (sign-in, Calendar and Gmail), our video call provider, our AI providers and our payment processor, Razorpay.",
      "When you connect a third-party service, you authorize PreMeet to access and process the information allowed by the permissions you grant and the features you use. You are responsible for:",
      { list: [
        "Making sure you are authorized to connect the account.",
        "Reviewing the permissions an integration requests.",
        "Following the third-party provider's terms and policies.",
        "Getting any permissions needed to share meeting notes, correspondence, customer information or other data.",
        "Disconnecting integrations you no longer want to use.",
      ] },
      "Third-party services operate independently and may change their availability, features, permissions or terms. To the extent permitted by law, we are not responsible for disruptions caused by third-party services.",
      "Disconnecting an integration stops future data retrieval. It does not automatically delete information already stored in PreMeet. See our Privacy Policy for how we retain and delete data.",
    ],
  },
  {
    id: "user-content", title: "5. User Content and Data", body: [
      { h: "5.1 Your Content" },
      "\"User Content\" means information you submit to, upload to, or authorize PreMeet to access. This includes notes, documents, meeting details, client records, email snippets, call recordings and transcripts.",
      "As between you and PreMeet, you keep your rights in your User Content. You give PreMeet a limited, non-exclusive permission to host, process, reproduce, transmit and otherwise use your User Content as reasonably necessary to operate, maintain, secure and provide the Service, including generating the briefs and notes you request.",
      "This permission is limited by our Privacy Policy and applicable law. We do not acquire ownership of your User Content just because you use the Service.",
      { h: "5.2 Your Responsibilities" },
      "You represent that you have the rights, permissions and lawful basis needed to submit User Content, or to authorize its processing, through PreMeet.",
      "You must not submit information in a way that violates anyone's privacy, confidentiality, intellectual property rights, contractual rights or applicable law. You are responsible for making sure your use of PreMeet suits the sensitivity of the information you provide.",
      { h: "5.3 Call Recordings and Participants" },
      "If you record a call, or upload a recording or transcript of a meeting, you are responsible for:",
      { list: [
        "Telling participants.",
        "Getting any consent the law requires where you and they are located.",
      ] },
      "Only share call invite links with people you intend to join. Anyone with the link can join by entering a display name.",
      { h: "5.4 Confidential Information" },
      "Review your organization's policies before connecting business accounts or uploading confidential information. Do not use PreMeet to process information if doing so would breach a confidentiality obligation, professional duty, contractual restriction or applicable law. If your organization needs a data-processing agreement or other contractual protection, contact us before using PreMeet for that information.",
      { h: "5.5 Content Restrictions" },
      "You must not upload or submit content that:",
      { list: [
        "You are not legally authorized to share.",
        "Infringes another person's intellectual property rights.",
        "Contains unlawful threats, harassment or malicious material.",
        "Is intended to facilitate fraud or other unlawful conduct.",
        "Introduces malicious software or attempts to compromise the Service.",
      ] },
    ],
  },
  {
    id: "ai", title: "6. Artificial Intelligence and Generated Content", body: [
      "PreMeet uses artificial intelligence to produce meeting briefs, summaries, transcripts, extracted meeting notes, suggestions and other outputs.",
      { h: "6.1 Nature of AI Outputs" },
      "AI-generated outputs may contain inaccuracies, omissions, outdated information or misleading interpretations. The Service may mishear or misinterpret a statement, wrongly identify a commitment or action item, omit important context or make an unsuitable recommendation. AI outputs are decision-support tools, not guaranteed statements of fact.",
      { h: "6.2 User Verification" },
      "You are responsible for reviewing AI-generated outputs before relying on them in business communications, negotiations, client meetings or other consequential situations. Verify important claims against the original sources. PreMeet does not guarantee that any brief or set of notes will be complete, accurate, current or suitable for a particular purpose.",
      { h: "6.3 No Professional Advice" },
      "PreMeet does not provide legal, medical, financial, accounting or other regulated professional advice. Consult an appropriately qualified professional when a decision requires such advice.",
      { h: "6.4 No Guaranteed Outcomes" },
      "PreMeet does not guarantee that using the Service will increase sales, improve meeting performance, save a particular amount of time, win clients or produce any specific business result.",
    ],
  },
  {
    id: "acceptable-use", title: "7. Acceptable Use", body: [
      "You agree not to:",
      { list: [
        "Use PreMeet for unlawful purposes.",
        "Violate the privacy or rights of another person, including by recording people without required consent.",
        "Access accounts, integrations or data without authorization.",
        "Try to bypass authentication, plan restrictions or usage limits.",
        "Interfere with or disrupt the Service or its infrastructure.",
        "Introduce malware, malicious code or harmful automated requests.",
        "Reverse engineer or try to extract source code from the Service, except where applicable law permits it.",
        "Scrape, copy or systematically extract data from the Service without authorization.",
        "Use the Service to build or operate a competing product in violation of applicable law or valid contractual restrictions.",
        "Present AI-generated information as verified fact when you know it is inaccurate.",
        "Use the Service to make unlawful discriminatory decisions or to carry out unlawful surveillance.",
        "Resell or commercially redistribute access to PreMeet without our written permission.",
        "Use the Service in a way that violates the terms of a connected third-party provider.",
      ] },
      "We may investigate suspected violations and take reasonable action to protect users, our systems and third parties.",
    ],
  },
  {
    id: "payments", title: "8. Plans, Fees and Payments", body: [
      { h: "8.1 Plans" },
      "PreMeet offers a free plan and paid plans with different features and monthly brief allowances. The current plans, prices and allowances are shown on our pricing and billing pages before you buy.",
      { h: "8.2 Prices and Currency" },
      "Prices are displayed in US dollars. Payments are charged in Indian rupees (INR), and the rupee amount you will be charged is shown before you pay. Your bank or card issuer may apply its own conversion or foreign-transaction fees.",
      { h: "8.3 Payment Processing" },
      "Payments are processed by Razorpay. When you buy a plan, you authorize Razorpay to process the charge for that plan. Your card, UPI or bank details are handled by Razorpay, and its terms also apply to the payment.",
      { h: "8.4 Billing Period and Renewal" },
      "Each payment covers 30 days of the plan you selected. Paid plans currently do not renew automatically. When the 30 days end, your account returns to the free plan unless you pay again. If we introduce automatic renewal in the future, we will clearly show the renewal price and interval, and ask for your agreement, before it applies to you.",
      { h: "8.5 Taxes" },
      "Prices may exclude applicable taxes unless stated otherwise. Where the law requires it, you are responsible for taxes associated with your purchase, excluding taxes on our income.",
      { h: "8.6 Failed Payments" },
      "A plan is activated only after the payment is successfully confirmed. If a payment fails, the plan is not activated and you can try again.",
      { h: "8.7 Price Changes" },
      "We may change prices or plan features. Changes apply to future purchases, not to a 30-day period you have already paid for. Where required by law, we will give advance notice of material changes.",
      { h: "8.8 Refunds" },
      "Refund eligibility is governed by any refund policy shown at checkout and by applicable consumer protection law. Nothing in these Terms excludes or limits a refund or other remedy that cannot lawfully be excluded. If no separate refund policy is shown, contact us to discuss a billing concern.",
    ],
  },
  {
    id: "termination", title: "9. Plan Changes and Account Termination", body: [
      { h: "9.1 Changes by You" },
      "Because paid plans do not renew automatically, there is nothing to cancel to stop future charges. You can also switch back to the free plan at any time from the Billing page.",
      "If you switch to the free plan before your paid period ends, the remaining paid time ends immediately. Unless stated otherwise at checkout or required by law, it is not refunded.",
      "To close your account, contact us using the details below.",
      { h: "9.2 Termination by PreMeet" },
      "We may suspend or terminate your access if:",
      { list: [
        "You materially violate these Terms.",
        "Your use creates a significant security or legal risk.",
        "Your account is involved in fraud or unauthorized activity.",
        "We are required to by law.",
        "We discontinue the Service, subject to applicable law and any specific contractual commitments.",
      ] },
      "Where reasonably practicable and legally permitted, we will give notice and an opportunity to resolve a violation before termination.",
      { h: "9.3 Effects of Termination" },
      "When your account is terminated or closed:",
      { list: [
        "Your right to access the affected features ends.",
        "Connected integrations should be disconnected, or their permissions revoked in your Google Account.",
        "Your information is handled according to our Privacy Policy and applicable law.",
        "Some records may be kept where legally required, or reasonably necessary for security, accounting or dispute-resolution purposes.",
      ] },
      "Before closing your account, export anything you want to keep, for example meeting notes as PDF.",
    ],
  },
  {
    id: "ip", title: "10. Intellectual Property", body: [
      { h: "10.1 PreMeet Property" },
      "The Service is owned by PreMeet or its licensors and protected by applicable intellectual property laws. This includes its software, design, branding, logos, user interface, documentation and underlying technology. Apart from the limited right to use the Service under these Terms, no rights are transferred to you. You may not use our trademarks, logos or branding in a way that suggests endorsement or affiliation without our permission.",
      { h: "10.2 Feedback" },
      "If you share suggestions, ideas or feedback about PreMeet, you permit us to use it to improve our products and services without compensation, to the extent permitted by law. This does not transfer ownership of your User Content or let us disregard our Privacy Policy.",
      { h: "10.3 Generated Outputs" },
      "As between you and PreMeet, and subject to applicable law and third-party rights, you may use outputs generated for your account for your own lawful purposes. We do not guarantee that AI-generated outputs are unique, eligible for copyright protection or free from third-party rights. You remain responsible for reviewing outputs before publishing or distributing them.",
    ],
  },
  {
    id: "privacy", title: "11. Privacy and Data Protection", body: [
      "How we collect and process personal information is described in the PreMeet Privacy Policy. By using the Service, you acknowledge that your information will be handled as described there, subject to applicable law.",
      "You are responsible for making sure your use of PreMeet, and the information you provide to it, comply with applicable privacy and data protection requirements. If your organization needs a separate data-processing agreement, it must be agreed separately.",
    ],
  },
  {
    id: "availability", title: "12. Service Availability and Changes", body: [
      "We aim to make PreMeet useful and reliable, but we do not guarantee that the Service will always be available, uninterrupted, error-free, or compatible with every device or third-party integration.",
      "Availability may be temporarily affected by:",
      { list: [
        "Maintenance.",
        "Outages at our providers, such as video, AI, email or payment services.",
        "Technical failures.",
        "Security incidents.",
        "Other circumstances outside our control.",
      ] },
      "We may update or change features as part of ongoing product development. Nothing in this section excludes rights or remedies that applicable law does not allow us to exclude.",
    ],
  },
  {
    id: "disclaimers", title: "13. Disclaimers", body: [
      "To the maximum extent permitted by applicable law, the Service is provided on an \"as available\" and \"as provided\" basis. We do not warrant that:",
      { list: [
        "AI-generated content, transcripts or extracted notes will always be accurate or complete.",
        "Every meeting brief will contain all relevant information.",
        "Third-party integrations and providers will remain available.",
        "The Service will be free from every technical issue or interruption.",
        "The Service will meet every individual business requirement.",
      ] },
      "Verify important information yourself before relying on it. These disclaimers do not limit any non-excludable consumer rights or mandatory warranties under applicable law.",
    ],
  },
  {
    id: "liability", title: "14. Limitation of Liability", body: [
      "To the maximum extent permitted by applicable law, PreMeet will not be liable for indirect, incidental, special, consequential or punitive damages. Nor will it be liable for loss of profits, revenue, business opportunities, goodwill or data arising from your use of the Service.",
      "To the extent permitted by applicable law, PreMeet's total liability for all claims arising out of or relating to the Service or these Terms is limited to the amount you paid PreMeet for the Service in the twelve months before the event giving rise to the claim. If you have not paid for the Service, the limit is the amount, if any, permitted by applicable law.",
      "These limitations do not apply to liability that cannot lawfully be limited or excluded, such as liability for fraud, intentional misconduct or gross negligence where the law prohibits limiting it. Nothing in these Terms limits mandatory consumer rights.",
    ],
  },
  {
    id: "indemnification", title: "15. Indemnification", body: [
      "To the extent permitted by applicable law, you agree to be responsible for third-party claims, losses and reasonable expenses arising from:",
      { list: [
        "Your unlawful use of the Service.",
        "Your material violation of these Terms.",
        "Your infringement of another person's rights, including recording people without required consent.",
      ] },
      "This section does not require you to indemnify PreMeet for losses caused by our own unlawful conduct, or for liability that cannot lawfully be transferred to you. Where reasonably practicable, we will notify you of a claim and give you a reasonable opportunity to cooperate in its defense.",
    ],
  },
  {
    id: "changes", title: "16. Changes to These Terms", body: [
      "We may update these Terms as PreMeet evolves or legal requirements change. When we publish revised Terms, we will update the \"Last Updated\" date. Where required by law, we will give notice of material changes or obtain your consent.",
      "Your continued use of the Service after revised Terms take effect is subject to applicable law and any required consent procedures. If you do not agree to revised Terms, stop using the affected Service.",
    ],
  },
  {
    id: "governing-law", title: "17. Governing Law and Disputes", body: [
      "These Terms are governed by the laws applicable to the operator of PreMeet, without removing any mandatory legal protections that apply to you where you live.",
      "Any dispute will be handled by the courts or other dispute-resolution bodies that have jurisdiction under applicable law. Nothing in this section removes a consumer's right to bring a claim in a court or forum where that right is mandatory.",
      "Before bringing a formal claim, please contact us so we can try to resolve the issue informally.",
    ],
  },
  {
    id: "severability", title: "18. Severability", body: [
      "If any provision of these Terms is found invalid or unenforceable, the remaining provisions continue to apply to the extent legally permitted. Where legally permitted, the invalid provision will be interpreted or replaced only as much as needed to make it enforceable.",
    ],
  },
  {
    id: "entire-agreement", title: "19. Entire Agreement", body: [
      "These Terms, together with the Privacy Policy and any additional agreements that expressly apply to your account, form the agreement governing your use of PreMeet. A separate written agreement controls only where it expressly addresses the conflicting subject and applies to your use of the Service.",
    ],
  },
];
