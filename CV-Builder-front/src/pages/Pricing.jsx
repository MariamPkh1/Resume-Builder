import React, { useState } from "react";
import NavBar from "../components/NavBar";
import { Loader2, X, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import { showToast } from "../utils/toast";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#f7f9fb",
  surface: "#ffffff",
  surfaceLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  surfaceContainerHigh: "#e6e8ea",
  primary: "#000000",
  onPrimary: "#ffffff",
  primaryContainer: "#131b2e",
  onPrimaryContainer: "#7c839b",
  secondary: "#545f73",
  onSurface: "#191c1e",
  onSurfaceVariant: "#45464d",
  outline: "#76777d",
  outlineVariant: "rgba(198,198,205,0.25)",
  error: "#ba1a1a",
  fontHeadline: "'Playfair Display', Georgia, serif",
  fontBody: "'Inter', -apple-system, sans-serif",
};

const glassCard = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  boxShadow: "0px 20px 40px rgba(19,27,46,0.04)",
  border: `1px solid ${T.outlineVariant}`,
  borderRadius: 8,
};

// ─── Plan data builder ────────────────────────────────────────────────────────
const buildPlans = (t) => [
  {
    key: "free",
    name: t("pricing.free.name"),
    monthlyPrice: t("pricing.free.price"),
    yearlyPrice: null,
    period: null,
    description: t("pricing.free.description"),
    cta: t("pricing.free.cta"),
    planName: null,
    highlight: false,
    features: [
      { text: t("pricing.free.f1"),  included: true  },
      { text: t("pricing.free.f2"),  included: true  },
      { text: t("pricing.free.f3"),  included: true  },
      { text: t("pricing.free.f4"),  included: true  },
      { text: t("pricing.free.f5"),  included: true  },
      { text: t("pricing.free.f6"),  included: false },
      { text: t("pricing.free.f7"),  included: false },
      { text: t("pricing.free.f8"),  included: false },
      { text: t("pricing.free.f9"),  included: true  },
    ],
  },
  {
    key: "pro",
    name: t("pricing.proMonthly.name"),
    monthly: {
      price: t("pricing.proMonthly.price"),
      period: t("pricing.proMonthly.period"),
      description: t("pricing.proMonthly.description"),
      cta: t("pricing.proMonthly.cta"),
      badge: t("pricing.proMonthly.badge"),
      planName: "Pro Monthly",
    },
    yearly: {
      price: t("pricing.proYearly.price"),
      period: t("pricing.proYearly.period"),
      description: t("pricing.proYearly.description"),
      cta: t("pricing.proYearly.cta"),
      badge: t("pricing.proYearly.badge"),
      planName: "Pro Yearly",
    },
    highlight: true,
    features: [
      { text: t("pricing.proMonthly.f1"),  included: true },
      { text: t("pricing.proMonthly.f2"),  included: true },
      { text: t("pricing.proMonthly.f3"),  included: true },
      { text: t("pricing.proMonthly.f4"),  included: true },
      { text: t("pricing.proMonthly.f5"),  included: true },
      { text: t("pricing.proMonthly.f6"),  included: true },
      { text: t("pricing.proMonthly.f7"),  included: true },
      { text: t("pricing.proMonthly.f8"),  included: true },
      { text: t("pricing.proMonthly.f9"),  included: true },
    ],
  },
  {
    key: "professional",
    name: t("pricing.professional.name"),
    monthlyPrice: t("pricing.professional.price"),
    yearlyPrice: t("pricing.professional.yearlyPrice"),
    period: t("pricing.professional.period"),
    description: t("pricing.professional.description"),
    cta: t("pricing.professional.cta"),
    planName: "Professional Monthly",
    highlight: false,
    features: [
      { text: t("pricing.professional.f1"),  included: true },
      { text: t("pricing.professional.f2"),  included: true },
      { text: t("pricing.professional.f3"),  included: true },
      { text: t("pricing.professional.f4"),  included: true },
      { text: t("pricing.professional.f5"),  included: true },
      { text: t("pricing.professional.f6"),  included: true },
      { text: t("pricing.professional.f7"),  included: true },
      { text: t("pricing.professional.f8"),  included: true },
      { text: t("pricing.professional.f9"),  included: true },
    ],
  },
];

