import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, GripVertical, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import debounce from "lodash/debounce";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { showToast } from "../../utils/toast";

import EditorShell from "../../pages/EditorShell";
import LivePreview from "../classic-template/LivePreview";
import EuropassPreview from "../europass-template/EuropassPreview";

import PersonalInfoForm from "../classic-template/forms/PersonalInfoForm";
import SummaryForm from "../classic-template/forms/SummaryForm";
import ExperienceForm from "../classic-template/forms/ExperienceForm";
import EducationForm from "../classic-template/forms/EducationForm";
import SkillsForm from "../classic-template/forms/SkillsForm";
import ProjectForm from "../classic-template/forms/ProjectForm";
import LanguageForm from "../classic-template/forms/LanguageForm";
import CertificateForm from "../classic-template/forms/CertificateForm";
import SectionModal from "../classic-template/forms/SectionModal";

import AIImprovePanel from "../ai/AIImprovePanel";
import ATSPanel from "../ai/ATSPanel";
import JobTailorModal from "../ai/JobTailorModal";
import AnalyzeCVPanel from "../ai/AnalyzeCVPanel";
import VersionHistoryModal from "../VersionHistoryModal";

const UniversalBuilder = () => {
  const { refreshUser, isPro, limits } = useAuth();
  const { t, language } = useLanguage();
  const { template, resumeId } = useParams();
  const navigate = useNavigate();
  const resumeRef = useRef();

  const [resumeData, setResumeData] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAIImprove, setShowAIImprove] = useState(false);
  const [showATS, setShowATS] = useState(false);
  const [showJobTailor, setShowJobTailor] = useState(false);
  const [showAnalyzeCV, setShowAnalyzeCV] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [atsScore, setAtsScore] = useState(null);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // { id, title } | null

  // ── 1. AUTOSAVE (PATCH) ──
  const debouncedSave = useCallback(
    debounce(async (dataToSave, id, currentTemplate) => {
      setSaveStatus("saving");
      try {
        await api.patch(`/api/cvs/${id}/`, {
          title: dataToSave.title || "Untitled Resume",
          template: currentTemplate,
          language: dataToSave.language || "en",
          section_order: dataToSave.section_order || [],
          cv_data: dataToSave.cv_data,
        });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Autosave failed:", err);
        setSaveStatus("error");
      }
    }, 2000),
    []
  );

  // ── 2. INITIAL FETCH ──
  useEffect(() => {
    if (!resumeId) return;
    api
      .get(`/api/cvs/${resumeId}/`)
      .then(({ data }) => {
        setResumeData(data);
        if (data.ats_score != null) setAtsScore(data.ats_score);
      })
      .catch((err) => {
        if (err.response?.status === 401) navigate("/login");
        if (err.response?.status === 404) navigate("/app");
      });
  }, [resumeId, navigate]);

  // ── 3. FULL OBJECT UPDATER ──
  const updateResume = useCallback(
    (updatedFullObject) => {
      setSaveStatus("editing");
      setResumeData(updatedFullObject);
      debouncedSave(updatedFullObject, resumeId, template);
    },
    [debouncedSave, resumeId, template]
  );

  // ── 3b. TEMPLATE SWITCH (cancel pending autosave, single PATCH, no debounced save) ──
  const onTemplateSwitch = useCallback(
    async (newTemplate, titleOverride) => {
      debouncedSave.cancel();
      const cvData = resumeData?.cv_data || {};
      const sections = cvData.sections || [];
      const sectionOrder = resumeData?.section_order || sections.map((s) => s.id);
      const title = titleOverride ?? resumeData?.title ?? "Untitled Resume";

      const updated = { ...resumeData, template: newTemplate };
      setResumeData(updated);
      setSaveStatus("saving");
      navigate(`/app/builder/${newTemplate}/${resumeId}`, { replace: true });

      try {
        await api.patch(`/api/cvs/${resumeId}/`, {
          template: newTemplate,
          title,
          language: resumeData?.language || "en",
          section_order: sectionOrder,
          cv_data: cvData,
        });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Template switch failed", err);
        const msg = err.response?.data;
        const errStr =
          typeof msg === "string"
            ? msg
            : msg && typeof msg === "object"
              ? JSON.stringify(msg, null, 2)
              : "Unknown error";
        showToast({ message: `Template switch failed: ${errStr}` });
        setSaveStatus("error");
      }
    },
    [resumeData, resumeId, navigate, debouncedSave]
  );

  /** Persist editor state immediately before ATS (avoids analyzing stale DB copy). */
  const flushSaveBeforeATS = useCallback(async () => {
    if (!resumeData || !resumeId) return;
    debouncedSave.cancel();
    setSaveStatus("saving");
    try {
      await api.patch(`/api/cvs/${resumeId}/`, {
        title: resumeData.title || "Untitled Resume",
        template,
        language: resumeData.language || "en",
        section_order: resumeData.section_order || [],
        cv_data: resumeData.cv_data,
      });
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save before ATS failed:", err);
      setSaveStatus("error");
      throw err;
    }
  }, [resumeData, resumeId, template, debouncedSave]);

  // ── 4. cv_data PARTIAL UPDATER ──
  const updateCvData = useCallback(
    (newDataPart) => {
      setResumeData((prev) => {
        const updated = { ...prev, cv_data: { ...prev.cv_data, ...newDataPart } };
        setSaveStatus("editing");
        debouncedSave(updated, resumeId, template);
        return updated;
      });
    },
    [debouncedSave, resumeId, template]
  );

  // ── 5. SECTION ADAPTER ──
  // Every form component (ExperienceForm, SummaryForm, etc.) calls:
  //   setResumeData(prev => ({ ...prev, sections: newSections }))
  //
  // They expect `prev` to be a flat object { sections: [], personal_info: {} }
  // But our actual state shape is NESTED:
  //   { id, title, cv_data: { sections: [], personal_info: {} }, section_order: [] }
  //
  // When a form mutates the wrong shape, resumeData.cv_data becomes undefined,
  // LivePreview tries to read resumeData.cv_data.sections → crash → blank screen.
  //
  // This adapter bridges the gap: it presents the flat cv_data to the form,
  // then re-wraps the result back into the full nested shape.
  // No form component needs to be changed at all.
  const makeSectionUpdater = useCallback(() => {
    return (updaterOrValue) => {
      setResumeData((prev) => {
        // Forms call: setResumeData(prev => ({ ...prev, sections: [...] }))
        // We pass prev.cv_data as "prev" so the form spreads the right object
        const flatNext =
          typeof updaterOrValue === "function"
            ? updaterOrValue({ ...prev.cv_data })
            : updaterOrValue;

        // flatNext is now e.g. { personal_info: {...}, sections: [...] }
        // Wrap it back into the full state shape
        const updated = {
          ...prev,
          cv_data: { ...prev.cv_data, ...flatNext },
          // Keep section_order in sync if sections changed
          ...(flatNext.sections && {
            section_order: flatNext.sections.map((s) => s.id),
          }),
        };

        setSaveStatus("editing");
        debouncedSave(updated, resumeId, template);
        return updated;
      });
    };
  }, [debouncedSave, resumeId, template]);

  // ── 6. PHOTO UPLOAD ──
  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Failed to read image"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (file) => {
    const formData = new FormData();
    formData.append("photo", file);
    setSaveStatus("saving");
    try {
      const dataUrl = await readFileAsDataUrl(file);

      setResumeData((prev) => {
        const updated = {
          ...prev,
          cv_data: {
            ...prev.cv_data,
            personal_info: {
              ...(prev.cv_data?.personal_info || {}),
              photo: dataUrl,
            },
          },
        };
        setSaveStatus("editing");
        debouncedSave(updated, resumeId, template);
        return updated;
      });

      await api.post(`/api/cvs/${resumeId}/upload-photo/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      showToast({ message: "Photo upload failed." });
    }
  };

  // Safely normalized cv_data + sections so we never crash on missing arrays
  const cvData = resumeData?.cv_data || {};
  const sections = Array.isArray(cvData.sections) ? cvData.sections : [];

  // ── 7. DRAG & DROP ──
  const handleDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const current = Array.from(sections);
    const [moved] = current.splice(source.index, 1);
    current.splice(destination.index, 0, moved);
    updateResume({
      ...resumeData,
      section_order: current.map((s) => s.id),
      cv_data: { ...cvData, sections: current },
    });
  };

  // ── 8. PDF EXPORT ──
  const triggerPrint = useReactToPrint({
    contentRef: resumeRef,
    documentTitle: resumeData?.title || "Resume",
  });

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    debouncedSave.cancel();
    try {
      setSaveStatus("saving");
      await api.patch(`/api/cvs/${resumeId}/`, {
        title: resumeData?.title || "Untitled Resume",
        template,
        language: resumeData?.language || language || "en",
        section_order: resumeData?.section_order || [],
        cv_data: resumeData?.cv_data,
      });
      setSaveStatus("saved");

      const response = await api.get(`/api/cvs/${resumeId}/export/pdf/?template=${template}&language=${language}`, {
        responseType: "blob",
      });
      const contentType = response.headers["content-type"] || "";

      if (contentType.includes("application/pdf")) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${resumeData?.title || "resume"}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const text = await response.data.text();
        const json = JSON.parse(text);
        if (!json.pdf_engine_ready) {
          setUpgradeMessage(
            "PDF engine is not ready on the server yet. Using browser print as fallback."
          );
          triggerPrint();
        } else if (json.ad_required || json.watermark) {
          setUpgradeMessage("Upgrade to Pro to export without watermarks or ads.");
        }
      }
      refreshUser?.();
    } catch (err) {
      if (err.response?.status === 403) {
        showToast({ message: err.response?.data?.detail || "Export not available on your plan. Upgrade to continue." });
        navigate("/pricing");
      } else showToast({ message: "Export failed. Please try again." });
    } finally {
      setIsExporting(false);
    }
  };

  // ── LOADING STATE ──
  if (!resumeData)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );

  // Create the adapter once per render cycle
  const sectionUpdater = makeSectionUpdater();

  return (
    <>
      <EditorShell
        resumeData={resumeData}
        setResumeData={updateResume}
        onTemplateSwitch={onTemplateSwitch}
        handleSave={() => debouncedSave.flush()}
        isSaving={saveStatus === "saving"}
        isExporting={isExporting}
        handleDownloadPDF={handleDownloadPDF}
        onAIImprove={() => setShowAIImprove(true)}
        onATSCheck={() => setShowATS(true)}
        onJobTailor={() => setShowJobTailor(true)}
        onAnalyzeCV={() => setShowAnalyzeCV(true)}
        onVersionHistory={() => setShowVersionHistory(true)}
        atsScore={atsScore}
        preview={
          <div id="resume-print-area" ref={resumeRef} className="bg-white shadow-2xl">
            {(template === "europass" || template === "modern") ? (
              <EuropassPreview data={resumeData.cv_data} />
            ) : (
              <LivePreview data={resumeData.cv_data} />
            )}
          </div>
        }
      >
        {/* Upgrade banner */}
        {upgradeMessage && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] font-medium text-amber-700 flex items-center justify-between mb-4">
            <span>{upgradeMessage}</span>
            <button onClick={() => navigate("/pricing")} className="ml-4 font-bold underline">
              {t("pricing.enterpriseCta")}
            </button>
          </div>
        )}

        {/* Autosave toast */}
        <div className="fixed bottom-6 left-6 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-2xl shadow-xl transition-all ${
              saveStatus === "error" ? "border-red-200" : "border-gray-100"
            }`}
          >
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                <CheckCircle size={12} /> {t("editor.cloudSynced")}
              </span>
            )}
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                <Loader2 size={12} className="animate-spin" /> {t("editor.syncing")}
              </span>
            )}
            {saveStatus === "editing" && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                {t("editor.typing")}
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                <AlertCircle size={12} /> {t("editor.syncError")}
              </span>
            )}
          </div>
        </div>

        {/* Personal Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900 px-1 tracking-tight">
            {t("resume.personalInfo")}
          </h2>
          <PersonalInfoForm
            data={resumeData.cv_data.personal_info}
            onPhotoUpload={handlePhotoUpload}
            update={(field, value) =>
              updateCvData({
                personal_info: {
                  ...resumeData.cv_data.personal_info,
                  [field]: value,
                },
              })
            }
            showPhoto={template === "europass" || template === "modern"}
          />
        </div>

        {/* Draggable Sections */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="mt-8 space-y-4"
              >
                {sections.map((section, index) => (
                  <Draggable
                    key={section.id}
                    draggableId={String(section.id)}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="rounded-2xl overflow-hidden"
                      >
                        {section.type === "summary" && (
                          <SummaryForm
                            section={section}
                            setResumeData={sectionUpdater}
                            cvId={resumeId}
                            dragHandleProps={provided.dragHandleProps}
                            onDeleteSection={() =>
                              setPendingDelete({
                                id: section.id,
                                title: section.title || t("resume.professionalSummary"),
                              })
                            }
                          />
                        )}
                        {section.type === "experience" && (
                          <ExperienceForm
                            section={section}
                            setResumeData={sectionUpdater}
                            cvId={resumeId}
                            dragHandleProps={provided.dragHandleProps}
                            onDeleteSection={() =>
                              setPendingDelete({
                                id: section.id,
                                title: section.title || t("resume.workExperience"),
                              })
                            }
                          />
                        )}
                        {section.type === "education" && (
                          <EducationForm
                            section={section}
                            setResumeData={sectionUpdater}
                            dragHandleProps={provided.dragHandleProps}
                            onDeleteSection={() =>
                              setPendingDelete({
                                id: section.id,
                                title: section.title || t("resume.education"),
                              })
                            }
                          />
                        )}
                        {section.type === "skills" && (
                          <SkillsForm
                            section={section}
                            setResumeData={sectionUpdater}
                            dragHandleProps={provided.dragHandleProps}
                            onDeleteSection={() =>
                              setPendingDelete({
                                id: section.id,
                                title: section.title || t("resume.skills"),
                              })
                            }
                          />
                        )}
                        {section.type === "projects" && (
                          <ProjectForm
                            section={section}
                            setResumeData={sectionUpdater}
                            dragHandleProps={provided.dragHandleProps}
                            onDeleteSection={() =>
                              setPendingDelete({
                                id: section.id,
                                title: section.title || t("resume.projects"),
                              })
                            }
                          />
                        )}
                        {section.type === "languages" && (
                          <LanguageForm
                            section={section}
                            setResumeData={sectionUpdater}
                            dragHandleProps={provided.dragHandleProps}
                            onDeleteSection={() =>
                              setPendingDelete({
                                id: section.id,
                                title: section.title || t("resume.languages"),
                              })
                            }
                          />
                        )}
                        {section.type === "certificates" && (
                          <CertificateForm
                            section={section}
                            setResumeData={sectionUpdater}
                            dragHandleProps={provided.dragHandleProps}
                            onDeleteSection={() =>
                              setPendingDelete({
                                id: section.id,
                                title: section.title || t("resume.certificates"),
                              })
                            }
                          />
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> {t("editor.addSection")}
        </button>

        {isModalOpen && (
          <SectionModal
            onAdd={(newSection) => {
              const updatedSections = [...sections, newSection];
              updateResume({
                ...resumeData,
                section_order: updatedSections.map((s) => s.id),
                cv_data: { ...cvData, sections: updatedSections },
              });
              setIsModalOpen(false);
            }}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </EditorShell>

      {/* AI Panels */}
      {showAIImprove && (
        <AIImprovePanel
          resumeData={cvData}
          language={language}
          cvId={resumeId}
          onClose={() => setShowAIImprove(false)}
          onApply={(id, content) => {
            const updatedSections = sections.map((s) => {
              if (s.id !== id) return s;
              // Summary, certificates etc: flat content
              if (s.type === "summary" || s.type === "certificates" || (!Array.isArray(s.items) || s.items.length === 0)) {
                return { ...s, content };
              }
              const items = s.items ?? [];
              const parts = (content || "").split(/\n\n+/).filter(Boolean);

              if (s.type === "experience") {
                const updatedItems = items.map((item, i) => {
                  if (items.length === 1 && i === 0) {
                    return { ...item, description: content.trim() };
                  }
                  const block = parts[i] !== undefined ? parts[i] : null;
                  if (block == null) return item;
                  return { ...item, description: block.trim() };
                });
                return { ...s, items: updatedItems };
              }

              // Education, projects: items[].description
              const updatedItems = items.map((item, i) => ({
                ...item,
                description: parts[i] !== undefined ? parts[i] : (parts.length === 1 && i === 0 ? parts[0] : item.description),
              }));
              return { ...s, items: updatedItems };
            });
            updateCvData({ sections: updatedSections });
          }}
        />
      )}

      {showATS && (
        <ATSPanel
          cvId={resumeId}
          isPro={isPro}
          onClose={() => setShowATS(false)}
          onScoreUpdate={setAtsScore}
          onBeforeCheck={flushSaveBeforeATS}
          onChecksUpdated={refreshUser}
          checksUsed={limits?.atsChecksUsed ?? 0}
          checksLimit={limits?.atsChecksLimit ?? 20}
        />
      )}

      {showJobTailor && (
        <JobTailorModal
          cvId={resumeId}
          cvData={resumeData?.cv_data}
          isPro={isPro}
          onClose={() => setShowJobTailor(false)}
          onApplyTailored={(tailoredData) => {
            if (!tailoredData?.sections) return;
            updateResume({
              ...resumeData,
              section_order: tailoredData.sections.map((s) => s.id),
              cv_data: tailoredData,
            });
          }}
        />
      )}

      {showAnalyzeCV && (
        <AnalyzeCVPanel
          cvId={resumeId}
          onClose={() => setShowAnalyzeCV(false)}
        />
      )}

      {showVersionHistory && (
        <VersionHistoryModal
          cvId={resumeId}
          isPro={isPro}
          onClose={() => setShowVersionHistory(false)}
          onRestore={(updatedCv) => {
            setResumeData(updatedCv);
          }}
        />
      )}

      {/* Section delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full mx-4 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-900 mb-1">
                  {t("form.deleteSectionConfirm") || "Are you sure you want to delete this section?"}
                </h2>
                <p className="text-xs text-slate-500 break-words">
                  {pendingDelete.title}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                {t("common.cancel") || "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!pendingDelete) return;
                  const updatedSections = resumeData.cv_data.sections.filter(
                    (s) => s.id !== pendingDelete.id
                  );
                  updateResume({
                    ...resumeData,
                    section_order: updatedSections.map((s) => s.id),
                    cv_data: { ...cvData, sections: updatedSections },
                  });
                  setPendingDelete(null);
                }}
                className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                {t("common.confirm") || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UniversalBuilder;