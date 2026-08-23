import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="text-center space-y-5 max-w-xs">
        <div className="mx-auto h-20 w-20 rounded-full bg-accent/8 flex items-center justify-center">
          <Compass className="h-10 w-10 text-accent/60" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-bold text-foreground">Lost?</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This page doesn't exist — but your next adventure does.
          </p>
        </div>
        <Button onClick={() => navigate("/home")} className="gradient-accent border-0 rounded-xl h-11 px-8 font-bold text-sm">
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