// ─── Check icon ───────────────────────────────────────────────────────────────
const CheckIcon = ({ filled = false }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"
      fill={filled ? T.primaryContainer : "none"}
      stroke={filled ? "none" : T.primaryContainer}
      strokeWidth={filled ? 0 : 1.5}
    />
    {!filled && (
      <path d="M9 12l2 2 4-4" stroke={T.primaryContainer} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

// ─── Trial Banner ─────────────────────────────────────────────────────────────
const TrialBanner = ({ daysLeft, onDismiss, t }) => (
  <div style={{
    marginBottom: 32, maxWidth: 560, margin: "0 auto 32px",
    background: "rgba(19,27,46,0.04)", border: `1px solid rgba(19,27,46,0.1)`,
    borderRadius: 8, padding: "12px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    fontFamily: T.fontBody,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Sparkles size={13} style={{ color: T.primaryContainer, flexShrink: 0 }} />
      <p style={{ fontSize: 12, fontWeight: 500, color: T.onSurface, margin: 0 }}>
        {t("pricing.trialBanner")}{" "}
        <span style={{ fontWeight: 800, color: T.primaryContainer }}>
          {daysLeft} {daysLeft !== 1 ? t("pricing.trialBannerDaysPlural") : t("pricing.trialBannerDays")}
        </span>{" "}
        {t("pricing.trialBannerEnd")}
      </p>
    </div>
    <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: T.outline, padding: 2, flexShrink: 0 }}>
      <X size={13} />
    </button>
  </div>
);

// ─── Billing Toggle ───────────────────────────────────────────────────────────
const BillingToggle = ({ isYearly, onToggle, t }) => (
  <div style={{ display: "flex", marginBottom: 20 }}>
    <div style={{
      display: "inline-flex", padding: 3, borderRadius: 999,
      background: T.surfaceLow, border: `1px solid ${T.outlineVariant}`,
    }}>
      {[
        { label: t("pricing.planProMonthly"), val: false },
        { label: t("pricing.planProYearly"), val: true },
      ].map(({ label, val }) => (
        <button
          key={String(val)}
          type="button"
          onClick={() => onToggle(val)}
          style={{
            padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer",
            fontFamily: T.fontBody, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.05em", textTransform: "uppercase", transition: "all 0.15s",
            background: isYearly === val ? T.surface : "transparent",
            color: isYearly === val ? T.onSurface : T.onSurfaceVariant,
            boxShadow: isYearly === val ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

// ─── Feature list item ────────────────────────────────────────────────────────
const FeatureItem = ({ text, included, filled = false }) => (
  <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
    {included ? (
      <CheckIcon filled={filled} />
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="9" stroke={T.outlineVariant} strokeWidth="1.5" />
        <path d="M9 15L15 9M9 9l6 6" stroke={T.outlineVariant} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )}
    <span style={{
      fontFamily: T.fontBody, fontSize: 12, lineHeight: 1.5,
      color: included ? T.onSurface : T.outline,
      textDecoration: included ? "none" : "line-through",
    }}>
      {text}
    </span>
  </li>
);

// ─── Plan Card (Free / Professional) ─────────────────────────────────────────
const PlanCard = ({ plan, loading, onSelect, currentTier, t }) => {
  const isCurrentPlan = currentTier === plan.key;
  const visibleFeatures = plan.key === "free"
    ? plan.features.filter((f) => f.included)
    : plan.features;

  return (
    <div style={{ ...glassCard, display: "flex", flexDirection: "column", padding: "24px 28px", transition: "transform 0.25s, box-shadow 0.25s", cursor: "default" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0px 24px 40px rgba(19,27,46,0.09)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0px 20px 40px rgba(19,27,46,0.04)"; }}
    >
      {/* Plan name */}
      <span style={{ fontFamily: T.fontBody, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.onSurfaceVariant, display: "block", marginBottom: 14 }}>
        {plan.name}
      </span>

      {/* Price */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: plan.yearlyPrice ? 3 : 12 }}>
        <span style={{ fontFamily: T.fontHeadline, fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", color: T.onSurface }}>
          {plan.monthlyPrice?.replace("₾", "")}
        </span>
        <span style={{ fontFamily: T.fontHeadline, fontSize: 18, fontWeight: 600, color: T.onSurface }}>₾</span>
        {plan.period && (
          <span style={{ fontFamily: T.fontBody, fontSize: 9, fontWeight: 600, color: T.onSurfaceVariant, letterSpacing: "0.08em", textTransform: "uppercase", marginLeft: 4 }}>
            {plan.period}
          </span>
        )}
      </div>

      {plan.yearlyPrice && (
        <p style={{ fontFamily: T.fontBody, fontSize: 9, fontWeight: 700, color: T.onPrimaryContainer, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
          OR {plan.yearlyPrice} / YEAR
        </p>
      )}

      <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.onSurfaceVariant, lineHeight: 1.6, marginBottom: 18, flex: "none" }}>
        {plan.description}
      </p>

      {/* CTA */}
      {isCurrentPlan ? (
        <div style={{
          width: "100%", padding: "9px 0", borderRadius: 6, textAlign: "center",
          background: T.surfaceContainerHigh, color: T.onSurfaceVariant,
          fontFamily: T.fontBody, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
          textTransform: "uppercase", marginBottom: 20, boxSizing: "border-box",
        }}>
          {t("pricing.currentPlan")}
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          style={{
            width: "100%", padding: "9px 0", borderRadius: 6, border: `1px solid ${T.primary}`,
            background: "transparent", color: T.primary, fontFamily: T.fontBody,
            fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer", marginBottom: 20, display: "flex",
            alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s",
            opacity: loading ? 0.6 : 1, boxSizing: "border-box",
          }}
          onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = T.surfaceLow; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {loading ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> : plan.cta}
        </button>
      )}

      {/* Features */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {visibleFeatures.map((f, i) => (
          <FeatureItem key={i} text={f.text} included={f.included} />
        ))}
      </ul>
    </div>
  );
};

// ─── Pro Plan Card ────────────────────────────────────────────────────────────
const ProPlanCard = ({
  plan, loading, onSelect, onStartTrial, onCancelTrial,
  currentTier, isTrialActive, trialEligible, daysLeftInTrial, t,
}) => {
  const [isYearly, setIsYearly] = useState(false);
  const variant = isYearly ? plan.yearly : plan.monthly;
  const isPaidPro = currentTier === "pro";

  const handleSelect = () => {
    onSelect({
      ...plan,
      cta: variant.cta,
      planName: variant.planName,
      key: variant.planName === "Pro Monthly" ? "pro_monthly" : "pro_yearly",
    });
  };

  const renderCta = () => {
    const btnBase = {
      width: "100%", padding: "9px 0", borderRadius: 6,
      fontFamily: T.fontBody, fontSize: 9, fontWeight: 700,
      letterSpacing: "0.16em", textTransform: "uppercase",
      cursor: loading ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      transition: "all 0.15s", border: "none", boxSizing: "border-box",
    };

    if (isPaidPro) {
      return (
        <div style={{ ...btnBase, background: T.surfaceContainerHigh, color: T.onSurfaceVariant, marginBottom: 24, cursor: "default" }}>
          {t("pricing.currentPlan")}
        </div>
      );
    }

    if (isTrialActive) {
      return (
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ ...btnBase, background: "rgba(19,27,46,0.06)", color: T.primaryContainer, cursor: "default", border: `1px solid rgba(19,27,46,0.15)` }}>
            {t("pricing.trialActive")} — {daysLeftInTrial}d {t("pricing.trialLeft")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSelect} disabled={!!loading} style={{ ...btnBase, flex: 1, background: T.primaryContainer, color: T.onPrimary, opacity: loading ? 0.6 : 1 }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = T.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.primaryContainer; }}
            >
              {loading === "pay" ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : t("pricing.subscribePro")}
            </button>
            <button onClick={onCancelTrial} disabled={!!loading} style={{ ...btnBase, flex: 1, background: "transparent", color: T.error, border: `1px solid rgba(186,26,26,0.25)`, opacity: loading ? 0.6 : 1 }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "rgba(186,26,26,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {loading === "cancel" ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : t("pricing.cancelTrial")}
            </button>
          </div>
        </div>
      );
    }

    if (trialEligible) {
      return (
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onStartTrial} disabled={!!loading} style={{ ...btnBase, background: T.primaryContainer, color: T.onPrimary, opacity: loading ? 0.6 : 1, boxShadow: "0 4px 16px rgba(19,27,46,0.18)" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = T.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.primaryContainer; }}
          >
            {loading === "trial" ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : t("pricing.startTrial")}
          </button>
          <button onClick={handleSelect} disabled={!!loading} style={{ ...btnBase, background: "transparent", border: `1px solid ${T.outlineVariant}`, color: T.onSurfaceVariant, opacity: loading ? 0.6 : 1 }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = T.surfaceLow; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {t("pricing.skipTrialBuy")}
          </button>
        </div>
      );
    }

    return (
      <button onClick={handleSelect} disabled={!!loading} style={{ ...btnBase, background: T.primaryContainer, color: T.onPrimary, marginBottom: 24, opacity: loading ? 0.6 : 1, boxShadow: "0 4px 16px rgba(19,27,46,0.18)" }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = T.primary; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = T.primaryContainer; }}
      >
        {loading === "pay" ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : variant.cta}
      </button>
    );
  };

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column", padding: "24px 28px",
      background: T.surface, borderRadius: 8, border: `2px solid ${T.primaryContainer}`,
      boxShadow: "0px 20px 48px rgba(19,27,46,0.1)", transform: "scale(1.03)",
      zIndex: 10, transition: "box-shadow 0.25s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0px 28px 56px rgba(19,27,46,0.16)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0px 20px 48px rgba(19,27,46,0.1)"; }}
    >
      {/* Most Popular badge */}
      <div style={{
        position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
        background: T.primaryContainer, color: T.onPrimary, padding: "4px 12px",
        borderRadius: 999, fontFamily: T.fontBody, fontSize: 8, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
        boxShadow: "0 4px 12px rgba(19,27,46,0.2)",
      }}>
        <Sparkles size={9} style={{ fill: T.onPrimary }} /> {variant.badge}
      </div>

      {/* Plan name */}
      <span style={{ fontFamily: T.fontBody, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.onPrimaryContainer, display: "block", marginBottom: 14, marginTop: 4 }}>
        {plan.name}
      </span>

      <BillingToggle isYearly={isYearly} onToggle={setIsYearly} t={t} />

      {/* Price */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 8 }}>
        <span style={{ fontFamily: T.fontHeadline, fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", color: T.onSurface }}>
          {variant.price?.replace("₾", "")}
        </span>
        <span style={{ fontFamily: T.fontHeadline, fontSize: 18, fontWeight: 600, color: T.onSurface }}>₾</span>
        <span style={{ fontFamily: T.fontBody, fontSize: 9, fontWeight: 600, color: T.onSurfaceVariant, letterSpacing: "0.08em", textTransform: "uppercase", marginLeft: 4 }}>
          {variant.period}
        </span>
      </div>

      <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.onSurfaceVariant, lineHeight: 1.6, marginBottom: 18 }}>
        {variant.description}
      </p>

      {renderCta()}

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {plan.features.map((f, i) => (
          <FeatureItem key={i} text={f.text} included={f.included} filled />
        ))}
      </ul>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Pricing = () => {
  const navigate = useNavigate();
  const { user, isTrialActive, trialEligible, daysLeftInTrial, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [showTrialBanner, setShowTrialBanner] = useState(true);

  const currentTier = user?.subscription_tier || "free";
  const PLANS = buildPlans(t);

  const handleSelect = async (plan) => {
    if (!plan.planName) {
      if (!user) navigate("/signup");
      else navigate("/app");
      return;
    }
    if (!user) { navigate("/signup"); return; }
    setLoadingPlan("pay");
    try {
      const response = await api.post("/api/subscriptions/create-checkout/", {
        plan: plan.planName === "Pro Monthly" ? "pro_monthly"
            : plan.planName === "Pro Yearly" ? "pro_yearly"
            : "professional_monthly",
        gateway: "bog",
      });
      if (response.data.payment_url) window.location.href = response.data.payment_url;
    } catch {
      showToast({ message: t("pricing.paymentError") });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleStartTrial = async () => {
    if (!user) { navigate("/signup"); return; }
    setLoadingPlan("trial");
    try {
      await api.post("/api/subscriptions/start-trial/");
      await refreshUser();
      showToast({ message: t("pricing.trialStarted") });
      navigate("/app");
    } catch (err) {
      showToast({ message: err?.response?.data?.detail || t("pricing.paymentError") });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCancelTrial = async () => {
    setLoadingPlan("cancel");
    try {
      await api.post("/api/subscriptions/cancel-trial/");
      await refreshUser();
      showToast({ message: t("pricing.trialCanceled") });
    } catch (err) {
      showToast({ message: err?.response?.data?.detail || t("pricing.paymentError") });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.fontBody }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <NavBar />

      <section style={{ paddingTop: 108, paddingBottom: 72, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1 style={{ fontFamily: T.fontHeadline, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, color: T.onSurface, margin: "0 0 12px" }}>
              {t("pricing.heroTitle")}{" "}
              <em style={{ fontStyle: "italic", color: T.onPrimaryContainer }}>{t("pricing.heroTitleHighlight")}</em>
            </h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.onSurfaceVariant, lineHeight: 1.7, margin: 0, opacity: 0.85 }}>
              {t("pricing.heroSubtitle")}<br />{t("pricing.heroSubtitleLine2")}
            </p>
          </div>

          {/* Trial banner */}
          {isTrialActive && showTrialBanner && daysLeftInTrial > 0 && (
            <TrialBanner daysLeft={daysLeftInTrial} onDismiss={() => setShowTrialBanner(false)} t={t} />
          )}

          {/* Plan cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch" }}>
            {PLANS.map((plan) =>
              plan.key === "pro" ? (
                <ProPlanCard
                  key={plan.key}
                  plan={plan}
                  loading={loadingPlan}
                  onSelect={handleSelect}
                  onStartTrial={handleStartTrial}
                  onCancelTrial={handleCancelTrial}
                  currentTier={currentTier}
                  isTrialActive={isTrialActive}
                  trialEligible={trialEligible}
                  daysLeftInTrial={daysLeftInTrial}
                  t={t}
                />
              ) : (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  loading={loadingPlan === plan.key}
                  onSelect={handleSelect}
                  currentTier={currentTier}
                  t={t}
                />
              )
            )}
          </div>

          {/* Enterprise */}
          <div style={{
            marginTop: 44, padding: "28px 36px",
            ...glassCard,
            maxWidth: 560, marginLeft: "auto", marginRight: "auto",
            textAlign: "center",
          }}>
            <h3 style={{ fontFamily: T.fontHeadline, fontSize: 18, fontWeight: 600, color: T.onSurface, margin: "0 0 8px" }}>
              {t("pricing.enterpriseTitle")}
            </h3>
            <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.onSurfaceVariant, lineHeight: 1.7, margin: "0 0 20px" }}>
              {t("pricing.enterpriseDesc")}<br />{t("pricing.enterpriseDescLine2")}
            </p>
            <a
              href="mailto:hello@nebulacv.ge"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "9px 22px", borderRadius: 6, background: T.primaryContainer,
                color: T.onPrimary, fontFamily: T.fontBody, fontSize: 9,
                fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
                textDecoration: "none", transition: "background 0.15s",
                boxShadow: "0 4px 14px rgba(19,27,46,0.16)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.primaryContainer; }}
            >
              {t("pricing.enterpriseCta")}
            </a>
          </div>

          {/* Trial badge */}
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 16px", background: T.surface, borderRadius: 999,
              border: `1px solid ${T.outlineVariant}`, boxShadow: "0 2px 8px rgba(19,27,46,0.05)",
            }}>
              <Zap size={11} style={{ color: T.primaryContainer, fill: T.primaryContainer }} />
              <span style={{ fontFamily: T.fontBody, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.onSurfaceVariant }}>
                {t("pricing.trialBadge")}
              </span>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Pricing;
