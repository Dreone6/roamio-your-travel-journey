import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Check, Crown, Zap, Sparkles, Globe, MapPin,
  Camera, Shield, MessageCircle, Users, Map, Compass, Star,
  ChevronRight, Play, Heart, Lock, Eye, Navigation, Trophy,
} from "lucide-react";
import roavrLogo from "@/assets/roavr-logo.png";
import miloMascot from "@/assets/roavr-pin.png";
import { PLANS } from "@/services/subscriptions";

export default function LandingPage() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Navbar ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-card/80 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <img src={miloMascot} alt="Roavr" className="h-9 w-9" />
            <span className="font-heading text-xl font-bold text-foreground tracking-tight">Roavr</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {["Features", "How It Works", "Pricing"].map(l => (
              <button key={l} onClick={() => scrollTo(l.toLowerCase().replace(/ /g, "-"))} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm font-medium">Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-accent border-0 rounded-xl px-5 text-sm font-semibold">Get Started</Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-accent/[0.03]" />
        <div className="absolute top-16 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-16 -left-32 w-[400px] h-[400px] rounded-full bg-teal-500/[0.04] blur-[100px]" />

        <div className="relative max-w-5xl mx-auto px-5 py-20 md:py-32 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/8 text-accent px-5 py-2 text-xs font-semibold tracking-wide uppercase animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" /> AI Social Travel Companion
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-bold text-foreground leading-[1.08] tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Plan smarter. Explore deeper.<br />
            <span className="italic text-accent">Remember every trip.</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Roavr is your AI social travel companion for planning trips, discovering local experiences, capturing memories, sharing your travel map, and staying protected anywhere you go.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" onClick={() => navigate("/auth")} className="gradient-accent border-0 text-base px-10 py-6 rounded-2xl gap-2 font-semibold shadow-elevated hover:shadow-lg transition-shadow">
              Start Exploring <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-10 py-6 rounded-2xl font-medium border-border/60" onClick={() => scrollTo("how-it-works")}>
              See How Roavr Works
            </Button>
          </div>
        </div>
      </section>

      {/* ── App Preview Cards ──────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pb-16 md:pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "AI Planner", icon: Sparkles, color: "from-emerald-500/15 to-teal-500/10", iconColor: "text-emerald-500" },
            { label: "Discover", icon: Compass, color: "from-blue-500/15 to-indigo-500/10", iconColor: "text-blue-500" },
            { label: "Globe", icon: Globe, color: "from-violet-500/15 to-purple-500/10", iconColor: "text-violet-500" },
            { label: "Stories", icon: Camera, color: "from-pink-500/15 to-rose-500/10", iconColor: "text-pink-500" },
            { label: "Messaging", icon: MessageCircle, color: "from-cyan-500/15 to-sky-500/10", iconColor: "text-cyan-500" },
            { label: "SafePass", icon: Shield, color: "from-amber-500/15 to-orange-500/10", iconColor: "text-amber-500" },
          ].map((item, i) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/40 bg-card p-5 text-center space-y-3 hover:shadow-elevated hover:border-accent/20 transition-all duration-300 group animate-fade-in"
              style={{ animationDelay: `${0.4 + i * 0.06}s` }}
            >
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
                <item.icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────── */}
      <section id="how-it-works" className="bg-gradient-to-b from-secondary/30 to-transparent py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-3">How It Works</p>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">
              Five steps to your<br /><span className="italic text-accent">best trip ever</span>
            </h2>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            {[
              { step: "01", title: "Plan with AI", desc: "Tell Roavr your travel style, budget, and dates. Get a fully personalized itinerary in seconds.", icon: Sparkles },
              { step: "02", title: "Explore local experiences", desc: "Discover restaurants, tours, nightlife, and hidden gems curated by local experts and travelers.", icon: Compass },
              { step: "03", title: "Capture stories and check-ins", desc: "Drop pins, snap photos, and share stories from every destination you visit.", icon: Camera },
              { step: "04", title: "Build your Globe", desc: "Watch your personal travel map grow with every trip, memory, and check-in.", icon: Globe },
              { step: "05", title: "Share or keep it private", desc: "Share your travel map with friends, or keep your journeys completely private.", icon: Lock },
            ].map((s, i) => (
              <div key={s.step} className="flex gap-5 items-start rounded-2xl border border-border/40 bg-card p-6 hover:shadow-elevated transition-all animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="h-12 w-12 rounded-2xl bg-accent/8 flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Step {s.step}</p>
                  <h3 className="font-heading text-lg font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (detailed sections) ───────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-20 md:py-28 space-y-24">
        {/* AI Trip Planner */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/8 text-emerald-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> AI Trip Planner
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
              Your AI travel planner<br /><span className="italic text-accent">thinks like you do</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Tell Roavr your destination, travel style, budget, and pace. It generates a detailed day-by-day itinerary with activities, restaurants, travel times, and local tips — all powered by AI.
            </p>
            <ul className="space-y-2.5">
              {["Smart itinerary generation", "Budget-aware recommendations", "Travel style matching", "Group trip planning (Pro)", "Edit and regenerate any day"].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500/[0.06] to-teal-500/[0.03] border border-emerald-500/10 p-8 flex flex-col items-center justify-center min-h-[320px]">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground text-center">AI-Powered Itineraries</p>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-[240px]">Personalized plans for relaxation, adventure, food, culture, and more</p>
          </div>
        </div>

        {/* Globe and Memory Map */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1 rounded-3xl bg-gradient-to-br from-violet-500/[0.06] to-purple-500/[0.03] border border-violet-500/10 p-8 flex flex-col items-center justify-center min-h-[320px]">
            <div className="h-16 w-16 rounded-2xl bg-violet-500/15 flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-violet-500" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground text-center">Your Travel Globe</p>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-[240px]">3D globe and flat map with every trip, memory, and check-in</p>
            <div className="flex items-center gap-3 mt-4">
              {["Public", "Followers", "Private"].map(v => (
                <span key={v} className="text-[10px] font-bold text-muted-foreground px-2.5 py-1 rounded-full bg-secondary">{v}</span>
              ))}
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/8 text-violet-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <Globe className="h-3.5 w-3.5" /> Globe & Memory Map
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
              Your world, <span className="italic text-accent">visualized</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Every trip, check-in, and memory becomes a pin on your interactive globe. Stories auto-convert to memory pins. Share your public travel map with the world or keep it private.
            </p>
            <ul className="space-y-2.5">
              {["Interactive 3D globe & flat map", "Travel stats and country progress", "Shareable public travel map", "Memory pins from stories", "Privacy controls per pin"].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Travel */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/8 text-pink-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <Users className="h-3.5 w-3.5" /> Social Travel
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
              Travel is better<br /><span className="italic text-accent">together</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Follow travelers, share trips, send map pins in messages, react to stories, and explore other travelers' globes. Messaging includes encrypted Private Travel Chats for Pro users.
            </p>
            <ul className="space-y-2.5">
              {["Follow travelers and explore maps", "Share trips, pins, and memories in chat", "React to stories and check-ins", "Private Travel Chats (E2E, Pro)", "Public traveler profiles"].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-pink-500/[0.06] to-rose-500/[0.03] border border-pink-500/10 p-8 flex flex-col items-center justify-center min-h-[320px]">
            <div className="h-16 w-16 rounded-2xl bg-pink-500/15 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-pink-500" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground text-center">Social Travel Network</p>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-[240px]">Followers, stories, trip sharing, and encrypted messaging</p>
          </div>
        </div>

        {/* Discover & Offers */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1 rounded-3xl bg-gradient-to-br from-amber-500/[0.06] to-orange-500/[0.03] border border-amber-500/10 p-8 flex flex-col items-center justify-center min-h-[320px]">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-4">
              <Compass className="h-8 w-8 text-amber-500" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground text-center">Discover & Local Offers</p>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-[240px]">Restaurants, hotels, tours, nightlife, and exclusive local deals</p>
          </div>
          <div className="order-1 md:order-2 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/8 text-amber-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <Compass className="h-3.5 w-3.5" /> Discover & Offers
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
              Local experiences,<br /><span className="italic text-accent">curated for you</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Find restaurants, hotels, nightlife, tours, and creators wherever you go. Claim exclusive local offers and connect with verified local experts who know the city inside out.
            </p>
            <ul className="space-y-2.5">
              {["Location-based offer discovery", "Verified local experts and guides", "Restaurant and nightlife picks", "Exclusive Roavr partner deals", "Save to collections (Plus)"].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Camera & Stories */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/8 text-cyan-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <Camera className="h-3.5 w-3.5" /> Roavr Camera
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
              Capture every moment<br /><span className="italic text-accent">beautifully</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Take HD travel photos, apply cinematic filters, post 24-hour stories, and auto-convert them into permanent memory pins on your globe when they expire.
            </p>
            <ul className="space-y-2.5">
              {["HD travel camera with filters", "24-hour stories with reactions", "Auto-save stories to globe", "Memory pins with location data", "Premium filters (Plus)"].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-cyan-500/[0.06] to-sky-500/[0.03] border border-cyan-500/10 p-8 flex flex-col items-center justify-center min-h-[320px]">
            <div className="h-16 w-16 rounded-2xl bg-cyan-500/15 flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-cyan-500" />
            </div>
            <p className="font-heading text-xl font-bold text-foreground text-center">Travel Camera & Stories</p>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-[240px]">Capture, filter, share, and remember every destination</p>
          </div>
        </div>

        {/* SafePass */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1 rounded-3xl bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.02] border border-emerald-500/10 p-8 min-h-[320px]">
            <div className="space-y-4">
              {[
                { title: "Prepare", desc: "Passport reminders, visa notes, packing lists, emergency contacts, and trip sharing setup.", icon: "📋", color: "bg-blue-500/10 text-blue-500" },
                { title: "Stay Aware", desc: "Destination safety notes, scam alerts, weather, transportation warnings, and nightlife guidance.", icon: "👁️", color: "bg-amber-500/10 text-amber-500" },
                { title: "Reach Help", desc: "Emergency SOS, local numbers, embassy info, trusted contacts, and live location sharing.", icon: "🆘", color: "bg-rose-500/10 text-rose-500" },
              ].map(p => (
                <div key={p.title} className="rounded-xl border border-border/30 bg-card p-4 flex items-start gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/8 text-emerald-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5" /> SafePass
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
              Travel with<br /><span className="italic text-accent">confidence</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Roavr SafePass helps you prepare for every trip, stay aware of your surroundings, and reach help instantly. Calm, trustworthy, and always accessible.
            </p>
            <ul className="space-y-2.5">
              {["Pre-trip safety checklist", "Destination safety breakdowns", "Local emergency numbers", "Embassy and consulate info", "Trusted contact alerts"].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────── */}
      <section id="pricing" className="bg-gradient-to-b from-secondary/30 to-transparent py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">
              Start free, upgrade<br /><span className="italic text-accent">when you're ready</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
              Roavr lets you experience the product before you pay. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                id: "free", name: "Free", price: "$0", period: "", icon: Globe, iconColor: "text-muted-foreground",
                features: ["1 active trip", "3 AI plans/month", "10 check-ins/month", "Basic Globe", "Standard messaging"],
              },
              {
                id: "plus", name: "Roavr Plus", price: "$7.99", period: "/mo", icon: Zap, iconColor: "text-emerald-500",
                features: ["Unlimited trips & check-ins", "Premium AI itineraries", "Advanced Globe", "Enhanced stories & filters", "Exclusive local offers", "Offline access"],
                popular: true,
              },
              {
                id: "pro", name: "Roavr Pro", price: "$14.99", period: "/mo", icon: Crown, iconColor: "text-amber-500",
                features: ["Everything in Plus", "Group trip planning", "Private Travel Chats (E2E)", "Advanced safety tools", "Creator profile tools", "Priority AI planning"],
              },
            ].map((tier) => (
              <div
                key={tier.id}
                className={`rounded-2xl bg-card p-7 space-y-5 relative transition-all duration-300 ${
                  tier.popular
                    ? "border-2 border-accent shadow-elevated ring-1 ring-accent/20 scale-[1.02]"
                    : "border border-border/50 shadow-soft hover:shadow-elevated"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold gradient-accent text-white px-5 py-1.5 rounded-full shadow-soft whitespace-nowrap">
                    ✨ Most Popular
                  </span>
                )}
                <div className="flex items-center gap-2.5">
                  <div className={`h-10 w-10 rounded-xl ${tier.popular ? "bg-accent/15" : "bg-secondary"} flex items-center justify-center`}>
                    <tier.icon className={`h-5 w-5 ${tier.iconColor}`} />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">{tier.name}</h3>
                </div>
                <div>
                  <span className="font-heading text-4xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${tier.popular ? "bg-accent/10" : "bg-secondary"}`}>
                        <Check className={`h-3 w-3 ${tier.popular ? "text-accent" : "text-muted-foreground"}`} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate("/auth")}
                  className={`w-full h-12 rounded-xl font-semibold ${tier.popular ? "gradient-accent border-0" : ""}`}
                  variant={tier.popular ? "default" : "outline"}
                >
                  {tier.id === "free" ? "Get Started Free" : `Start ${tier.name}`}
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            All plans include a 7-day free trial on paid tiers. Cancel anytime. No lock-in contracts.
          </p>
        </div>
      </section>

      {/* ── Product Benefits (replacing testimonials) ──── */}
      <section className="max-w-5xl mx-auto px-5 py-20 md:py-24">
        <div className="text-center mb-14">
          <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-3">Why Roavr</p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            Built for travelers who<br /><span className="italic text-accent">want more</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Sparkles, title: "AI that understands you", desc: "Not generic templates. Real itineraries matched to your style, budget, pace, and dietary preferences." },
            { icon: Globe, title: "Your travel story, mapped", desc: "Every trip becomes a pin on your globe. Watch your world fill up over time. Share it or keep it private." },
            { icon: Shield, title: "Safe wherever you go", desc: "SafePass gives you destination safety notes, emergency numbers, embassy info, and trusted contact alerts." },
            { icon: Camera, title: "Memories that last", desc: "Stories auto-convert to permanent memory pins. Your travel archive grows without extra effort." },
            { icon: Lock, title: "Privacy you control", desc: "Set visibility per trip, memory, check-in, and story. From fully public to completely private." },
            { icon: Heart, title: "No ads, no spam", desc: "Roavr is built on subscriptions, not advertising. Your travel data stays yours." },
          ].map((b, i) => (
            <div key={b.title} className="rounded-2xl border border-border/40 bg-card p-6 space-y-3 hover:shadow-elevated transition-all animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="h-10 w-10 rounded-xl bg-accent/8 flex items-center justify-center">
                <b.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-heading text-base font-bold text-foreground">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────── */}
      <section className="border-t border-border/30">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.04] to-emerald-500/[0.06]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />

          <div className="relative max-w-3xl mx-auto px-5 py-20 md:py-28 text-center space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
              <Globe className="h-7 w-7 text-accent" />
            </div>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">
              Create your free<br /><span className="italic text-accent">Roavr account</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Start planning smarter, exploring deeper, and remembering every trip. Your world is waiting.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gradient-accent border-0 text-base px-12 py-6 rounded-2xl gap-2 font-semibold shadow-elevated hover:shadow-lg transition-shadow">
              Start Exploring — It's Free <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-xs text-muted-foreground">No credit card required · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border/30 bg-card">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={miloMascot} alt="Roavr" className="h-6 w-6 rounded-md" />
            <span className="font-heading font-bold text-foreground">Roavr</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Roavr. Your world, one trip at a time.</p>
        </div>
      </footer>
    </div>
  );
}
