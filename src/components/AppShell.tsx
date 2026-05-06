import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}
