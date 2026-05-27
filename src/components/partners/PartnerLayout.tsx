import { ReactNode, useEffect, useState } from "react";
import { PartnerThemeWrapper } from "./PartnerThemeWrapper";
import { PartnerSidebar } from "./PartnerSidebar";
import { PartnerTopbar } from "./PartnerTopbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PartnerRow = {
  id: string;
  business_name: string;
  tier: string;
  category: string;
  address: string | null;
  monthly_claim_target: number;
  monthly_view_target: number;
  monthly_revenue_target: number;
};

export function PartnerLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [activeOffers, setActiveOffers] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { count }] = await Promise.all([
        supabase.from("partners").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("partner_offers")
          .select("id", { count: "exact", head: true })
          .eq("partner_id", user.id)
          .eq("active", true),
      ]);
      if (p) setPartner(p as PartnerRow);
      setActiveOffers(count ?? 0);
    })();
  }, [user]);

  const businessName = partner?.business_name ?? "Partner";
  const tier = partner?.tier ?? "starter";
  const city = partner?.address?.split(",").slice(-2, -1)[0]?.trim();

  return (
    <PartnerThemeWrapper>
      <div className="flex">
        <PartnerSidebar businessName={businessName} tier={tier} />
        <main className="flex-1 min-w-0">
          <PartnerTopbar
            businessName={businessName}
            city={city}
            tier={tier}
            activeOffers={activeOffers}
          />
          <div className="px-6 lg:px-10 py-8">
            {partner ? (
              <PartnerContext.Provider value={{ partner, activeOffers }}>
                {children}
              </PartnerContext.Provider>
            ) : (
              <div className="font-dm text-sm text-muted-foreground">Loading…</div>
            )}
          </div>
        </main>
      </div>
    </PartnerThemeWrapper>
  );
}

import { createContext, useContext } from "react";
const PartnerContext = createContext<{ partner: PartnerRow; activeOffers: number } | null>(null);
export function usePartner() {
  const v = useContext(PartnerContext);
  if (!v) throw new Error("usePartner must be inside PartnerLayout");
  return v;
}
