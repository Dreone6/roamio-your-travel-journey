import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable";
import miloMascot from "@/assets/roavr-pin.png";

export default function Auth() {
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { signUp, signIn } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <img src={miloMascot} alt="Roavr" className="h-12 w-12 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (user) return <Navigate to="/home" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, name);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome to Roavr", description: "Account created. Let's get you started." });
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      }
    }

    setSubmitting(false);
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({
        title: `${provider === "google" ? "Google" : "Apple"} sign-in failed`,
        description: result.error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-7">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center mb-2">
            <img src={miloMascot} alt="Roavr" className="h-20 w-20" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">Roavr</h1>
          <p className="text-muted-foreground text-sm">Your world, one trip at a time.</p>
        </div>

        {/* Frictionless sign-in: SSO first */}
        <div className="space-y-2.5">
          <Button
            type="button"
            className="w-full h-12 rounded-xl text-sm font-semibold bg-black text-white hover:bg-black/90 gap-2"
            onClick={() => handleOAuth("apple")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.365 1.43c0 1.14-.466 2.23-1.234 3.02-.81.85-2.13 1.5-3.21 1.41-.13-1.13.43-2.32 1.18-3.07.83-.85 2.24-1.47 3.26-1.36zM21 17.46c-.6 1.36-.88 1.97-1.65 3.18-1.07 1.69-2.58 3.79-4.45 3.81-1.66.02-2.09-1.08-4.34-1.07-2.25.01-2.72 1.09-4.38 1.07-1.87-.02-3.3-1.92-4.37-3.6C-.86 17.5-.45 11.62 2.52 9.21c1.06-.86 2.4-1.32 3.78-1.34 1.65-.03 3.21 1.11 4.34 1.11 1.13 0 3-1.37 5.06-1.17.86.04 3.27.35 4.82 2.62-4.18 2.29-3.5 8.27.48 7.03z"/>
            </svg>
            Continue with Apple
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl text-sm font-semibold gap-2"
            onClick={() => handleOAuth("google")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or use email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="hello@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 rounded-xl"
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold gradient-accent border-0" disabled={submitting}>
            {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          We'll never ask for location or photo access until you actually need it.
        </p>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New to Roavr?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-accent font-semibold hover:underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
