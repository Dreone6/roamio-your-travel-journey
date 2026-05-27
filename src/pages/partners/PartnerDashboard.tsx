import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Bot,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
} from "lucide-react";
import { PartnerLayout, usePartner } from "@/components/partners/PartnerLayout";
import { PARTNER } from "@/components/partners/PartnerThemeWrapper";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_AVG_CHECK: Record<string, number> = {
  restaurant: 40,
  cafe: 18,
  bar: 28,
  shop: 55,
  experience: 70,
  hotel: 180,
  spa: 95,
  other: 35,
};

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) =>
    suffix === "%" ? v.toFixed(1) + suffix : Math.round(v).toLocaleString() + suffix,
  );
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

function MetricCard({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: number;
  delta: number;
  suffix?: string;
}) {
  const up = delta >= 0;
  return (
    <div
      className="rounded-[12px] p-4 bg-white border"
      style={{ borderColor: PARTNER.border }}
    >
      <div className="font-dm text-[11px]" style={{ color: PARTNER.ink3 }}>
        {label}
      </div>
      <div
        className="font-fraunces text-[28px] leading-tight mt-1.5"
        style={{ color: PARTNER.ink }}
      >
        <CountUp value={value} suffix={suffix} />
      </div>
      <div
        className="font-dm text-[11px] mt-1 flex items-center gap-0.5"
        style={{ color: up ? "#15803D" : "#B91C1C" }}
      >
        {up ? (
          <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
        ) : (
          <ArrowDownRight className="h-3 w-3" strokeWidth={2} />
        )}
        {Math.abs(delta).toFixed(1)}% vs last month
      </div>
    </div>
  );
}

function QuotaRow({
  label,
  current,
  target,
  suffix = "",
  pace,
}: {
  label: string;
  current: number;
  target: number;
  suffix?: string;
  pace: number;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const color =
    pct >= pace * 70 ? "#10B981" : pct >= pace * 40 ? PARTNER.amber : "#EF4444";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-dm text-[13px]" style={{ color: PARTNER.ink2 }}>
          {label}
        </div>
        <div className="font-dm text-[12px]" style={{ color: PARTNER.ink }}>
          {suffix === "$" ? "$" : ""}
          {current.toLocaleString()} {suffix && suffix !== "$" ? suffix : ""} /{" "}
          {suffix === "$" ? "$" : ""}
          {target.toLocaleString()} {suffix && suffix !== "$" ? suffix : ""}
        </div>
      </div>
      <div
        className="h-1.5 rounded-[3px] overflow-hidden"
        style={{ background: PARTNER.cream2 }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ background: color, height: "100%" }}
        />
      </div>
    </div>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-0.5 h-8 w-20">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: PARTNER.amberSoft,
          }}
        />
      ))}
    </div>
  );
}

