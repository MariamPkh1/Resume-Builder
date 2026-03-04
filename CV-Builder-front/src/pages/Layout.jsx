import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const Layout = () => {
  const { user } = useAuth();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    // Respect explicit language choice stored in localStorage;
    // only fall back to the user's preferred_language if nothing is stored.
    try {
      const stored = localStorage.getItem("nebula_lang");
      if (
        !stored &&
        user?.preferred_language &&
        (user.preferred_language === "en" || user.preferred_language === "ka")
      ) {
        setLanguage(user.preferred_language);
      }
    } catch (_) {
      // If localStorage is unavailable, fall back silently without blocking UI
    }
  }, [user?.preferred_language, setLanguage]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
