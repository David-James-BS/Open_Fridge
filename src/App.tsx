import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import RoleSelection from "./pages/RoleSelection";
import ConsumerAuth from "./pages/auth/ConsumerAuth";
import VendorAuth from "./pages/auth/VendorAuth";
import OrganisationAuth from "./pages/auth/OrganisationAuth";
import AdminAuth from "./pages/auth/AdminAuth";
import ConsumerDashboard from "./pages/consumer/ConsumerDashboard";
import OrganisationDashboard from "./pages/organisation/OrganisationDashboard";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Header />
          <Routes>
            <Route path="/" element={<RoleSelection />} />
            <Route path="/auth/consumer" element={<ConsumerAuth />} />
            <Route path="/auth/vendor" element={<VendorAuth />} />
            <Route path="/auth/organisation" element={<OrganisationAuth />} />
            <Route path="/admin" element={<AdminAuth />} />
            <Route path="/consumer/dashboard" element={<ConsumerDashboard />} />
            <Route path="/organisation/dashboard" element={<OrganisationDashboard />} />
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
