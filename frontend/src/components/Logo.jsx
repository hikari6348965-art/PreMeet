export function Logo({ tone = "ink", className = "h-7", testid = "brand-logo" }) {
  return <img src={`/brand/logo-${tone}.png`} alt="PreMeet" className={`w-auto select-none ${className}`} draggable="false" data-testid={testid} />;
}
