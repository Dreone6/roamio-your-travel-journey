import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, Map, MapPin, Globe, Trophy, Zap, Crown, Star, ArrowRight, Check } from "lucide-react";

const FEATURES = [
  { icon: Map, title: "AI Trip Planning", description: "Generate personalized itineraries based on your style, budget, and interests — powered by AI." },
  { icon: MapPin, title: "Check In Anywhere", description: "Drop a pin at any destination, snap a photo, and unlock nearby offers and challenges." },
  { icon: Globe, title: "Personal Globe", description: "Watch your interactive world map fill up with every new city and country you visit." },
  { icon: Trophy, title: "Earn Badges", description: "Complete challenges and milestones to earn unique travel badges and build your streak." },
  { icon: Zap, title: "Local Offers", description: "Discover deals from restaurants, experiences, and stays near you — just by checking in." },
  { icon: Star, title: "Smart Checklists", description: "AI-generated packing lists and reminders customized to your destination and trip length." },
];

const TESTIMONIALS = [
  { name: "Sarah M.", location: "New York", text: "Roamio planned my entire Bali trip in seconds. The AI itinerary was spot on!", avatar: "🧑‍💼" },
  { name: "James L.", location: "London", text: "I love checking in and watching my globe fill up. It's gamified travel done right.", avatar: "👨‍🎨" },
  { name: "Priya K.", location: "Mumbai", text: "The nearby offers feature saved me so much money on my last trip to Barcelona.", avatar: "👩‍💻" },
];

const TIERS = [
  { name: "Free", price: "$0", period: "", features: ["3 trips planned", "5 check-ins/month", "Globe view", "Basic checklist", "See offers"], icon: Compass },
  { name: "Roamio Plus", price: "$9.99", period: "/mo", features: ["Unlimited trips", "Unlimited check-ins", "Premium AI itineraries", "Exclusive offers", "Badge customization"], icon: Zap, popular: true },
  { name: "Roamio Pro", price: "$19.99", period: "/mo", features: ["Everything in Plus", "Group trip planning", "Offline maps", "Advanced analytics", "Early access"], icon: Crown },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Compass className="h-7 w-7 text-accent" />
            <span className="font-heading text-xl font-bold text-foreground">Roamio</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
            <Button size="sm" onClick={() => navigate("/auth")}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
        <div className="relative max-w-4xl mx-auto px-5 py-20 md:py-32 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 text-accent px-4 py-1.5 text-xs font-medium animate-fade-in">
            <Zap className="h-3.5 w-3.5" /> AI-Powered Travel Companion
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Your world,<br />one trip at a time.
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Plan AI-powered trips, check in at destinations, earn badges, and discover local offers — all in one beautifully crafted travel app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-base px-8 py-6 rounded-xl gap-2">
              Start Exploring <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 py-6 rounded-xl" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              See Features
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Everything you need to travel smarter</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">From planning to exploring, Roamio is your all-in-one travel companion.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:border-accent/40 transition-all animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <f.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-secondary/30 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Loved by travelers worldwide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.avatar}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-5 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Simple pricing, no surprises</h2>
          <p className="text-muted-foreground mt-3">Start free, upgrade when you're ready.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div key={tier.name} className={`rounded-2xl border-2 bg-card p-6 space-y-5 relative ${tier.popular ? "border-accent shadow-lg" : "border-border"}`}>
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-accent text-accent-foreground px-4 py-1 rounded-full">Most Popular</span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-accent" />
                  <h3 className="font-heading font-semibold text-lg text-foreground">{tier.name}</h3>
                </div>
                <div>
                  <span className="font-heading text-3xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-accent shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => navigate("/auth")} className="w-full" variant={tier.popular ? "default" : "outline"}>
                  {tier.name === "Free" ? "Get Started Free" : `Start ${tier.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-3xl mx-auto px-5 py-16 md:py-24 text-center space-y-6">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Ready to explore the world?</h2>
          <p className="text-muted-foreground text-lg">Join thousands of travelers using Roamio to plan, explore, and remember every adventure.</p>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-base px-10 py-6 rounded-xl gap-2">
            Create Free Account <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-accent" />
            <span className="font-heading font-semibold text-foreground">Roamio</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Roamio. Your world, one trip at a time.</p>
        </div>
      </footer>
    </div>
  );
}
