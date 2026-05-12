import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { toastEventName } from "../../utils/toast";

const styleByType = {
  error: {
    wrapper: "bg-red-50 border-red-200 text-red-700",
    icon: <AlertCircle size={14} className="text-red-500" />,
  },
  success: {
    wrapper: "bg-emerald-50 border-emerald-200 text-emerald-700",
    icon: <CheckCircle size={14} className="text-emerald-500" />,
  },
  info: {
    wrapper: "bg-slate-50 border-slate-200 text-slate-700",
    icon: <Info size={14} className="text-slate-500" />,
  },
};

const ToastViewport = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;

    const onToast = (event) => {
      const next = event.detail;
      setToast(next);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), next.duration ?? 3500);
    };

    window.addEventListener(toastEventName, onToast);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(toastEventName, onToast);
    };
  }, []);

  if (!toast) return null;

  const style = styleByType[toast.type] || styleByType.info;

  return (
    <div className="fixed right-4 bottom-4 z-[100]">
      <div className={`max-w-sm border rounded-xl shadow-lg px-3 py-2 flex items-start gap-2 ${style.wrapper}`}>
        <span className="mt-0.5">{style.icon}</span>
        <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
      </div>
    </div>
  );
};

export default ToastViewport;