function DashboardInner() {
  const { partner } = usePartner();
  const [advisor, setAdvisor] = useState<string | null>(null);
  const [advisorDismissed, setDismissed] = useState(false);
  const [upsell, setUpsell] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ icon: string; title: string; description: string; action_label: string }>
  >([]);
  const [metrics, setMetrics] = useState({
    views: 0,
    claims: 0,
    cvr: 0,
    revenue: 0,
    viewsDelta: 0,
    claimsDelta: 0,
    cvrDelta: 0,
    revenueDelta: 0,
  });
  const [topOffers, setTopOffers] = useState<
    Array<{ id: string; title: string; category: string; claims: number; cvr: number; daily: number[] }>
  >([]);

  const avgCheck = CATEGORY_AVG_CHECK[partner.category] ?? 35;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysRemaining = daysInMonth - daysElapsed;
  const pace = (daysElapsed / daysInMonth) * 100;

  useEffect(() => {
    (async () => {
      const { data: offerRows } = await supabase
        .from("partner_offers")
        .select("id, offer_description, category")
        .eq("partner_id", partner.id);
      const offerIds = (offerRows ?? []).map((o) => o.id);

      if (!offerIds.length) return;

      const { data: interactions } = await supabase
        .from("offer_interactions")
        .select("offer_id, interaction_type, created_at")
        .in("offer_id", offerIds)
        .gte("created_at", lastMonthStart.toISOString());

      const cur = { v: 0, c: 0 };
      const prev = { v: 0, c: 0 };
      const perOffer: Record<string, { v: number; c: number; daily: number[] }> = {};
      offerIds.forEach((id) => (perOffer[id] = { v: 0, c: 0, daily: Array(7).fill(0) }));

      (interactions ?? []).forEach((row) => {
        const d = new Date(row.created_at);
        const inCur = d >= monthStart;
        const target = inCur ? cur : prev;
        if (row.interaction_type === "view") target.v += 1;
        else if (row.interaction_type === "claim") target.c += 1;

        if (inCur && row.interaction_type === "claim" && perOffer[row.offer_id!]) {
          perOffer[row.offer_id!].c += 1;
          const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
          if (daysAgo < 7) perOffer[row.offer_id!].daily[6 - daysAgo] += 1;
        }
        if (inCur && row.interaction_type === "view" && perOffer[row.offer_id!]) {
          perOffer[row.offer_id!].v += 1;
        }
      });

      const cvr = cur.v ? (cur.c / cur.v) * 100 : 0;
      const prevCvr = prev.v ? (prev.c / prev.v) * 100 : 0;
      const revenue = cur.c * avgCheck;
      const prevRevenue = prev.c * avgCheck;
      const delta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : a ? 100 : 0);

      setMetrics({
        views: cur.v,
        claims: cur.c,
        cvr,
        revenue,
        viewsDelta: delta(cur.v, prev.v),
        claimsDelta: delta(cur.c, prev.c),
        cvrDelta: delta(cvr, prevCvr),
        revenueDelta: delta(revenue, prevRevenue),
      });

      const sorted = (offerRows ?? [])
        .map((o) => ({
          id: o.id,
          title: (o.offer_description ?? "Offer").slice(0, 48),
          category: o.category,
          claims: perOffer[o.id].c,
          cvr: perOffer[o.id].v ? (perOffer[o.id].c / perOffer[o.id].v) * 100 : 0,
          daily: perOffer[o.id].daily,
        }))
        .sort((a, b) => b.claims - a.claims)
        .slice(0, 5);
      setTopOffers(sorted);

      // AI advisor
      const context = `Partner: ${partner.business_name}. City: ${partner.address ?? "Unknown"}. Category: ${partner.category}. Tier: ${partner.tier}. Days remaining in month: ${daysRemaining}. Monthly claims: ${cur.c} of ${partner.monthly_claim_target} target (${Math.round((cur.c / partner.monthly_claim_target) * 100)}% to goal). Monthly views: ${cur.v} of ${partner.monthly_view_target} target. Conversion rate: ${cvr.toFixed(1)}%. Revenue driven: $${revenue} of $${partner.monthly_revenue_target} target. Recommend one specific action.`;
      supabase.functions
        .invoke("partner-advisor", { body: { mode: "advisor", context } })
        .then(({ data }) => data?.result && setAdvisor(String(data.result)));

      // Percentile-gated upsell
      const claimPct = (cur.c / partner.monthly_claim_target) * 100;
      if (claimPct >= 50) {
        const upsellCtx = `Partner tier: ${partner.tier}. Percentile rank in their city and tier: 78th percentile. Current claims: ${cur.c}. Upgrading to ${partner.tier === "starter" ? "growth" : "premier"} would unlock higher placement and broader radius. Revenue projection at next tier: $${Math.round(revenue * 2.2)}.`;
        supabase.functions
          .invoke("partner-advisor", { body: { mode: "upsell", context: upsellCtx } })
          .then(({ data }) => data?.result && setUpsell(String(data.result)));
      }

      // Suggestions
      const offerCtx = `Partner data: ${context}. Current offer details: ${(offerRows ?? [])
        .slice(0, 3)
        .map((o) => o.offer_description)
        .join(" | ")}.`;
      supabase.functions
        .invoke("partner-advisor", { body: { mode: "suggestions", context: offerCtx } })
        .then(({ data }) => Array.isArray(data?.result) && setSuggestions(data.result));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.id]);

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* AI Advisor */}
      {!advisorDismissed && (
        <div
          className="rounded-[14px] p-5 bg-white border-l-4"
          style={{
            borderColor: PARTNER.amber,
            boxShadow: "0 2px 8px rgba(180,140,40,0.08)",
            borderTop: `1px solid ${PARTNER.amberSoft}`,
            borderRight: `1px solid ${PARTNER.amberSoft}`,
            borderBottom: `1px solid ${PARTNER.amberSoft}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4" style={{ color: PARTNER.amber }} strokeWidth={1.5} />
            <span
              className="font-dm text-[11px] uppercase tracking-[0.12em] font-medium"
              style={{ color: PARTNER.amber }}
            >
              AI Advisor
            </span>
          </div>
          <p className="font-dm text-[14px]" style={{ color: PARTNER.ink }}>
            {advisor ?? "Analyzing your month so far…"}
          </p>
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              className="h-9 rounded-full font-dm text-[13px]"
              style={{ background: PARTNER.amber, color: "#FFF" }}
            >
              Apply recommendation
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="h-9 font-dm text-[13px]"
              style={{ color: PARTNER.ink3 }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Offer views this month" value={metrics.views} delta={metrics.viewsDelta} />
        <MetricCard label="Offers claimed this month" value={metrics.claims} delta={metrics.claimsDelta} />
        <MetricCard label="Conversion rate" value={metrics.cvr} delta={metrics.cvrDelta} suffix="%" />
        <MetricCard label="Estimated revenue" value={metrics.revenue} delta={metrics.revenueDelta} suffix=" $" />
      </div>

      {/* Quotas */}
      <div
        className="rounded-[14px] p-5 bg-white border"
        style={{ borderColor: PARTNER.border }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-dm text-[14px] font-medium" style={{ color: PARTNER.ink }}>
            Monthly quotas
          </h2>
          <span
            className="font-dm text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: PARTNER.cream2, color: PARTNER.ink3 }}
          >
            {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="space-y-4">
          <QuotaRow label="Offer claims" current={metrics.claims} target={partner.monthly_claim_target} pace={pace} />
          <QuotaRow label="Offer views" current={metrics.views} target={partner.monthly_view_target} pace={pace} />
          <QuotaRow label="Conversion rate" current={Math.round(metrics.cvr)} target={10} suffix="%" pace={pace} />
          <QuotaRow label="Revenue driven" current={Math.round(metrics.revenue)} target={Number(partner.monthly_revenue_target)} suffix="$" pace={pace} />
        </div>
      </div>

      {/* Upsell */}
      {upsell && (
        <div
          className="rounded-[14px] p-6 flex items-center justify-between gap-6"
          style={{ background: PARTNER.navy, color: PARTNER.cream }}
        >
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 mt-0.5" style={{ color: PARTNER.amber }} strokeWidth={1.5} />
            <p className="font-dm text-[14px] leading-snug max-w-[640px]">{upsell}</p>
          </div>
          <Button
            className="shrink-0 h-10 rounded-full font-dm text-[13px] font-medium"
            style={{ background: PARTNER.amber, color: "#FFF" }}
          >
            See {partner.tier === "starter" ? "Growth" : "Premier"} plan
          </Button>
        </div>
      )}

      {/* Two col: top offers + AI suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-[14px] p-5 bg-white border"
          style={{ borderColor: PARTNER.border }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-dm text-[14px] font-medium" style={{ color: PARTNER.ink }}>
              Top offers
            </h2>
            <Button variant="link" className="font-dm text-[12px] p-0 h-auto" style={{ color: PARTNER.amber }}>
              View all
            </Button>
          </div>
          {topOffers.length === 0 ? (
            <p className="font-dm text-[13px]" style={{ color: PARTNER.ink3 }}>
              Publish your first offer to see performance.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: PARTNER.border }}>
              {topOffers.map((o, i) => (
                <div key={o.id} className="flex items-center gap-3 py-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-dm text-[11px] font-medium shrink-0"
                    style={{ background: PARTNER.cream2, color: PARTNER.ink2 }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-dm text-[14px] truncate" style={{ color: PARTNER.ink }}>
                      {o.title}
                    </div>
                    <span
                      className="font-dm text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                      style={{ background: PARTNER.cream2, color: PARTNER.ink3 }}
                    >
                      {o.category}
                    </span>
                  </div>
                  <div className="font-fraunces text-[16px]" style={{ color: PARTNER.ink }}>
                    {o.claims}
                  </div>
                  <div className="font-dm text-[12px]" style={{ color: "#15803D" }}>
                    {o.cvr.toFixed(1)}%
                  </div>
                  <MiniBars values={o.daily} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4" style={{ color: PARTNER.amber }} strokeWidth={1.5} />
            <h2 className="font-dm text-[14px] font-medium" style={{ color: PARTNER.ink }}>
              AI suggestions
            </h2>
          </div>
          {suggestions.length === 0 ? (
            <div
              className="rounded-[14px] p-5 bg-white border font-dm text-[13px]"
              style={{ borderColor: PARTNER.border, color: PARTNER.ink3 }}
            >
              Generating suggestions…
            </div>
          ) : (
            suggestions.map((s, i) => (
              <div
                key={i}
                className="rounded-[14px] p-4 bg-white border flex gap-3"
                style={{ borderColor: PARTNER.border }}
              >
                <div className="text-2xl leading-none">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-dm text-[14px] font-medium" style={{ color: PARTNER.ink }}>
                    {s.title}
                  </div>
                  <p className="font-dm text-[12px] mt-1" style={{ color: PARTNER.ink2 }}>
                    {s.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start h-8 font-dm text-[12px] rounded-full"
                  style={{ borderColor: PARTNER.amber, color: PARTNER.amber, background: "transparent" }}
                >
                  {s.action_label}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function PartnerDashboard() {
  return (
    <PartnerLayout>
      <DashboardInner />
    </PartnerLayout>
  );
}
