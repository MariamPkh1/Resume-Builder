import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import api from "../services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Extract uid and token from URL (?uid=...&token=...)
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/password/reset/", {
        uid: uid,
        token: token,
        new_password: password
      });
      alert("Password updated successfully!");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Link expired or invalid. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-black text-gray-900 mb-2">New Password</h2>
        <p className="text-gray-500 mb-8 text-sm">Please enter and confirm your new secure password.</p>
        
        <form onSubmit={handleReset} className="space-y-4">
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
            disabled={loading || !uid || !token}
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