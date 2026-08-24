import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativeShell } from "@/lib/native/bootstrap";

// No-ops on web; configures status bar + keyboard inside the Capacitor shell.
void initNativeShell();

createRoot(document.getElementById("root")!).render(<App />);
