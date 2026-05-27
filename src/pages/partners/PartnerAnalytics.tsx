import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { PartnerLayout, usePartner } from "@/components/partners/PartnerLayout";
import { PARTNER } from "@/components/partners/PartnerThemeWrapper";
import { supabase } from "@/integrations/supabase/client";

type Range = "7d" | "30d" | "90d";

function AnalyticsInner() {
  const { partner } = usePartner();
  const [range, setRange] = useState<Range>("30d");
  const [rows, setRows] = useState<
    Array<{ date: string; views: number; claims: number; hour: number; offerId: string }>
  >([]);
  const [offerTitles, setOfferTitles] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<"date" | "views" | "claims" | "cvr">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = useMemo(() => new Date(Date.now() - days * 86400000), [days]);

  useEffect(() => {
    (async () => {
      const { data: offers } = await supabase
        .from("partner_offers")
        .select("id, offer_description")
        .eq("partner_id", partner.id);
      const ids = (offers ?? []).map((o) => o.id);
      setOfferTitles(
        Object.fromEntries((offers ?? []).map((o) => [o.id, (o.offer_description ?? "Offer").slice(0, 40)])),
      );
      if (!ids.length) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from("offer_interactions")
        .select("offer_id, interaction_type, created_at")
        .in("offer_id", ids)
        .gte("created_at", since.toISOString());
      setRows(
        (data ?? []).map((r) => {
          const d = new Date(r.created_at);
          return {
            date: d.toISOString().slice(0, 10),
            views: r.interaction_type === "view" ? 1 : 0,
            claims: r.interaction_type === "claim" ? 1 : 0,
            hour: d.getHours(),
            offerId: r.offer_id!,
          };
        }),
      );
    })();
  }, [partner.id, since]);

  const dailySeries = useMemo(() => {
    const map: Record<string, { date: string; views: number; claims: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      map[d] = { date: d.slice(5), views: 0, claims: 0 };
    }
    rows.forEach((r) => {
      const key = r.date.slice(5);
      const entry = Object.values(map).find((m) => m.date === key);
      if (entry) {
        entry.views += r.views;
        entry.claims += r.claims;
      }
    });
    return Object.values(map);
  }, [rows, days]);

  const hourSeries = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, claims: 0 }));
    rows.forEach((r) => {
      if (r.claims) hours[r.hour].claims += 1;
    });
    const top3 = [...hours].sort((a, b) => b.claims - a.claims).slice(0, 3).map((h) => h.hour);
    return hours.map((h) => ({ ...h, top: top3.includes(h.hour) }));
  }, [rows]);

  const offerSeries = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.claims) m[r.offerId] = (m[r.offerId] ?? 0) + 1;
    });
    return Object.entries(m)
      .map(([id, claims]) => ({ name: offerTitles[id] ?? "Offer", claims }))
      .sort((a, b) => b.claims - a.claims);
  }, [rows, offerTitles]);

  const tableRows = useMemo(() => {
    const sorted = [...dailySeries].map((d) => ({
      ...d,
      cvr: d.views ? +((d.claims / d.views) * 100).toFixed(1) : 0,
    }));
    sorted.sort((a, b) => {
      const A = a[sortKey] as number | string;
      const B = b[sortKey] as number | string;
      return (A < B ? -1 : A > B ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
    });
    return sorted;
  }, [dailySeries, sortKey, sortDir]);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <h1 className="font-fraunces text-[24px]" style={{ color: PARTNER.ink }}>
          Analytics
        </h1>
        <div className="flex gap-1 p-1 rounded-full" style={{ background: PARTNER.cream2 }}>
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-full font-dm text-[12px] transition-colors"
              style={{
                background: range === r ? PARTNER.white : "transparent",
                color: range === r ? PARTNER.ink : PARTNER.ink3,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[14px] p-5 bg-white border" style={{ borderColor: PARTNER.border }}>
        <h2 className="font-dm text-[14px] font-medium mb-4" style={{ color: PARTNER.ink }}>
          Views and claims
        </h2>
        <div className="h-[260px]">
          <ResponsiveContainer>
            <LineChart data={dailySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={PARTNER.border} />
              <XAxis dataKey="date" stroke={PARTNER.ink3} fontSize={11} />
              <YAxis stroke={PARTNER.ink3} fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke={PARTNER.amber} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="claims" stroke={PARTNER.sage} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[14px] p-5 bg-white border" style={{ borderColor: PARTNER.border }}>
        <h2 className="font-dm text-[14px] font-medium mb-4" style={{ color: PARTNER.ink }}>
          Claims by hour
        </h2>
        <div className="h-[240px]">
          <ResponsiveContainer>
            <BarChart data={hourSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={PARTNER.border} />
              <XAxis dataKey="hour" stroke={PARTNER.ink3} fontSize={11} />
              <YAxis stroke={PARTNER.ink3} fontSize={11} />
              <Tooltip />
              <Bar dataKey="claims" radius={[4, 4, 0, 0]}>
                {hourSeries.map((h, i) => (
                  <Cell key={i} fill={h.top ? PARTNER.amber : PARTNER.cream2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {offerSeries.length > 1 && (
        <div className="rounded-[14px] p-5 bg-white border" style={{ borderColor: PARTNER.border }}>
          <h2 className="font-dm text-[14px] font-medium mb-4" style={{ color: PARTNER.ink }}>
            Claims by offer
          </h2>
          <div className="h-[Math.max(180,offerSeries.length*40)]" style={{ height: Math.max(180, offerSeries.length * 40) }}>
            <ResponsiveContainer>
              <BarChart data={offerSeries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={PARTNER.border} />
                <XAxis type="number" stroke={PARTNER.ink3} fontSize={11} />
                <YAxis dataKey="name" type="category" stroke={PARTNER.ink3} fontSize={11} width={140} />
                <Tooltip />
                <Bar dataKey="claims" fill={PARTNER.amber} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-[14px] bg-white border overflow-hidden" style={{ borderColor: PARTNER.border }}>
        <table className="w-full font-dm text-[13px]">
          <thead style={{ background: PARTNER.cream2 }}>
            <tr>
              {(["date", "views", "claims", "cvr"] as const).map((k) => (
                <th
                  key={k}
                  onClick={() => {
                    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSortKey(k);
                      setSortDir("desc");
                    }
                  }}
                  className="text-left py-2.5 px-4 cursor-pointer select-none capitalize"
                  style={{ color: PARTNER.ink2 }}
                >
                  {k === "cvr" ? "CVR" : k} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.date} className="border-t" style={{ borderColor: PARTNER.border }}>
                <td className="py-2 px-4" style={{ color: PARTNER.ink }}>
                  {r.date}
                </td>
                <td className="py-2 px-4" style={{ color: PARTNER.ink }}>
                  {r.views}
                </td>
                <td className="py-2 px-4" style={{ color: PARTNER.ink }}>
                  {r.claims}
                </td>
                <td className="py-2 px-4" style={{ color: PARTNER.ink }}>
                  {r.cvr}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PartnerAnalytics() {
  return (
    <PartnerLayout>
      <AnalyticsInner />
    </PartnerLayout>
  );
}
