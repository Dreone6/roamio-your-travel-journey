import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera } from "lucide-react";

interface ProfileRow {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  home_city: string | null;
  travel_style: string | null;
  interests: string[] | null;
  profile_photo: string | null;
  is_private: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileRow;
  onSaved: (updated: ProfileRow) => void;
}

const STYLES = ["adventure", "relaxation", "cultural", "foodie", "budget", "luxury", "solo", "family", "romantic"];
const INTEREST_OPTS = ["food", "hiking", "art", "nightlife", "history", "beaches", "photography", "music", "wellness"];

export default function EditProfileSheet({ open, onOpenChange, profile, onSaved }: Props) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setForm(profile); }, [profile]);

  const upd = <K extends keyof ProfileRow>(k: K, v: ProfileRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleInterest = (i: string) => {
    const cur = form.interests ?? [];
    upd("interests", cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]);
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      upd("profile_photo", data.publicUrl);
    } catch (err) {
      toast.error("Couldn't upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (form.username && !/^[a-z0-9_]{3,20}$/i.test(form.username)) {
      toast.error("Username: 3–20 chars, letters/numbers/_ only");
      return;
    }
    setSaving(true);
    try {
      // unique check
      if (form.username && form.username !== profile.username) {
        const { data: existing } = await supabase
          .from("profiles").select("id").eq("username", form.username.toLowerCase()).maybeSingle();
        if (existing && existing.id !== profile.id) {
          toast.error("Username already taken");
          setSaving(false);
          return;
        }
      }
      const payload = {
        name: form.name,
        username: form.username?.toLowerCase() || null,
        bio: form.bio?.slice(0, 150) || null,
        home_city: form.home_city,
        travel_style: form.travel_style,
        interests: form.interests ?? [],
        profile_photo: form.profile_photo,
        is_private: form.is_private ?? false,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
      if (error) throw error;
      toast.success("Profile updated");
      onSaved({ ...profile, ...payload });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#080D1A] border-t border-[#1E2A3F] text-white max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading text-white text-[22px]">Edit profile</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5 pb-8">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-[#3B82F6] bg-[#1A2236]">
                {form.profile_photo && <img src={form.profile_photo} className="h-full w-full object-cover" alt="" />}
              </div>
              <label className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[#3B82F6] flex items-center justify-center cursor-pointer">
                <Camera className="h-4 w-4 text-white" strokeWidth={1.5} />
                <input type="file" accept="image/*" className="hidden" onChange={onAvatar} disabled={uploading} />
              </label>
            </div>
            <p className="text-[13px] text-[#94A3B8]">{uploading ? "Uploading…" : "Tap to change avatar"}</p>
          </div>

          <Field label="Full name">
            <Input value={form.name ?? ""} onChange={(e) => upd("name", e.target.value)} className="bg-[#111827] border-[#1E2A3F] text-white" />
          </Field>

          <Field label="Username" hint="Letters, numbers, underscores · 3–20 chars">
            <Input value={form.username ?? ""} onChange={(e) => upd("username", e.target.value)} placeholder="andre" className="bg-[#111827] border-[#1E2A3F] text-white" />
          </Field>

          <Field label="Bio" hint={`${(form.bio ?? "").length}/150`}>
            <Textarea
              value={form.bio ?? ""} maxLength={150}
              onChange={(e) => upd("bio", e.target.value)}
              rows={3}
              className="bg-[#111827] border-[#1E2A3F] text-white resize-none" />
          </Field>

          <Field label="Home city">
            <Input value={form.home_city ?? ""} onChange={(e) => upd("home_city", e.target.value)} className="bg-[#111827] border-[#1E2A3F] text-white" placeholder="London 🇬🇧" />
          </Field>

          <Field label="Travel style">
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => {
                const on = form.travel_style === s;
                return (
                  <button key={s} type="button" onClick={() => upd("travel_style", on ? null : s)}
                    className={`px-3 py-1.5 rounded-full text-[12px] capitalize transition ${on ? "bg-[#3B82F6] text-white" : "bg-[#111827] text-[#94A3B8] border border-[#1E2A3F]"}`}>{s}</button>
                );
              })}
            </div>
          </Field>

          <Field label="Interests">
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTS.map((i) => {
                const on = (form.interests ?? []).includes(i);
                return (
                  <button key={i} type="button" onClick={() => toggleInterest(i)}
                    className={`px-3 py-1.5 rounded-full text-[12px] capitalize transition ${on ? "bg-[#3B82F6] text-white" : "bg-[#111827] text-[#94A3B8] border border-[#1E2A3F]"}`}>{i}</button>
                );
              })}
            </div>
          </Field>

          <div className="flex items-center justify-between rounded-2xl bg-[#111827] border border-[#1E2A3F] px-4 py-3">
            <div>
              <Label htmlFor="priv" className="text-white text-[14px]">Private profile</Label>
              <p className="text-[12px] text-[#94A3B8]">Only followers can see memories.</p>
            </div>
            <Switch id="priv" checked={!!form.is_private} onCheckedChange={(v) => upd("is_private", v)} />
          </div>

          <Button onClick={save} disabled={saving} className="w-full h-12 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[14px] font-semibold">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-[12px] uppercase tracking-wider text-[#94A3B8]">{label}</Label>
        {hint && <span className="text-[11px] text-[#4B5563]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
