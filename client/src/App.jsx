import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import ServiceDetails from "./pages/ServiceDetails";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerProfile from "./pages/CustomerProfile";
import CustomerWallet from "./pages/CustomerWallet";
import ProviderDashboard from "./pages/ProviderDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalWhatsApp from "./components/GlobalWhatsApp";
import ScrollToTop from "./components/ScrollToTop";

// Static Pages
import About from "./pages/static/About";
import PrivacyPolicy from "./pages/static/PrivacyPolicy";
import Terms from "./pages/static/Terms";
import Contact from "./pages/static/Contact";
import Help from "./pages/static/Help";
import BecomeProvider from "./pages/static/BecomeProvider";

// Smart redirect based on auth state and role
const RoleRedirect = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (token) {
    if (role === "provider") return <Navigate to="/provider" replace />;
    if (role === "admin") return <Navigate to="/admin" replace />;
  }
  
  // Default for customer and unauthenticated users is the public homepage
  return <Navigate to="/home" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        <Route path="/become-a-professional" element={<BecomeProvider />} />

        {/* Customer routes (now public for browsing) */}
        <Route path="/home" element={<Home />} />
        <Route path="/services/:slug" element={<ServiceDetails />} />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-wallet"
          element={
            <ProtectedRoute roles={["customer"]}>
              <CustomerWallet />
            </ProtectedRoute>
          }
        />

        {/* Provider routes */}
        <Route
          path="/provider"
          element={
            <ProtectedRoute roles={["provider"]}>
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalWhatsApp />
    </BrowserRouter>
  );
}

export default App;