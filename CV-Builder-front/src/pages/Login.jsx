import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: 'idle', message: location.state?.message || '' });
  const [googleLoading, setGoogleLoading] = useState(false);

  // --- GOOGLE OAUTH LOGIC ---
  useEffect(() => {
    /* global google */
    const handleGoogleResponse = async (response) => {
      setGoogleLoading(true);
      try {
        const res = await api.post("/api/auth/google/", { id_token: response.credential });
        const { user, tokens } = res.data;
        const { access, refresh } = tokens;
        await login({ email: user.email }, { access, refresh });
        localStorage.setItem("display_name", user.full_name);
        navigate("/app");
      } catch (err) {
        setStatus({ type: 'error', message: err.response?.data?.detail || t("login.googleFailed") });
      } finally {
        setGoogleLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
      }
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);
  }, [navigate, login]);

  const handleGoogleClick = () => {
    /* global google */
    if (window.google) {
      google.accounts.id.prompt();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: '' });
    try {
      const res = await api.post("/api/auth/token/", { email, password });
      const { access, refresh } = res.data;
      await login({ email }, { access, refresh });
      setStatus({ type: 'success', message: t("login.successMessage") });
      navigate("/app");
    } catch (err) {
      let errorMessage = t("login.invalidCredentials");
      if (err.response?.status === 401 && err.response?.data?.detail?.includes("active")) {
        errorMessage = t("login.accountNotVerified");
        navigate("/signup", { state: { email, showVerification: true } });
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setStatus({ type: 'error', message: errorMessage });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] px-4 py-8 relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-5%] right-[-5%] w-[35%] h-[35%] bg-blue-100/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-amber-100/40 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-[380px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white px-8 py-7 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1.5">{t("login.title")}</h2>
            <p className="text-gray-400 text-sm font-medium italic">{t("login.subtitle")}</p>
          </div>

          {/* CUSTOM GOOGLE BUTTON — matches Register */}
          <div className="flex flex-col gap-2.5 mb-6">
            <button
              onClick={handleGoogleClick}
              disabled={googleLoading}
              className="flex items-center justify-center gap-2.5 py-2.5 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm text-gray-700 shadow-sm active:scale-[0.98]"
            >
              {googleLoading ? (
                <Loader2 className="animate-spin w-4 h-4 text-gray-400" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  {t("login.continueWithGoogle")}
                </>
              )}
            </button>
          </div>

          <div className="relative mb-6 text-[9px] font-black uppercase tracking-widest text-gray-300">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
            <span className="relative bg-white px-3">{t("login.orUseCredentials")}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className={`absolute left-3.5 top-3.5 w-4 h-4 transition-colors ${email ? 'text-blue-500' : 'text-gray-400'}`} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("form.email")}
                className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-sm" required />
            </div>

            <div className="relative">
              <Lock className={`absolute left-3.5 top-3.5 w-4 h-4 transition-colors ${password ? 'text-blue-500' : 'text-gray-400'}`} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("login.password")}
                className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-sm" required />
              <Link to="/forgot-password" className="block text-right text-xs font-semibold text-gray-400 hover:text-blue-600 mt-1 transition-colors">
                {t("login.forgotPassword")}
              </Link>
            </div>

            {status.message && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${status.type === 'error' ? 'bg-red-50 text-red-600 animate-shake' : 'bg-green-50 text-green-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`} /> {status.message}
              </div>
            )}

            <button type="submit" disabled={status.type === 'loading' || googleLoading} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-gray-200">
              {status.type === 'loading' ? <Loader2 className="animate-spin w-4 h-4" /> : <>{t("login.signIn")} <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400 font-medium">{t("login.newToNebula")} <Link to="/signup" className="text-gray-900 font-black hover:text-blue-600">{t("login.createAccount")}</Link></p>
          <p className="mt-2 text-center text-xs text-gray-400 font-medium">
            <Link to="/" className="hover:text-gray-600 transition-colors">{t("login.backToHome")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;