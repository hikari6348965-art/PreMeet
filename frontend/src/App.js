import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnly } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Meetings from "./pages/Meetings";
import BriefViewer from "./pages/BriefViewer";
import ClientMemory from "./pages/ClientMemory";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Billing from "./pages/Billing";
import MeetingRoom from "./pages/MeetingRoom";
import GuestJoin from "./pages/GuestJoin";
import AuthCallback from "./pages/AuthCallback";

function AppRoutes() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/join/:meetingId" element={<GuestJoin />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="meetings" element={<Meetings />} />
              <Route path="meetings/:id" element={<BriefViewer />} />
              <Route path="meetings/:id/room" element={<MeetingRoom />} />
              <Route path="clients" element={<ClientMemory />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="settings" element={<Settings />} />
              <Route path="billing" element={<Billing />} />
              <Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            </Route>
          </Routes>
  );
}

function App() {
  useEffect(() => { document.title = "PreMeet — Walk into every meeting prepared"; }, []);
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
