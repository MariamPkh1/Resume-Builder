import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext"; // Import useAuth

const Success = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth(); // Get the refresh function

  useEffect(() => {
    // As soon as the user lands here, tell the app to check the database
    // for their new "Pro" status.
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="relative">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle size={48} strokeWidth={2.5} />
          </div>
          {/* Decorative Sparkles */}
          <Sparkles className="absolute top-0 right-1/4 text-amber-400 animate-pulse" size={20} />
        </div>
        
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
          Welcome to <span className="text-amber-600">Pro!</span>
        </h1>
        
        <p className="text-gray-500 text-lg mb-10 leading-relaxed">
          Your payment was successful. All limitations have been removed. 
          Go ahead and create your winning resume.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate("/app")}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all group"
          >
            Go to Dashboard
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Sparkles size={12} className="text-amber-500" />
            Unlimited CVs and AI features now unlocked.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Success;