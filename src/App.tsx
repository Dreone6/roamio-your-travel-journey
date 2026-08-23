import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import AuthGate from "@/components/AuthGate";
import RouteFallback from "@/components/RouteFallback";
import Auth from "@/pages/Auth";
import HomePage from "@/pages/HomePage";
import NotFound from "@/pages/NotFound";

// Route-level code splitting: keeps the 3D globe, camera and planning bundles
// out of the initial download.
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const TripsPage = lazy(() => import("@/pages/TripsPage"));
const TripDetailPage = lazy(() => import("@/pages/TripDetailPage"));
const DiscoverPage = lazy(() => import("@/pages/DiscoverPage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const GlobePage = lazy(() => import("@/pages/GlobePage"));
const CheckInPage = lazy(() => import("@/pages/CheckInPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const SubscriptionPage = lazy(() => import("@/pages/SubscriptionPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const ReferralPage = lazy(() => import("@/pages/ReferralPage"));
const InboxPage = lazy(() => import("@/pages/InboxPage"));
const ConversationPage = lazy(() => import("@/pages/ConversationPage"));
const NewMessagePage = lazy(() => import("@/pages/NewMessagePage"));
const CameraPage = lazy(() => import("@/pages/CameraPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const PrivacySettingsPage = lazy(() => import("@/pages/PrivacySettingsPage"));
const SafePassPage = lazy(() => import("@/pages/SafePassPage"));
const SurpriseMePage = lazy(() => import("@/pages/SurpriseMePage"));
const SharedItineraryPage = lazy(() => import("@/pages/SharedItineraryPage"));
const BuildWorldPage = lazy(() => import("@/pages/BuildWorldPage"));
const PassportPage = lazy(() => import("@/pages/PassportPage"));
const TravelerProfilePage = lazy(() => import("@/pages/TravelerProfilePage"));
const NearbyPage = lazy(() => import("@/pages/NearbyPage"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<AuthGate />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
              <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
              <Route path="/checkin" element={<ProtectedRoute><CheckInPage /></ProtectedRoute>} />
              <Route path="/privacy" element={<ProtectedRoute><PrivacySettingsPage /></ProtectedRoute>} />
              <Route path="/safety" element={<ProtectedRoute><SafePassPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
              <Route path="/messages/new" element={<ProtectedRoute><NewMessagePage /></ProtectedRoute>} />
              <Route path="/messages/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
              <Route path="/camera" element={<ProtectedRoute><CameraPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              {/* Stories live in the Home stories row + viewer. */}
              <Route path="/stories" element={<Navigate to="/home" replace />} />
              {/* The real, ranked travel feed lives on Home. */}
              <Route path="/feed" element={<Navigate to="/home" replace />} />
              <Route path="/surprise" element={<ProtectedRoute><SurpriseMePage /></ProtectedRoute>} />
              <Route path="/build-world" element={<ProtectedRoute><BuildWorldPage /></ProtectedRoute>} />
              <Route path="/travel-history" element={<Navigate to="/build-world" replace />} />
              <Route path="/passport" element={<ProtectedRoute><PassportPage /></ProtectedRoute>} />
              <Route path="/passport/:userId" element={<ProtectedRoute><PassportPage /></ProtectedRoute>} />
              <Route path="/u/:handle" element={<ProtectedRoute><TravelerProfilePage /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
              <Route path="/nearby" element={<ProtectedRoute><NearbyPage /></ProtectedRoute>} />
              <Route path="/i/:token" element={<SharedItineraryPage />} />
              <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/trips" element={<TripsPage />} />
                <Route path="/trips/:id" element={<TripDetailPage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/globe" element={<GlobePage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              <Route path="/plan" element={<Navigate to="/trips" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
