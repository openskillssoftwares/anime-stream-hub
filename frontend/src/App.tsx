import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { SiteFooter } from "@/components/SiteFooter";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";
import Watch from "./pages/Watch";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Browse from "./pages/Browse";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DMCA from "./pages/DMCA";
import Donation from "./pages/Donation";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import FloatingAIButton from "@/components/FloatingAIButton";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics />
      <BrowserRouter>
        <AuthProvider>
          <InteractiveBackground />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dmca" element={<DMCA />} />
            <Route path="/donation" element={<Donation />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SiteFooter />
          <FloatingAIButton />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
