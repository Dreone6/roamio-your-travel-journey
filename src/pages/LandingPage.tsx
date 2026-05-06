import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Map, MapPin, Globe, Trophy, Zap, Crown, Star, ArrowRight, Check, Sparkles } from "lucide-react";
import roavrLogo from "@/assets/roavr-logo.png";
import roavrIcon from "@/assets/roavr-icon.jpeg";

const FEATURES = [
  { icon: Map, title: "AI Trip Planning", description: "Generate personalized itineraries based on your style, budget, and interests — powered by AI." },
  { icon: MapPin, title: "Check In Anywhere", description: "Drop a pin at any destination, snap a photo, and unlock nearby offers and challenges." },
  { icon: Globe, title: "Personal Globe", description: "Watch your interactive world map fill up with every new city and country you visit." },
  { icon: Trophy, title: "Earn Badges", description: "Complete challenges and milestones to earn unique travel badges and build your streak." },
  { icon: Zap, title: "Local Offers", description: "Discover deals from restaurants, experiences, and stays near you — just by checking in." },
  { icon: Sparkles, title: "Smart Checklists", description: "AI-generated packing lists and reminders customized to your destination and trip length." },
];

const TESTIMONIALS = [
  { name: "Sarah M.", location: "New York", text: "Roavr planned my entire Bali trip in seconds. The AI itinerary was spot on!", avatar: "🧑‍💼" },
  { name: "James L.", location: "London", text: "I love checking in and watching my globe fill up. It's gamified travel done right.", avatar: "👨‍🎨" },
  { name: "Priya K.", location: "Mumbai", text: "The nearby offers feature saved me so much money on my last trip to Barcelona.", avatar: "👩‍💻" },
];

const TIERS = [
  { name: "Free", price: "$0", period: "", features: ["3 trips planned", "5 check-ins/month", "Globe view", "Basic checklist", "See offers"], icon: Globe },
  { name: "Roavr Plus", price: "$9.99", period: "/mo", features: ["Unlimited trips", "Unlimited check-ins", "Premium AI itineraries", "Exclusive offers", "Badge customization"], icon: Zap, popular: true },
  { name: "Roavr Pro", price: "$19.99", period: "/mo", features: ["Everything in Plus", "Group trip planning", "Offline maps", "Advanced analytics", "Early access"], icon: Crown },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <img src={roavrIcon} alt="Roavr" className="h-8 w-8 rounded-lg" />
            <span className="font-heading text-xl font-bold text-foreground tracking-tight">Roavr</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm font-medium">Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-accent border-0 rounded-xl px-5 text-sm font-semibold">Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-accent/[0.04]" />
        <div className="absolute top-20 -right-40 w-96 h-96 rounded-full bg-accent/[0.06] blur-3xl" />
        <div className="absolute -bottom-20 -left-40 w-96 h-96 rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-5 py-24 md:py-36 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/8 text-accent px-5 py-2 text-xs font-semibold tracking-wide uppercase animate-fade-in">
            <Zap className="h-3.5 w-3.5" /> AI-Powered Travel Companion
          </div>
          <h1 className="font-heading text-5xl md:text-7xl font-bold text-foreground leading-[1.1] tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Your world,<br /><span className="italic text-accent">one trip</span> at a time.
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Plan AI-powered trips, check in at destinations, earn badges, and discover local offers — all in one beautifully crafted travel app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" onClick={() => navigate("/auth")} className="gradient-accent border-0 text-base px-10 py-6 rounded-2xl gap-2 font-semibold shadow-elevated hover:shadow-lg transition-shadow">
              Start Exploring <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-10 py-6 rounded-2xl font-medium border-border/60" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See Features
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center mb-16">
          <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-3">Features</p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">Everything you need to<br />travel <span className="italic">smarter</span></h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-base">From planning to exploring, Roavr is your all-in-one travel companion.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="group rounded-2xl border border-border/60 bg-card p-7 space-y-4 hover:shadow-elevated hover:border-accent/30 transition-all duration-300 animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <f.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-b from-secondary/40 to-secondary/20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-3">Testimonials</p>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">Loved by travelers <span className="italic">worldwide</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border/50 bg-card p-7 space-y-5 shadow-soft">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.avatar}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-3">Pricing</p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">Simple pricing, <span className="italic">no surprises</span></h2>
          <p className="text-muted-foreground mt-4">Start free, upgrade when you're ready.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div key={tier.name} className={`rounded-2xl bg-card p-7 space-y-6 relative transition-all duration-300 ${tier.popular ? "border-2 border-accent shadow-elevated ring-1 ring-accent/20 scale-[1.02]" : "border border-border/60 shadow-soft hover:shadow-elevated"}`}>
                {tier.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold gradient-accent text-accent-foreground px-5 py-1.5 rounded-full shadow-soft">Most Popular</span>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">{tier.name}</h3>
                </div>
                <div>
                  <span className="font-heading text-4xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                      <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => navigate("/auth")} className={`w-full h-12 rounded-xl font-semibold ${tier.popular ? "gradient-accent border-0" : ""}`} variant={tier.popular ? "default" : "outline"}>
                  {tier.name === "Free" ? "Get Started Free" : `Start ${tier.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-accent/[0.06]" />
          <div className="relative max-w-3xl mx-auto px-5 py-20 md:py-28 text-center space-y-6">
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">Ready to explore<br />the <span className="italic text-accent">world</span>?</h2>
            <p className="text-muted-foreground text-lg">Join thousands of travelers using Roavr to plan, explore, and remember every adventure.</p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gradient-accent border-0 text-base px-12 py-6 rounded-2xl gap-2 font-semibold shadow-elevated">
              Create Free Account <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={roavrIcon} alt="Roavr" className="h-6 w-6 rounded-md" />
            <span className="font-heading font-bold text-foreground">Roavr</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Roavr. Your world, one trip at a time.</p>
        </div>
      </footer>
    </div>
  );
}
