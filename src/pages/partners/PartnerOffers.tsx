import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Upload } from "lucide-react";
import { PartnerLayout, usePartner } from "@/components/partners/PartnerLayout";
import { PARTNER } from "@/components/partners/PartnerThemeWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Offer = {
  id: string;
  partner_id: string | null;
  business_name: string;
  offer_description: string;
  discount: string | null;
  category: string;
  image: string | null;
  active: boolean;
};

const CATEGORIES = ["food", "lodging", "transport", "activity", "shopping", "other"] as const;
type OfferCategory = typeof CATEGORIES[number];

function OffersInner() {
  const { partner } = usePartner();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("partner_offers")
      .select("*")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false });
    setOffers((data ?? []) as Offer[]);
  };

  useEffect(() => {
    load();
  }, [partner.id]);

  const toggleActive = async (offer: Offer) => {
    await supabase.from("partner_offers").update({ active: !offer.active }).eq("id", offer.id);
    load();
  };

  const onDelete = async () => {
    if (!deleteId) return;
    await supabase.from("partner_offers").delete().eq("id", deleteId);
    setDeleteId(null);
    toast.success("Offer deleted");
    load();
  };

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-fraunces text-[24px]" style={{ color: PARTNER.ink }}>
          My offers
        </h1>
        <Button
          onClick={() => setCreating(true)}
          className="h-10 rounded-full font-dm text-[13px]"
          style={{ background: PARTNER.amber, color: "#FFF" }}
        >
          <Plus className="h-4 w-4 mr-1" /> Create offer
        </Button>
      </div>

      {offers.length === 0 ? (
        <div
          className="rounded-[14px] p-10 text-center bg-white border"
          style={{ borderColor: PARTNER.border }}
        >
          <p className="font-dm text-[14px]" style={{ color: PARTNER.ink3 }}>
            No offers yet. Create your first one to start reaching travelers.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div
              key={o.id}
              className="rounded-[14px] p-4 bg-white border flex items-center gap-4"
              style={{ borderColor: PARTNER.border }}
            >
              {o.image ? (
                <img
                  src={o.image}
                  alt={o.business_name}
                  className="w-20 h-20 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ background: PARTNER.cream2 }}
                >
                  <Upload className="h-5 w-5" style={{ color: PARTNER.ink3 }} strokeWidth={1.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-dm text-[14px] font-medium truncate" style={{ color: PARTNER.ink }}>
                  {o.business_name}
                </div>
                <p
                  className="font-dm text-[13px] truncate"
                  style={{ color: PARTNER.ink2 }}
                >
                  {o.offer_description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {o.discount && (
                    <span
                      className="font-dm text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: PARTNER.amber, color: "#FFF" }}
                    >
                      {o.discount}
                    </span>
                  )}
                  <span
                    className="font-dm text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: PARTNER.cream2, color: PARTNER.ink3 }}
                  >
                    {o.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={o.active} onCheckedChange={() => toggleActive(o)} />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(o)}
                  className="h-8 w-8"
                >
                  <Edit2 className="h-4 w-4" strokeWidth={1.5} style={{ color: PARTNER.ink3 }} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteId(o.id)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} style={{ color: "#B91C1C" }} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OfferSheet
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        offer={editing}
        partnerId={partner.id}
        partnerName={partner.business_name}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Travelers will no longer see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OfferSheet({
  open,
  onClose,
  offer,
  partnerId,
  partnerName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  offer: Offer | null;
  partnerId: string;
  partnerName: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountValue, setDiscountValue] = useState(20);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [radius, setRadius] = useState(1.5);
  const [category, setCategory] = useState<OfferCategory>("food");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (offer) {
      setTitle(offer.business_name);
      setDescription(offer.offer_description);
      setCategory(offer.category as OfferCategory);
      setImageUrl(offer.image);
      if (offer.discount) {
        const isPct = offer.discount.includes("%");
        setDiscountType(isPct ? "percent" : "fixed");
        setDiscountValue(parseInt(offer.discount.replace(/\D/g, "")) || 20);
      }
    } else {
      setTitle("");
      setDescription("");
      setDiscountValue(20);
      setDiscountType("percent");
      setRadius(1.5);
      setCategory("food");
      setImageUrl(null);
    }
  }, [offer, open]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${partnerId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("offer-images").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed");
    } else {
      const { data } = supabase.storage.from("offer-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const onSave = async () => {
    if (!title) {
      toast.error("Offer title is required");
      return;
    }
    setSaving(true);
    // active only if partner has active subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", partnerId)
      .maybeSingle();
    const isActive = sub?.status === "active" || sub?.status === "trialing";

    const payload = {
      partner_id: partnerId,
      business_name: partnerName,
      offer_description: description || title,
      discount: discountType === "percent" ? `${discountValue}%` : `$${discountValue}`,
      category,
      image: imageUrl,
      active: isActive,
    };

    if (offer) {
      await supabase.from("partner_offers").update(payload).eq("id", offer.id);
      toast.success("Offer updated");
    } else {
      await supabase.from("partner_offers").insert(payload);
      toast.success(isActive ? "Offer published" : "Offer saved as draft (activate subscription to go live)");
    }
    setSaving(false);
    onClose();
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] overflow-y-auto rounded-t-[24px] partner-scope"
        style={{ background: PARTNER.cream }}
      >
        <SheetHeader>
          <SheetTitle className="font-fraunces text-[20px]" style={{ color: PARTNER.ink }}>
            {offer ? "Edit offer" : "Create offer"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 max-w-[600px] mx-auto pb-10">
          <div>
            <Label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
              Offer title *
            </Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white" />
          </div>
          <div>
            <Label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
                Discount type
              </Label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                className="w-full h-10 px-3 rounded-md border bg-white font-dm text-sm"
                style={{ borderColor: PARTNER.border }}
              >
                <option value="percent">% off</option>
                <option value="fixed">$ off</option>
              </select>
            </div>
            <div>
              <Label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
                Discount value
              </Label>
              <Input
                type="number"
                min={5}
                max={50}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
                className="bg-white"
              />
            </div>
          </div>
          <div>
            <Label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
              Visibility radius: {radius.toFixed(1)} mi
            </Label>
            <Slider
              value={[radius]}
              min={0.1}
              max={5}
              step={0.1}
              onValueChange={([v]) => setRadius(v)}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
              Category
            </Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as OfferCategory)}
              className="w-full h-10 px-3 rounded-md border bg-white font-dm text-sm capitalize"
              style={{ borderColor: PARTNER.border }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
              Image
            </Label>
            <div className="flex items-center gap-3 mt-2">
              {imageUrl && <img src={imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />}
              <label
                className="inline-flex items-center gap-2 px-4 h-10 rounded-full cursor-pointer border font-dm text-[13px]"
                style={{ borderColor: PARTNER.border, background: "#FFF", color: PARTNER.ink2 }}
              >
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                {uploading ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onSave}
              disabled={saving}
              className="flex-1 h-11 rounded-full font-dm font-medium"
              style={{ background: PARTNER.amber, color: "#FFF" }}
            >
              {saving ? "Saving…" : offer ? "Save changes" : "Publish offer"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="h-11 font-dm">
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function PartnerOffers() {
  return (
    <PartnerLayout>
      <OffersInner />
    </PartnerLayout>
  );
}
