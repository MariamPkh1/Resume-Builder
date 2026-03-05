import React from "react";
import { FileText, Palette, Download, Zap, Shield, CopyPlus } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const FeaturesSection = () => {
  const { t } = useLanguage();
  
  const features = [
    { icon: FileText, titleKey: "landing.feature1Title", descKey: "landing.feature1Desc" },
    { icon: Palette, titleKey: "landing.feature2Title", descKey: "landing.feature2Desc" },
    { icon: Download, titleKey: "landing.feature3Title", descKey: "landing.feature3Desc" },
    { icon: Zap, titleKey: "landing.feature4Title", descKey: "landing.feature4Desc" },
    { icon: Shield, titleKey: "landing.feature5Title", descKey: "landing.feature5Desc" },
    { icon: CopyPlus, titleKey: "landing.feature6Title", descKey: "landing.feature6Desc" },
  ];

  return (
    <section className="py-24 px-6 bg-[#F9FAFB]">
      <div className="max-w-6xl mx-auto">
        {/* Minimal Header */}
        <div className="text-center mb-16">
  <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
    {t("landing.featuresTitle")}
  </h2>
  <p className="text-slate-500 text-lg font-medium">
    {t("landing.featuresSubtitle")}
  </p>
</div>

        {/* The Grid matching your reference */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group bg-white rounded-2xl p-8 border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                {/* Thin, Soft Blue Icon Box */}
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Icon className="w-5 h-5 text-blue-500 group-hover:text-white" strokeWidth={2} />
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {t(feature.descKey)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;