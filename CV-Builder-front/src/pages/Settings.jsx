import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Globe, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import DashboardHeader from "../components/DashboardHeader";

const Settings = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { setLanguage, t } = useLanguage();

  const u = user?.user ?? user;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFullName(u?.full_name ?? localStorage.getItem("display_name") ?? "");
    setPhone(u?.phone ?? "");
    const lang = u?.preferred_language ?? "en";
    setPreferredLanguage(lang === "ka" ? "ka" : "en");
  }, [u?.full_name, u?.phone, u?.preferred_language]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await api.patch("/api/auth/me/", {
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        preferred_language: preferredLanguage,
      });
      if (fullName.trim()) {
        localStorage.setItem("display_name", fullName.trim());
      }
      setLanguage(preferredLanguage);
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardHeader />
      <div className="pt-24 pb-12 px-4">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate("/app")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} /> {t("templates.backToDashboard") || "Back to Dashboard"}
        </button>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
          <h1 className="text-2xl font-black text-gray-900 mb-2">
            {t("resume.personalInfo") || "Profile Settings"}
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Update your profile information. Changes are saved to your account.
          </p>

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">Profile updated successfully.</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
              <p className="text-sm font-semibold text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                {t("form.fullName") || "Full Name"}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-12 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                {t("form.phone") || "Phone"}
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+995..."
                  className="w-full pl-12 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Preferred Language
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full pl-12 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium appearance-none cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="ka">ქართული (Georgian)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Settings;
