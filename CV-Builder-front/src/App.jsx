import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Preview from "./pages/Preview";
import TemplateSelection from "./pages/TemplateSelection";
import Login from "./pages/Login"; // New component
import Register from "./pages/Register"; // New component
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./routes/ProtectedRoute"; 
import { AuthProvider } from "./context/AuthContext"; 
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import Contact from "./pages/Contact";
import UniversalBuilder from "./components/builder/UniversalBuilder";


const App = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/password-reset" element={<ResetPassword />} />
        <Route path="/templates" element={<TemplateSelection />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />

        {/* Protected Routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="builder/:template/:resumeId" element={<UniversalBuilder />} />
        </Route>

        <Route path="view/:resumeId" element={<Preview />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;