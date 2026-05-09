import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Phone, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  share_live_location: boolean;
}

export default function TrustedContactsList() {
  const { user } = useAuth();
  const [items, setItems] = useState<Contact[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", relationship: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("trusted_contacts").select("*").eq("user_id", user.id).then(({ data }) => {
      setItems((data as Contact[]) || []);
    });
  }, [user]);

  const add = async () => {
    if (!user || !form.name) return toast.error("Name is required");
    const { data, error } = await supabase.from("trusted_contacts")
      .insert({ user_id: user.id, ...form, share_live_location: false })
      .select().single();
    if (error) return toast.error(error.message);
    setItems((p) => [...p, data as Contact]);
    setForm({ name: "", phone: "", email: "", relationship: "" });
    setAdding(false);
    toast.success("Contact added");
  };

  const remove = async (id: string) => {
    await supabase.from("trusted_contacts").delete().eq("id", id);
    setItems((p) => p.filter((c) => c.id !== id));
  };

  const toggleShare = async (id: string, value: boolean) => {
    await supabase.from("trusted_contacts").update({ share_live_location: value }).eq("id", id);
    setItems((p) => p.map((c) => c.id === id ? { ...c, share_live_location: value } : c));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-glow" /> Trusted contacts
        </h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-[11px] text-glow font-bold flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      {adding && (
        <div className="dark-card rounded-xl p-3 space-y-2">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Relationship (e.g. Mom)" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" onClick={add} className="flex-1">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && !adding && (
          <p className="text-[11px] text-dark-muted text-center py-4">No trusted contacts yet</p>
        )}
        {items.map((c) => (
          <div key={c.id} className="dark-card rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-glow text-[12px] font-bold shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white">{c.name}</p>
                {c.relationship && <p className="text-[10px] text-dark-muted">{c.relationship}</p>}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-dark-muted">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{c.email}</span>}
                </div>
              </div>
              <button onClick={() => remove(c.id)} className="text-dark-muted hover:text-rose-400 p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
              <span className="text-[10px] text-white">Share live location</span>
              <Switch checked={c.share_live_location} onCheckedChange={(v) => toggleShare(c.id, v)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
