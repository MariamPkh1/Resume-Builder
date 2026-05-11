import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Lock, ShieldCheck } from "lucide-react";
import api from "../services/api";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!success) return;
    const timeoutId = setTimeout(() => {
      navigate("/login", {
        state: { message: "Password updated successfully. Please sign in." },
      });
    }, 1400);
    return () => clearTimeout(timeoutId);
  }, [success, navigate]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/api/auth/reset-password/", {
        email,
        code,
        new_password: password,
        repeat_password: confirmPassword,
      });
      setSuccess("Password updated successfully. Redirecting to login...");
    } catch (err) {
      setError(err.response?.data?.detail || "Link expired or invalid. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {success && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-700">{success}</p>
          </div>
        </div>
      )}
      <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-black text-gray-900 mb-2">New Password</h2>
        <p className="text-gray-500 mb-8 text-sm">Enter your email, reset code, and your new password.</p>
        
        <form onSubmit={handleReset} className="space-y-4">
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              required
              type="email"
              className="w-full pl-10 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              required
              type="text"
              maxLength={6}
              className="w-full pl-10 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="6-digit Reset Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input 
              required
              type="password"
              className="w-full pl-10 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none" 
              placeholder="New Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input 
              required
              type="password"
              className="w-full pl-10 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none" 
              placeholder="Confirm New Password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}
          
          <button 
            disabled={loading}
            className="w-full py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;