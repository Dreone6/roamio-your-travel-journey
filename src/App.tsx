import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import HomePage from "@/pages/HomePage";
import TripsPage from "@/pages/TripsPage";
import DiscoverPage from "@/pages/DiscoverPage";
import GlobePage from "@/pages/GlobePage";
import CheckInPage from "@/pages/CheckInPage";
import ProfilePage from "@/pages/ProfilePage";
import TripPlannerPage from "@/pages/TripPlannerPage";
import TripDetailPage from "@/pages/TripDetailPage";
import AdminPanel from "@/pages/AdminPanel";
import SubscriptionPage from "@/pages/SubscriptionPage";
import SettingsPage from "@/pages/SettingsPage";
import ReferralPage from "@/pages/ReferralPage";
import InboxPage from "@/pages/InboxPage";
import ConversationPage from "@/pages/ConversationPage";
import NewMessagePage from "@/pages/NewMessagePage";
import CameraPage from "@/pages/CameraPage";
import StoriesPage from "@/pages/StoriesPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SocialFeedPage from "@/pages/SocialFeedPage";
import NotFound from "@/pages/NotFound";
import PrivacySettingsPage from "@/pages/PrivacySettingsPage";
import SafePassPage from "@/pages/SafePassPage";
import SurpriseMePage from "@/pages/SurpriseMePage";
import SharedItineraryPage from "@/pages/SharedItineraryPage";
import TravelHistoryPage from "@/pages/TravelHistoryPage";
import AuthGate from "@/components/AuthGate";
import PartnerProtectedRoute from "@/components/PartnerProtectedRoute";
import PartnerPortal from "@/pages/partners/PartnerPortal";
import PartnerDashboard from "@/pages/partners/PartnerDashboard";
import PartnerAnalytics from "@/pages/partners/PartnerAnalytics";
import PartnerOffers from "@/pages/partners/PartnerOffers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AuthGate />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
            
            <Route path="/privacy" element={<ProtectedRoute><PrivacySettingsPage /></ProtectedRoute>} />
            <Route path="/safety" element={<ProtectedRoute><SafePassPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
            <Route path="/messages/new" element={<ProtectedRoute><NewMessagePage /></ProtectedRoute>} />
            <Route path="/messages/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
            <Route path="/camera" element={<ProtectedRoute><CameraPage /></ProtectedRoute>} />
            <Route path="/stories" element={<ProtectedRoute><StoriesPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><SocialFeedPage /></ProtectedRoute>} />
            <Route path="/surprise" element={<ProtectedRoute><SurpriseMePage /></ProtectedRoute>} />
            <Route path="/travel-history" element={<ProtectedRoute><TravelHistoryPage /></ProtectedRoute>} />
            <Route path="/i/:token" element={<SharedItineraryPage />} />
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/globe" element={<GlobePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/checkin" element={<CheckInPage />} />
            </Route>
            <Route path="/plan" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<TripsPage />} />
            </Route>
            <Route path="/partners" element={<PartnerPortal />} />
            <Route path="/partners/dashboard" element={<PartnerProtectedRoute><PartnerDashboard /></PartnerProtectedRoute>} />
            <Route path="/partners/analytics" element={<PartnerProtectedRoute><PartnerAnalytics /></PartnerProtectedRoute>} />
            <Route path="/partners/offers" element={<PartnerProtectedRoute><PartnerOffers /></PartnerProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
