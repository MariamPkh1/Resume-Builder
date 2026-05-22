import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import api from "../services/api";
import { useLanguage } from "../context/LanguageContext";

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password/", { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || t("forgotPassword.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {t("forgotPassword.checkEmailTitle")}
          </h2>
          <p className="text-gray-500 mb-8">
            {t("forgotPassword.checkEmailBeforeEmail")}{" "}
            <span className="font-semibold text-gray-700">{email}</span>,{" "}
            {t("forgotPassword.checkEmailAfterEmail")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/password-reset", { state: { email } })}
            className="text-amber-600 font-bold hover:underline"
          >
            {t("forgotPassword.enterResetCode")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-gray-400 hover:text-amber-600 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={16} /> {t("forgotPassword.backToLogin")}
        </button>
        <h2 className="text-3xl font-black text-gray-900 mb-2">{t("forgotPassword.title")}</h2>
        <p className="text-gray-500 mb-8 text-sm">{t("forgotPassword.instructions")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              required
              type="email"
              className="w-full pl-10 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder={t("forgotPassword.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
          >
            {loading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
