import { useState } from "react";
import "./integration.css";;

const integrations = [
    { name: "Google Calendar", short: <img src="/brand/google-calendar.png" alt="G" />, style: "icon" },
    { name: "Zoho Calendar", short: <img src="/brand/zoho-calendar.png" alt="Z" />, style: "icon" },
    { name: "Calendly", short: <img src="/brand/calendly.png" alt="C" />, style: "icon" },
    { name: "Savyy Call", short: <img src="/brand/savyy-call.png" alt="S" />, style: "icon" },
    { name: "Gmail", short: <img src="/brand/gmail.png" alt="G" />, style: "icon" },
    { name: "More Integrations", short: <img src="/brand/plus.png" alt="+" />, style: "more" },
    { name: "Yahoo Mail", short: <img src="/brand/yahoo.png" alt="Y" />, style: "icon" },
    { name: "HubSpot", short: <img src="/brand/hubspot.png" alt="H" />, style: "icon" },
    { name: "SalesForce", short: <img src="/brand/salesforce.png" alt="S" />, style: "icon" },
];

export default function Integrations() {
    const [limit, setLimit] = useState(6);
    function handleIntegrationClick(name) {
        if (name == "More Integrations") {
            const less_card = {
                name: "Show Less",
                short: <img src="/brand/less.png" alt="<" />,
                style: "more"
            }
            integrations[5] = integrations[integrations.length - 1];
            integrations[integrations.length - 1] = less_card;

            setLimit(integrations.length);
        }
        else if (name == "Show Less") {
            // Collapse and return to original
            const more_card = {
                name: "More Integrations",
                short: <img src="/brand/plus.png" alt="+" />,
                style: "more"
            }
            integrations[5] = more_card;
            setLimit(6);
        }
    }
    return (
        <section className="integrations-section page-width" id="integrations">
            <div className="integrations-intro">
                <span className="eyebrow">Integrations</span>
                <h2>Works with the tools you already love.</h2>
                <p>Connect PreMeet with your favourite platforms and supercharge your workflow.</p>
                <div className="outline-cta" onClick={()=> handleIntegrationClick("More Integrations")}>
                    View All Integrations <span aria-hidden="true">→</span>
                </div>
            </div>
            <div className="integration-grid">
                {integrations.slice(0, limit).map(({ name, short, style }) => (
                    <div className="integration-item" style={style == "more" ? { cursor: "pointer" } : null} key={name} onClick={() => handleIntegrationClick(name)}>
                        <span className={`integration-mark integration-${style}`}>
                            {short}
                        </span>
                        <span>{name}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}