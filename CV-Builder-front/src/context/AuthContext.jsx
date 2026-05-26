import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Logout Function — calls backend to invalidate refresh token, then clears local state
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await api.post("/api/auth/logout/", { refresh: refreshToken });
      } catch {
        // Ignore errors — we still clear local state (token may already be invalid)
      }
    }
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("display_name");
     window.location.href = "/login";
  }, []);

  // 2. Profile Refresh (Syncs Tier/Quotas)
  const refreshUser = useCallback(async () => {
    try {
      // Fetches current user status, tier, and AI quotas
      const response = await api.get("/api/auth/me/"); 
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
    }
  }, [logout]);

  // 3. JWT Refresh Interceptor
  // This watches every response. If a 401 (Expired) happens, it tries to refresh once.
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const authPublicPaths = [
          "/api/auth/login/",
          "/api/auth/register/",
          "/api/auth/verify-email/",
          "/api/auth/token/",
          "/api/auth/token/refresh/",
          "/api/auth/google/",
          "/api/auth/forgot-password/",
          "/api/auth/reset-password/",
        ];
        const isAuthPublicRequest = authPublicPaths.some((path) =>
          originalRequest?.url?.includes(path)
        );

        // Do not auto-refresh/logout for expected auth failures
        // (e.g. wrong login credentials should stay on the form with an error message).
        if (isAuthPublicRequest) {
          return Promise.reject(error);
        }
        
        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = localStorage.getItem("refresh_token");
            if (!refreshToken) throw new Error("No refresh token");

            // Call the refresh endpoint from Guide Section 1
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/token/refresh/`,
              { refresh: refreshToken }
          );
            const { access } = res.data;
            
            localStorage.setItem("access_token", access);
            
            // Retry the original request with the new token
            originalRequest.headers["Authorization"] = `Bearer ${access}`;
            return api(originalRequest);
          } catch (refreshError) {
            logout(); // If refresh fails, session is dead
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [logout]);

  // 4. Initial Load
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("access_token");

      if (savedUser && token) {
        try {
          setUser(JSON.parse(savedUser));
          await refreshUser(); // Update state with latest tier/trial info
        } catch (error) {
          localStorage.clear();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  // 5. Login Function called by Login/Register components
  const login = async (userData, tokens) => {
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));

    await refreshUser(); 
  };

  // Normalize user (backend may return nested { user: {...} } or flat)
  const u = user?.user ?? user;

  // --- SAAS & UI HELPERS ---
  const tier = u?.effective_tier || u?.tier || "free";

  const isFree = tier === "free";
  const isProfessional = tier === "professional";
  const trialEndsAt = u?.trial_ends_at;
  const isTrialActive = !!trialEndsAt && new Date(trialEndsAt) > new Date();
  const trialEligible = u?.trial_eligible ?? false;
  const isPro = tier === "pro" || tier === "professional" || isTrialActive;

  const getDaysLeftInTrial = () => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const limitsObj = u?.limits ?? {};
  const effectiveTier = u?.effective_tier || u?.subscription_tier || tier;

  const atsChecks = limitsObj.ats_checks ?? {};
  const atsChecksUsed = Number(atsChecks.used ?? limitsObj.ats_checks_used ?? 0) || 0;
  const atsChecksLimitRaw = atsChecks.limit ?? limitsObj.ats_checks_limit;
  const atsChecksLimit =
    typeof atsChecksLimitRaw === "number"
      ? atsChecksLimitRaw
      : effectiveTier === "professional"
        ? -1
        : effectiveTier === "pro" || isTrialActive
          ? 20
          : 0;
  const atsUnlimited = atsChecksLimit === -1;
  const atsChecksRemaining = atsUnlimited
    ? -1
    : Math.max(
        atsChecks.remaining ??
          (typeof atsChecksLimit === "number" ? atsChecksLimit - atsChecksUsed : 0),
        0
      );
  const cvSlotsUsed = Number(limitsObj.cv_slots_used) || 0;
  const maxCvsFromApi = limitsObj.max_cvs;
  const maxCvs =
    typeof maxCvsFromApi === "number"
      ? maxCvsFromApi
      : effectiveTier === "professional"
        ? -1
        : effectiveTier === "pro"
          ? 20
          : 2;
  const atCvLimit =
    typeof limitsObj.at_cv_limit === "boolean"
      ? limitsObj.at_cv_limit
      : maxCvs !== -1 && cvSlotsUsed >= maxCvs;
  const canCreateResume = !atCvLimit;

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        loading, 
        refreshUser, 
        tier,
        isPro, 
        isProfessional,
        isFree,
        isTrialActive,
        trialEligible,
        daysLeftInTrial: getDaysLeftInTrial(),
        language: u?.preferred_language || 'en',
        maxCvs,
        cvSlotsUsed,
        atCvLimit,
        canCreateResume,
        limits: {
          atsChecksUsed,
          atsChecksLimit,
          atsChecksRemaining,
          atsUnlimited,
        },
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);