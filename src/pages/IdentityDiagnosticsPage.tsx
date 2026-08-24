/**
 * Sign-in & Links diagnostics.
 *
 * Reports the honest state of every part of the native identity stack, and
 * lets a signed-in user link or unlink Apple / Google to their existing Roavr
 * account. Nothing here can be faked green: each row is derived from real
 * configuration or a live probe of the auth backend.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CircleAlert, CircleCheck, CircleHelp, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildChecks,
  fetchEnabledProviders,
  rollup,
  type ConfigCheck,
  type ConfigState,
} from "@/lib/auth/identityStatus";
import { listIdentities, linkProvider, unlinkProvider, type LinkedIdentity } from "@/lib/auth/linking";

const STATE_LABEL: Record<ConfigState, string> = {
  ready: "Working",
  unverified: "Unverified",
  missing: "Not configured",
};

const OWNER_LABEL: Record<ConfigCheck["owner"], string> = {
  app: "App code",
  apple: "Apple Developer",
  google: "Google Cloud",
  backend: "Backend auth settings",
  domain: "Production domain",
  device: "Real device",
};

function StateIcon({ state }: { state: ConfigState }) {
  if (state === "ready") return <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (state === "unverified") return <CircleHelp className="h-4 w-4 text-warning shrink-0" />;
  return <CircleAlert className="h-4 w-4 text-destructive shrink-0" />;
}

export default function IdentityDiagnosticsPage() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<ConfigCheck[]>([]);
  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [providers, linked] = await Promise.all([fetchEnabledProviders(), listIdentities()]);
    setChecks(buildChecks(providers));
    setIdentities(linked);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLink = async (provider: "apple" | "google") => {
    setBusy(provider);
    const error = await linkProvider(provider);
    setBusy(null);
    if (error) toast.error(error.message);
  };

  const handleUnlink = async (identity: LinkedIdentity) => {
    setBusy(identity.id);
    const error = await unlinkProvider(identity);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${identity.provider} disconnected.`);
    void load();
  };

  const overall = checks.length ? rollup(checks) : "unverified";

  return (
    <div className="min-h-dvh bg-background pb-safe">
      <header className="flex items-center gap-2 px-4 pt-safe pb-3">
        <button onClick={() => navigate("/settings")} className="text-muted-foreground flex items-center gap-1 text-[13px]">
          <ChevronLeft className="h-4 w-4" /> Settings
        </button>
      </header>

      <main className="px-4 space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Sign-in &amp; Links</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configuration status for Apple, Google and deep links.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <StateIcon state={overall} />
            <span className="text-sm text-foreground">Overall: {STATE_LABEL[overall]}</span>
            <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={() => void load()}>
              <RefreshCw className="h-3.5 w-3.5" /> Recheck
            </Button>
          </div>
        </div>

        <section className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
            Connected sign-in methods
          </p>
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {identities.length === 0 && !loading && (
              <p className="p-4 text-sm text-muted-foreground">No linked identities found.</p>
            )}
            {identities.map((identity) => (
              <div key={identity.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground capitalize">{identity.provider}</p>
                  <p className="text-xs text-muted-foreground truncate">{identity.email ?? "—"}</p>
                </div>
                {identity.provider !== "email" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-destructive"
                    disabled={busy === identity.id}
                    onClick={() => void handleUnlink(identity)}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {(["apple", "google"] as const)
              .filter((p) => !identities.some((i) => i.provider === p))
              .map((provider) => (
                <Button
                  key={provider}
                  variant="outline"
                  className="flex-1 capitalize"
                  disabled={busy === provider}
                  onClick={() => void handleLink(provider)}
                >
                  {busy === provider ? <Loader2 className="h-4 w-4 animate-spin" /> : `Link ${provider}`}
                </Button>
              ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
            Configuration checks
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border divide-y divide-border">
              {checks.map((check) => (
                <div key={check.id} className="flex gap-3 p-4">
                  <StateIcon state={check.state} />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {STATE_LABEL[check.state]} · Owner: {OWNER_LABEL[check.owner]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground pb-8">
          Universal Links and Android App Links stay marked unverified until the production domain
          serves the association files and a real device confirms the round trip.
        </p>
      </main>
    </div>
  );
}
