import { PARTNER } from "./PartnerThemeWrapper";
import { Button } from "@/components/ui/button";

export function PartnerTopbar({
  businessName,
  city,
  tier,
  activeOffers,
}: {
  businessName: string;
  city?: string;
  tier: string;
  activeOffers: number;
}) {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-6 lg:px-10 py-4 border-b"
      style={{ background: "#FFFFFF", borderColor: PARTNER.border }}
    >
      <div>
        <h1 className="font-fraunces text-[18px] leading-tight" style={{ color: PARTNER.ink }}>
          {businessName} 👋
        </h1>
        <p className="font-dm text-[12px]" style={{ color: PARTNER.ink3 }}>
          {date} {city ? `· ${city}` : ""} · {activeOffers} active{" "}
          {activeOffers === 1 ? "offer" : "offers"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="px-2.5 py-0.5 rounded-full text-[11px] font-dm font-medium"
          style={{ background: PARTNER.amberSoft, color: PARTNER.amber }}
        >
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </span>
        <Button
          size="sm"
          className="h-9 rounded-full font-dm text-[13px]"
          style={{ background: PARTNER.navy, color: "#FFF" }}
        >
          Upgrade plan
        </Button>
      </div>
    </header>
  );
}
