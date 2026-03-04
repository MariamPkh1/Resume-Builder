/**
 * VersionHistoryModal
 *
 * Implements Section 6 of the Integration Guide:
 *   POST /api/cvs/<id>/save-version/  { note }
 *   GET  /api/cvs/<id>/versions/
 *   POST /api/cvs/<id>/restore-version/  { version_id }
 *
 * Free: blocked with upgrade message.
 * Pro: max 10 versions; 11th returns "Version limit reached".
 */
import React, { useState, useEffect, useCallback } from "react";
import { X, Loader2, RotateCcw, History, Save } from "lucide-react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const VersionHistoryModal = ({ cvId, isPro, onClose, onRestore }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [error, setError] = useState(null);
  const [saveNote, setSaveNote] = useState("");

  const fetchVersions = useCallback(async () => {
    if (!cvId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/cvs/${cvId}/versions/`);
      setVersions(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) {
      if (err.response?.status === 403) {
        setVersions([]);
        setError(err.response?.data?.detail ?? t("history.notAvailable"));
      } else {
        setError(err.response?.data?.detail ?? t("history.failedToLoad"));
      }
    } finally {
      setLoading(false);
    }
  }, [cvId]);

  useEffect(() => {
    if (cvId && isPro) fetchVersions();
  }, [cvId, isPro, fetchVersions]);

  const handleSaveVersion = async () => {
    if (!cvId || !isPro) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/cvs/${cvId}/save-version/`, { note: saveNote.trim() || "Manual snapshot" });
      setSaveNote("");
      fetchVersions();
    } catch (err) {
      if (err.response?.status === 403) {
        setError(err.response?.data?.detail ?? t("history.limitReached"));
      } else {
        setError(err.response?.data?.detail ?? t("history.failedToSave"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (versionId) => {
    if (!cvId || !versionId) return;
    setRestoring(versionId);
    setError(null);
    try {
      const { data } = await api.post(`/api/cvs/${cvId}/restore-version/`, { version_id: versionId });
      onRestore?.(data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.detail ?? t("history.failedToRestore"));
    } finally {
      setRestoring(null);
    }
  };

  if (!isPro) {
    return (
      <div className="fixed inset-0 z-[90] flex">
        <div className="flex-1 bg-black/30" style={{ backdropFilter: "blur(2px)" }} onClick={onClose} />
        <div className="w-full max-w-[440px] bg-white h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <History size={18} className="text-gray-500" />
              </div>
              <p className="text-sm font-black text-gray-900">{t("history.title")}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <History size={48} className="text-gray-200 mb-4" />
            <p className="text-sm font-semibold text-gray-700 mb-2">{t("history.notAvailable")}</p>
            <p className="text-xs text-gray-500 mb-6">{t("history.upgradeToSave")}</p>
            <button
              onClick={() => navigate("/pricing")}
              className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700"
            >
              {t("history.upgradeToPro")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex">
      <div className="flex-1 bg-black/30" style={{ backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="w-full max-w-[440px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <History size={18} className="text-gray-600" />
            <p className="text-sm font-black text-gray-900">{t("history.title")}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={saveNote}
              onChange={(e) => setSaveNote(e.target.value)}
              placeholder="Add note (optional)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm placeholder-gray-400"
            />
            <button
              onClick={handleSaveVersion}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No versions yet. Save a snapshot to get started.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl"
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{v.note || "Untitled snapshot"}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {v.created_at ? new Date(v.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(v.id)}
                    disabled={restoring === v.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                  >
                    {restoring === v.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
