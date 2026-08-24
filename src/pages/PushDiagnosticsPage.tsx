/**
 * Notification Setup Status — admin-only.
 *
 * Shows the real state of the push stack (provider credentials, registered
 * devices, token refresh times, send-path availability) and lets an authorized
 * account fire a safe test notification through the production send path.
 *
 * The gate that matters is server-side: `push-diagnostics` verifies
 * `has_role('admin')` on every call. This screen's own check only decides
 * whether to render.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TEST_CATEGORIES,
  describeTestOutcome,
  fetchPushDiagnostics,
  isPushAdmin,
  sendTestPush,
  type PushDiagnostics,
  type TestCategory,
} from "@/lib/notifications/diagnostics";

type Tone = "ok" | "warn" | "bad";

function StatusRow({
  tone,
  label,
  detail,
}: {
  tone: Tone;
  label: string;
  detail: string;
}) {
  const Icon = tone === "ok" ? CircleCheck : tone === "warn" ? CircleHelp : CircleAlert;
  const color =
    tone === "ok" ? "text-emerald-500" : tone === "warn" ? "text-warning" : "text-destructive";
  return (
    <div className="flex gap-3 p-4">
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground break-words">{detail}</p>
      </div>
    </div>
  );
}

function formatWhen(iso: string | null) {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default function PushDiagnosticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<PushDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [targetUserId, setTargetUserId] = useState("");
  const [category, setCategory] = useState<TestCategory>("message");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);

  const load = useCallback(
    async (target?: string) => {
      setLoading(true);
      const result = await fetchPushDiagnostics(target || undefined);
      setData(result.data);
      setError(result.error);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    void (async () => {
      const ok = await isPushAdmin(user?.id);
      setAllowed(ok);
      if (ok) await load();
      else setLoading(false);
    })();
  }, [user?.id, load]);

  const runTest = async () => {
    if (!targetUserId.trim()) {
      toast.error("Enter the target user id");
      return;
    }
    setSending(true);
    const { data: result, error: sendError } = await sendTestPush({
      targetUserId: targetUserId.trim(),
      type: category,
      note: note.trim() || undefined,
    });
    setSending(false);
    if (sendError || !result) {
      setLastOutcome(null);
      toast.error(sendError ?? "Test send failed");
      return;
    }
    const summary = describeTestOutcome(result.result ?? {});
    setLastOutcome(summary);
    toast.success(summary);
  };

  if (allowed === null || (loading && allowed)) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-dvh grid place-items-center px-6 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">Not available</p>
          <p className="text-xs text-muted-foreground mt-1">
            The notification harness is restricted to administrator accounts.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/settings")}>
            Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  const fcmTone: Tone = data?.fcm.credentialValid ? "ok" : data?.fcm.credentialPresent ? "bad" : "bad";

  return (
    <div className="min-h-dvh bg-background pb-16">
      <header className="flex items-center gap-2 px-4 pt-safe pt-4 pb-3">
        <button
          onClick={() => navigate("/admin")}
          className="text-muted-foreground flex items-center gap-1 text-[13px]"
        >
          <ArrowLeft className="h-4 w-4" /> Admin
        </button>
      </header>

      <main className="px-4 space-y-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold text-foreground">Notification Setup Status</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Live provider, device and send-path state. No keys are ever shown.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={() => void load(targetUserId)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {data && (
          <>
            <section className="rounded-2xl bg-card border border-border divide-y divide-border">
              <StatusRow
                tone={fcmTone}
                label="Firebase / FCM"
                detail={
                  data.fcm.credentialValid
                    ? `Service account configured for project ${data.fcm.projectId}.`
                    : data.fcm.credentialPresent
                      ? "Service account present but malformed — delivery will fail."
                      : "No service account configured. In-app notifications still land; push does not."
                }
              />
              <StatusRow
                tone={data.apns.registeredDevices > 0 ? "warn" : "warn"}
                label="APNs (iOS)"
                detail={`Delivered through Firebase. ${data.apns.registeredDevices} iOS device(s) registered. The APNs auth key lives in the Firebase console and cannot be verified from the app — confirm on a real device.`}
              />
              <StatusRow
                tone={data.sendPath.deliveryConfigured ? "ok" : "warn"}
                label="Backend send path"
                detail={
                  data.sendPath.deliveryConfigured
                    ? "send-push reachable and delivery configured."
                    : "send-push reachable; it will report not_configured until credentials exist."
                }
              />
              {data.missing.length > 0 && (
                <StatusRow
                  tone="bad"
                  label="Missing configuration"
                  detail={data.missing.join(", ")}
                />
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                  Device tokens
                </p>
                <span className="text-xs text-muted-foreground">
                  {data.targetUserId === data.callerId ? "your account" : "target account"}
                </span>
              </div>
              <div className="rounded-2xl bg-card border border-border divide-y divide-border">
                {data.devices.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">
                    No registered devices. Enable notifications on a real device to register a token.
                  </p>
                )}
                {data.devices.map((device) => (
                  <div key={device.id} className="p-4 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground capitalize">
                      {device.platform ?? "unknown"} · {device.provider ?? "unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Token {device.tokenFingerprint} · app {device.appVersion ?? "—"} ·{" "}
                      {device.enabled ? "enabled" : "disabled"}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Last refreshed {formatWhen(device.lastRefreshedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                Send test push
              </p>
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="target">Target user id</Label>
                  <Input
                    id="target"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="uuid of the test account"
                    onBlur={() => targetUserId.trim() && void load(targetUserId.trim())}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as TestCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note">Test note (optional)</Label>
                  <Input
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={120}
                    placeholder="Delivery check from the Roavr notification harness."
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Sends through the production send path with your account as the actor. Every block,
                  privacy and preference gate applies — a rejection here is a correct result.
                </p>
                <Button className="w-full gap-2" disabled={sending} onClick={() => void runTest()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send test notification
                </Button>
                {lastOutcome && (
                  <p className="text-xs text-foreground bg-secondary rounded-xl p-3">{lastOutcome}</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
