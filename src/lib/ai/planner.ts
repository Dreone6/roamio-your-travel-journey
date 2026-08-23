/**
 * Ask Roavr — client-side service boundary for AI planning.
 *
 * The key never touches the browser: this only invokes the `ask-roavr` edge
 * function. When no provider is configured the function answers 503 and we
 * surface an honest "unavailable" state rather than inventing a plan.
 */
import { supabase } from "@/integrations/supabase/client";
import { ITEM_TYPES, type ItemType, type SuggestedDay, type Trip } from "@/lib/trips/types";

export interface PlannerResult {
  status: "ok" | "unavailable" | "error";
  reply: string;
  days: SuggestedDay[];
  error?: string;
}

function coerceType(v: unknown): ItemType {
  const s = String(v ?? "").toLowerCase();
  return (ITEM_TYPES as readonly string[]).includes(s) ? (s as ItemType) : "activity";
}

function coerceDays(raw: unknown): SuggestedDay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d: any, di: number) => ({
      day_number: Number(d?.day_number) > 0 ? Number(d.day_number) : di + 1,
      label: typeof d?.label === "string" ? d.label : null,
      items: (Array.isArray(d?.items) ? d.items : [])
        .map((i: any) => ({
          time: typeof i?.time === "string" && /^\d{1,2}:\d{2}/.test(i.time) ? i.time.slice(0, 5) : null,
          title: String(i?.title ?? "").slice(0, 200),
          type: coerceType(i?.type),
          location: typeof i?.location === "string" ? i.location : null,
          notes: typeof i?.notes === "string" ? i.notes : null,
          estimated_cost: Number.isFinite(Number(i?.estimated_cost)) ? Number(i.estimated_cost) : null,
        }))
        .filter((i) => i.title.length > 0),
    }))
    .filter((d) => d.items.length > 0);
}

export async function askRoavr(
  prompt: string,
  trip?: Trip | null,
  existing?: { day_number: number; activity: string; time?: string | null }[],
): Promise<PlannerResult> {
  const { data, error } = await supabase.functions.invoke("ask-roavr", {
    body: {
      prompt,
      trip: trip
        ? {
            title: trip.title,
            destination: trip.destination,
            start_date: trip.start_date,
            end_date: trip.end_date,
            travelers: trip.travelers,
            interests: trip.interests,
            pace: trip.pace,
            dietary: trip.dietary,
          }
        : undefined,
      existing: existing?.slice(0, 40),
    },
  });

  // Non-2xx responses arrive as FunctionsHttpError with the JSON body attached.
  if (error) {
    let body: any = null;
    try {
      body = await (error as any).context?.json?.();
    } catch {
      /* body unavailable */
    }
    if (body?.aiAvailable === false) {
      return {
        status: "unavailable",
        reply: "",
        days: [],
        error: body.error ?? "AI planning is not configured yet.",
      };
    }
    return { status: "error", reply: "", days: [], error: body?.error ?? error.message };
  }

  if (data?.aiAvailable === false) {
    return { status: "unavailable", reply: "", days: [], error: data.error };
  }
  if (data?.error) return { status: "error", reply: "", days: [], error: data.error };

  return { status: "ok", reply: String(data?.reply ?? ""), days: coerceDays(data?.days) };
}
