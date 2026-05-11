import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Mail, Lock, User, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import api from "../services/api";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(location.state?.showVerification ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    full_name: "",
    password: "",
    repeat_password: "",
    code: "",
  });

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential.idToken;

      const res = await api.post("/api/auth/google/", { id_token: idToken });
      const { tokens, user } = res.data;

      await login(user, tokens);
      localStorage.setItem("display_name", user.full_name);
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.detail || t("register.googleFailed"));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.repeat_password) return setError(t("register.passwordsMismatch"));
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/register/", {
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        repeat_password: formData.repeat_password,
      });
      if (formData.full_name?.trim()) localStorage.setItem("display_name", formData.full_name.trim());
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || t("register.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/verify-email/", { email: formData.email, code: formData.code });
      navigate("/login", { state: { message: t("register.verifiedMessage") } });
    } catch (err) {
      setError(err.response?.data?.detail || t("register.invalidCode"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] px-4 py-8 relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-5%] right-[-5%] w-[35%] h-[35%] bg-blue-100/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-amber-100/40 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-[380px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white px-8 py-7 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 text-center">
          <header className="mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
              {step === 1 ? t("register.title") : t("register.checkInbox")}
            </h2>
          </header>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0" /> {error}
            </div>
          )}

          {step === 1 && (
            <>
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
                <span className="relative bg-white px-3">{t("register.orSignUpManually")}</span>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input type="text" required placeholder={t("form.fullName").replace(" *", "")} value={formData.full_name}
                    className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input type="email" required placeholder={t("form.email")} value={formData.email}
                    className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                    onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input type="password" required placeholder={t("login.password")} value={formData.password}
                    className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                    onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input type="password" required placeholder={t("register.repeatPassword")} value={formData.repeat_password}
                    className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                    onChange={e => setFormData({ ...formData, repeat_password: e.target.value })} />
                </div>
                <button disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg">
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <>{t("register.registerButton")} <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyEmail} className="space-y-4 animate-in zoom-in duration-300">
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-4 w-4 h-4 text-blue-500" />
                <input type="text" required maxLength={6} placeholder="000000" value={formData.code}
                  className="w-full pl-10 py-3.5 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 tracking-[0.3em] font-black text-lg text-gray-900"
                  onChange={e => setFormData({ ...formData, code: e.target.value })} />
              </div>
              <button disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all">
                {loading ? t("register.verifying") : t("register.verifyButton")}
              </button>
            </form>
          )}

          <p className="mt-6 text-xs text-gray-400 font-medium">
            {t("register.alreadyMember")} <Link to="/login" className="text-gray-900 font-black hover:text-blue-600 transition-colors">{t("register.logIn")}</Link>
          </p>
          <p className="mt-2 text-xs text-gray-400 font-medium">
            <Link to="/" className="hover:text-gray-600 transition-colors">{t("login.backToHome")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

// import React, { useState, useEffect } from "react";
// import { useNavigate, Link, useLocation } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import { useLanguage } from "../context/LanguageContext";
// import { Mail, Lock, User, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
// import api from "../services/api";

// const Register = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { login } = useAuth();
//   const { t } = useLanguage();
//   const [step, setStep] = useState(location.state?.showVerification ? 2 : 1);
//   const [loading, setLoading] = useState(false);
//   const [googleLoading, setGoogleLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const [formData, setFormData] = useState({
//     email: location.state?.email || "",
//     full_name: "",
//     password: "",
//     repeat_password: "",
//     code: "",
//   });

//   // --- GOOGLE OAUTH LOGIC ---
//   useEffect(() => {
//     /* global google */
//     const handleGoogleResponse = async (response) => {
//       setGoogleLoading(true);
//       try {
//         const res = await api.post("/api/auth/google/", { id_token: response.credential });
//         const { tokens, user } = res.data;
//         await login(user, tokens);
//         localStorage.setItem("display_name", user.full_name);
//         navigate("/app");
//       } catch (err) {
//         setError(err.response?.data?.detail || t("register.googleFailed"));
//       } finally {
//         setGoogleLoading(false);
//       }
//     };

//     const initializeGoogle = () => {
//       if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
//         google.accounts.id.initialize({
//           client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
//           callback: handleGoogleResponse,
//         });
//       }
//     };

//     const script = document.createElement("script");
//     script.src = "https://accounts.google.com/gsi/client";
//     script.async = true;
//     script.onload = initializeGoogle;
//     document.body.appendChild(script);
//   }, [navigate, login]);

//   const handleGoogleClick = () => {
//     /* global google */
//     if (window.google) {
//       google.accounts.id.prompt();
//     }
//   };

//   const handleRegister = async (e) => {
//     e.preventDefault();
//     if (formData.password !== formData.repeat_password) return setError(t("register.passwordsMismatch"));
//     setLoading(true);
//     setError(null);
//     try {
//       await api.post("/api/auth/register/", {
//         email: formData.email,
//         full_name: formData.full_name,
//         password: formData.password,
//         repeat_password: formData.repeat_password,
//       });
//       if (formData.full_name?.trim()) localStorage.setItem("display_name", formData.full_name.trim());
//       setStep(2);
//     } catch (err) {
//       setError(err.response?.data?.detail || t("register.failed"));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleVerifyEmail = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     try {
//       await api.post("/api/auth/verify-email/", { email: formData.email, code: formData.code });
//       navigate("/login", { state: { message: t("register.verifiedMessage") } });
//     } catch (err) {
//       setError(err.response?.data?.detail || t("register.invalidCode"));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] px-4 py-8 relative overflow-hidden">
//       <div className="fixed top-0 left-0 w-full h-full -z-10">
//         <div className="absolute top-[-5%] right-[-5%] w-[35%] h-[35%] bg-blue-100/40 blur-[100px] rounded-full" />
//         <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-amber-100/40 blur-[100px] rounded-full" />
//       </div>

//       <div className="w-full max-w-[380px] animate-in fade-in slide-in-from-bottom-4 duration-700">
//         {/* <div className="flex justify-center gap-3 mb-8">
//           {[1, 2].map((i) => (
//             <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? "w-8 bg-blue-600" : "w-4 bg-gray-200"}`} />
//           ))}
//         </div> */}
//         {/* blue-grey thing on top */}

//         <div className="bg-white px-8 py-7 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 text-center">
//           <header className="mb-6">
//             <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
//               {step === 1 ? t("register.title") : t("register.checkInbox")}
//             </h2>
//           </header>

//           {error && (
//             <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
//               <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0" /> {error}
//             </div>
//           )}

//           {step === 1 && (
//             <>
//               {/* CUSTOM GOOGLE SIGN UP BUTTON */}
//               <div className="flex flex-col gap-2.5 mb-6">
//                 <button
//                   onClick={handleGoogleClick}
//                   disabled={googleLoading}
//                   className="flex items-center justify-center gap-2.5 py-2.5 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm text-gray-700 shadow-sm active:scale-[0.98]"
//                 >
//                   {googleLoading ? (
//                     <Loader2 className="animate-spin w-4 h-4 text-gray-400" />
//                   ) : (
//                     <>
//                       <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
//                         <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
//                         <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
//                         <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
//                         <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
//                       </svg>
//                       {t("login.continueWithGoogle")}
//                     </>
//                   )}
//                 </button>
//               </div>

//               <div className="relative mb-6 text-[9px] font-black uppercase tracking-widest text-gray-300">
//                 <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
//                 <span className="relative bg-white px-3">{t("register.orSignUpManually")}</span>
//               </div>

//               <form onSubmit={handleRegister} className="space-y-3">
//                 <div className="relative">
//                   <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
//                   <input type="text" required placeholder={t("form.fullName").replace(" *", "")} value={formData.full_name}
//                     className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
//                     onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
//                 </div>
//                 <div className="relative">
//                   <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
//                   <input type="email" required placeholder={t("form.email")} value={formData.email}
//                     className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
//                     onChange={e => setFormData({ ...formData, email: e.target.value })} />
//                 </div>
//                 <div className="relative">
//                   <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
//                   <input type="password" required placeholder={t("login.password")} value={formData.password}
//                     className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
//                     onChange={e => setFormData({ ...formData, password: e.target.value })} />
//                 </div>
//                 <div className="relative">
//                   <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
//                   <input type="password" required placeholder={t("register.repeatPassword")} value={formData.repeat_password}
//                     className="w-full pl-10 py-3 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
//                     onChange={e => setFormData({ ...formData, repeat_password: e.target.value })} />
//                 </div>
//                 <button disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg">
//                   {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <>{t("register.registerButton")} <ArrowRight className="w-3.5 h-3.5" /></>}
//                 </button>
//               </form>
//             </>
//           )}

//           {step === 2 && (
//             <form onSubmit={handleVerifyEmail} className="space-y-4 animate-in zoom-in duration-300">
//               <div className="relative">
//                 <ShieldCheck className="absolute left-3.5 top-4 w-4 h-4 text-blue-500" />
//                 <input type="text" required maxLength={6} placeholder="000000" value={formData.code}
//                   className="w-full pl-10 py-3.5 px-4 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 tracking-[0.3em] font-black text-lg text-gray-900"
//                   onChange={e => setFormData({ ...formData, code: e.target.value })} />
//               </div>
//               <button disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all">
//                 {loading ? t("register.verifying") : t("register.verifyButton")}
//               </button>
//             </form>
//           )}

//           <p className="mt-6 text-xs text-gray-400 font-medium">
//             {t("register.alreadyMember")} <Link to="/login" className="text-gray-900 font-black hover:text-blue-600 transition-colors">{t("register.logIn")}</Link>
//           </p>
//           <p className="mt-2 text-xs text-gray-400 font-medium">
//             <Link to="/" className="hover:text-gray-600 transition-colors">{t("login.backToHome")}</Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Register;