import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ArrowRight } from "lucide-react";

const CtaSection = ({ onGetStarted }) => {
  const { t } = useLanguage();
  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* ULTRA-MINIMAL CTA */}
        <div className="text-center pb-24">
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tighter mb-8">
            Ready to build your <span className="text-blue-600">future?</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto mb-10 font-medium leading-relaxed">
            {t("landing.ctaSubtitle")}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
            >
              {t("landing.ctaButton")}
            </button>
            <Link 
              to="/templates"
              className="px-8 py-4 bg-white text-slate-900 border border-slate-100 text-[11px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              View Templates <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* LIGHTWEIGHT FOOTER */}
        <div className="pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">N</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Nebula<span className="text-blue-600 font-black">AI</span>
            </span>
          </div>

          <div className="flex gap-10 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
          </div>

          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">
            © 2026 Nebula AI
          </p>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;