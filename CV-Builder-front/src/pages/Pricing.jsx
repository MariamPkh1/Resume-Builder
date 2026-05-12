import React, { useState } from "react";
import NavBar from "../components/NavBar";
import { Check, Sparkles, Zap, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import { showToast } from "../utils/toast";

// ─── Plan data builder (uses translation function) ───────────────────────────
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
      { text: t("pricing.free.f9"),  included: false },
      { text: t("pricing.free.f10"), included: false },
      { text: t("pricing.free.f11"), included: true  },
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
      { text: t("pricing.proMonthly.f10"), included: true },
      { text: t("pricing.proMonthly.f11"), included: true },
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
      { text: t("pricing.professional.f10"), included: true },
      { text: t("pricing.professional.f11"), included: true },
    ],
  },
];

// ─── Trial Banner ─────────────────────────────────────────────────────────────
const TrialBanner = ({ daysLeft, onDismiss, t }) => (
  <div className="mb-8 mx-auto max-w-xl bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <Sparkles size={14} className="text-blue-600 shrink-0" />
      <p className="text-xs font-medium text-slate-700">
        {t("pricing.trialBanner")}{" "}
        <span className="font-black text-blue-600">
          {daysLeft} {daysLeft !== 1 ? t("pricing.trialBannerDaysPlural") : t("pricing.trialBannerDays")}
        </span>{" "}
        {t("pricing.trialBannerEnd")}
      </p>
    </div>
    <button onClick={onDismiss} className="text-slate-400 hover:text-blue-600 transition-colors shrink-0">
      <X size={13} />
    </button>
  </div>
);

// ─── Billing Toggle (Monthly / Yearly) ────────────────────────────────────────
const BillingToggle = ({ isYearly, onToggle, t }) => (
  <div className="flex justify-center mb-4">
    <div
      role="group"
      aria-label="Billing period"
      className="inline-flex p-0.5 rounded-full bg-slate-100 border border-slate-200"
    >
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
          !isYearly
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {t("pricing.planProMonthly")}
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
          isYearly
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {t("pricing.planProYearly")}
      </button>
    </div>
  </div>
);

