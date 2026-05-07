import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, UserPlus, MessageCircle, Lock, Shield } from "lucide-react";
import { toast } from "sonner";

interface UserResult {
  id: string;
  name: string | null;
  profile_photo: string | null;
  home_city: string | null;
}

export default function NewMessagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [startAsPrivate, setStartAsPrivate] = useState(false);

  useEffect(() => {
    if (search.length >= 2) searchUsers();
    else setResults([]);
  }, [search]);

  const searchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, profile_photo, home_city")
      .neq("id", user!.id)
      .ilike("name", `%${search}%`)
      .limit(20);
    setResults((data as UserResult[]) || []);
    setLoading(false);
  };

  const startConversation = async (otherUserId: string) => {
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user!.id);

    if (myConvs && myConvs.length > 0) {
      const convIds = myConvs.map((c: any) => c.conversation_id);
      const { data: otherConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", convIds);

      if (otherConvs && otherConvs.length > 0) {
        if (startAsPrivate) {
          await supabase.from("conversations").update({ encryption_mode: "private" }).eq("id", otherConvs[0].conversation_id);
        }
        navigate(`/messages/${otherConvs[0].conversation_id}`);
        return;
      }
    }

    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        type: "direct",
        created_by: user!.id,
        encryption_mode: startAsPrivate ? "private" : "standard",
      })
      .select()
      .single();

    if (error || !conv) {
      toast.error("Failed to create conversation");
      return;
    }

    await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: user!.id, role: "owner" },
      { conversation_id: conv.id, user_id: otherUserId, role: "member" },
    ]);

    navigate(`/messages/${conv.id}`);
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-4">
          <button onClick={() => navigate("/messages")} className="text-dark-muted mb-3 flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">New Message</h1>
          <p className="text-dark-muted text-[13px] mt-1">Find a traveler to connect with</p>

          {/* Private chat toggle */}
          <button
            onClick={() => setStartAsPrivate(!startAsPrivate)}
            className={`mt-3 w-full rounded-xl p-3 flex items-center gap-3 transition-all ${
              startAsPrivate
                ? "bg-emerald-500/15 border border-emerald-500/30"
                : "dark-card-elevated"
            }`}
          >
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              startAsPrivate ? "bg-emerald-500/20" : "bg-white/5"
            }`}>
              {startAsPrivate ? <Lock className="h-4 w-4 text-emerald-400" /> : <Shield className="h-4 w-4 text-dark-muted" />}
            </div>
            <div className="text-left flex-1">
              <p className={`text-[12px] font-semibold ${startAsPrivate ? "text-emerald-400" : "text-dark-muted"}`}>
                {startAsPrivate ? "Private Travel Chat" : "Standard Chat"}
              </p>
              <p className="text-[10px] text-dark-muted">
                {startAsPrivate ? "End-to-end encrypted · Only you and the recipient" : "Encrypted in transit and at rest"}
              </p>
            </div>
            <div className={`h-5 w-9 rounded-full relative transition-colors ${startAsPrivate ? "bg-emerald-500" : "bg-white/10"}`}>
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${startAsPrivate ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </button>

          <div className="relative mt-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-muted" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full h-11 rounded-xl pl-10 pr-4 text-[13px] text-white placeholder:text-dark-muted border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 dark-card-elevated"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="h-11 w-11 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 bg-muted rounded" />
                  <div className="h-2.5 w-20 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-0.5">
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => startConversation(u.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center overflow-hidden shrink-0">
                  {u.profile_photo ? (
                    <img src={u.profile_photo} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg">👤</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{u.name || "Traveler"}</p>
                  {u.home_city && <p className="text-[11px] text-muted-foreground">{u.home_city}</p>}
                </div>
                {startAsPrivate ? (
                  <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <MessageCircle className="h-4 w-4 text-accent shrink-0" />
                )}
              </button>
            ))}
          </div>
        ) : search.length >= 2 ? (
          <p className="text-center text-[13px] text-muted-foreground py-8">No travelers found</p>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="h-14 w-14 rounded-full bg-accent/8 flex items-center justify-center mx-auto">
              <UserPlus className="h-7 w-7 text-accent/50" />
            </div>
            <p className="text-[13px] text-muted-foreground max-w-[220px] mx-auto">Search for a traveler by name to start a conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