// ─── Plan Card ────────────────────────────────────────────────────────────────
const PlanCard = ({ plan, loading, onSelect, currentTier, t }) => {
  const isCurrentPlan = currentTier === plan.key;
  // For free plan, only show included features
  const visibleFeatures = plan.key === "free"
    ? plan.features.filter((f) => f.included)
    : plan.features;

  return (
    <div
      className={`relative flex flex-col p-6 rounded-2xl border bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
        plan.highlight
          ? "border-blue-600 shadow-xl shadow-blue-600/10 scale-[1.02] z-10"
          : "border-slate-100 shadow-sm"
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 whitespace-nowrap shadow-md shadow-blue-200">
          <Sparkles size={8} className="fill-white" /> {plan.badge}
        </div>
      )}

      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{plan.name}</h3>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-black text-slate-900 tracking-tighter">{plan.monthlyPrice}</span>
        {plan.period && <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{plan.period}</span>}
      </div>

      {plan.yearlyPrice && (
        <p className="text-[10px] font-bold text-blue-600/70 mb-3 uppercase tracking-wide">or {plan.yearlyPrice}/year</p>
      )}

      <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">{plan.description}</p>

      {isCurrentPlan ? (
        <div className="w-full py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] text-center bg-slate-50 text-slate-400 mb-5 border border-slate-100 cursor-default">
          {t("pricing.currentPlan")}
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className={`w-full py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all mb-5 disabled:opacity-60 active:scale-95 ${
            plan.highlight
              ? "bg-slate-900 text-white hover:bg-blue-600 shadow-md shadow-slate-200"
              : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50"
          }`}
        >
          {loading ? <Loader2 size={13} className="animate-spin mx-auto" /> : plan.cta}
        </button>
      )}

      <ul className="space-y-2.5 flex-1">
        {visibleFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] font-medium">
            <div className="mt-0.5 shrink-0">
              {f.included ? (
                <Check size={11} className="text-blue-600" strokeWidth={3} />
              ) : (
                <X size={11} className="text-slate-200" strokeWidth={3} />
              )}
            </div>
            <span className={f.included ? "text-slate-600" : "text-slate-300 line-through"}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Pro Plan Card (with Monthly/Yearly toggle) ────────────────────────────────
const ProPlanCard = ({ plan, loading, onSelect, currentTier, t }) => {
  const [isYearly, setIsYearly] = useState(false);
  const variant = isYearly ? plan.yearly : plan.monthly;
  const isCurrentPlan = currentTier === "pro" || currentTier === "pro_monthly" || currentTier === "pro_yearly";

  const handleSelect = () => {
    onSelect({
      ...plan,
      cta: variant.cta,
      planName: variant.planName,
      key: variant.planName === "Pro Monthly" ? "pro_monthly" : "pro_yearly",
    });
  };

  return (
    <div className="relative flex flex-col p-6 rounded-2xl border bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-blue-600 shadow-xl shadow-blue-600/10 scale-[1.02] z-10">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 whitespace-nowrap shadow-md shadow-blue-200">
        <Sparkles size={8} className="fill-white" /> {variant.badge}
      </div>

      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{plan.name}</h3>

      <BillingToggle isYearly={isYearly} onToggle={setIsYearly} t={t} />

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-black text-slate-900 tracking-tighter">{variant.price}</span>
        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{variant.period}</span>
      </div>

      <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">{variant.description}</p>

      {isCurrentPlan ? (
        <div className="w-full py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] text-center bg-slate-50 text-slate-400 mb-5 border border-slate-100 cursor-default">
          {t("pricing.currentPlan")}
        </div>
      ) : (
        <button
          onClick={handleSelect}
          disabled={loading}
          className="w-full py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all mb-5 disabled:opacity-60 active:scale-95 bg-slate-900 text-white hover:bg-blue-600 shadow-md shadow-slate-200"
        >
          {loading ? <Loader2 size={13} className="animate-spin mx-auto" /> : variant.cta}
        </button>
      )}

      <ul className="space-y-2.5 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] font-medium">
            <div className="mt-0.5 shrink-0">
              {f.included ? (
                <Check size={11} className="text-blue-600" strokeWidth={3} />
              ) : (
                <X size={11} className="text-slate-200" strokeWidth={3} />
              )}
            </div>
            <span className={f.included ? "text-slate-600" : "text-slate-300 line-through"}>{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Pricing = () => {
  const navigate = useNavigate();
  const { user, daysLeftInTrial } = useAuth();
  const { t } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [showTrialBanner, setShowTrialBanner] = useState(true);

  const currentTier = user?.subscription_tier || "free";
  const isTrialActive = user?.is_trial_active;

  const PLANS = buildPlans(t);

  const handleSelect = async (plan) => {
    if (!plan.planName) {
      if (!user) navigate("/signup");
      else navigate("/app");
      return;
    }
    if (!user) {
      navigate("/signup");
      return;
    }
    setLoadingPlan(plan.key);
    try {
      const response = await api.post("/payments/create-session/", { plan: plan.planName });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Payment failed", error);
      showToast({ message: t("pricing.paymentError") });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-blue-50/40 to-transparent -z-10" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 tracking-tight leading-snug">
              {t("pricing.heroTitle")}{" "}
              <span className="text-blue-600 italic">{t("pricing.heroTitleHighlight")}</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
              {t("pricing.heroSubtitle")} <br />
              {t("pricing.heroSubtitleLine2")}
            </p>
          </div>

          {isTrialActive && showTrialBanner && daysLeftInTrial > 0 && (
            <TrialBanner
              daysLeft={daysLeftInTrial}
              onDismiss={() => setShowTrialBanner(false)}
              t={t}
            />
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {PLANS.map((plan) =>
              plan.key === "pro" ? (
                <ProPlanCard
                  key={plan.key}
                  plan={plan}
                  loading={loadingPlan === "pro_monthly" || loadingPlan === "pro_yearly"}
                  onSelect={handleSelect}
                  currentTier={currentTier}
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

          <div className="mt-12 text-center p-8 border border-slate-100 rounded-2xl bg-slate-50/50 max-w-2xl mx-auto">
            <h3 className="text-base font-black text-slate-900 mb-2 tracking-tight">
              {t("pricing.enterpriseTitle")}
            </h3>
            <p className="text-slate-500 font-medium text-xs mb-6 leading-relaxed">
              {t("pricing.enterpriseDesc")} <br />
              {t("pricing.enterpriseDescLine2")}
            </p>
            <a
              href="mailto:hello@nebulacv.ge"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-md shadow-slate-200"
            >
              {t("pricing.enterpriseCta")}
            </a>
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
              <Zap size={12} className="text-blue-600 fill-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
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