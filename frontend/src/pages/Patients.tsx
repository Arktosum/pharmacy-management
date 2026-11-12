import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  Filter,
  Hash,
  Pill,
  Plus,
  Minus,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetPatientsQuery,
  useUpsertVisitMutation,
  useDeleteVisitMutation,
} from "../api/patientApi";
import {
  useAddDiseaseMutation as useAddMapperDiseaseMutation,
  useGetDiseasesQuery as useGetMapperDiseasesQuery,
  useGetLinksQuery as useGetMapperLinksQuery,
  useGetMedicinesQuery as useGetMapperMedicinesQuery,
} from "../api/api";
import {
  useAddDiseaseMutation as useAddTipsDiseaseMutation,
  useGetDiseasesQuery as useGetTipsDiseasesQuery,
  useGetLinksQuery as useGetTipsLinksQuery,
  useGetMedicinesQuery as useGetTipsMedicinesQuery,
} from "../api/tipsApi";
import {
  KnowledgeSource,
  Patient,
  VisitPrescription,
  VisitSymptomRef,
} from "../types";
import { getLocalDateISO } from "../utils/patientHelpers";
import PatientDirectory from "../components/patient/PatientDirectory";
import PatientVisitEditor from "../components/patient/PatientVisitEditor";
import PatientFilterView from "../components/patient/PatientFilterView";

export default function Patients(): JSX.Element {
  const { data: patients = [], isLoading } = useGetPatientsQuery();
  const [upsertVisit, { isLoading: isSavingVisit }] = useUpsertVisitMutation();
  const [deleteVisit] = useDeleteVisitMutation();

  // Mapper & Tips knowledge bases
  const { data: mapperMeds = [] } = useGetMapperMedicinesQuery();
  const { data: mapperDiseases = [] } = useGetMapperDiseasesQuery();
  const { data: mapperLinks = [] } = useGetMapperLinksQuery();
  const [addMapperDisease] = useAddMapperDiseaseMutation();

  const { data: tipsMeds = [] } = useGetTipsMedicinesQuery();
  const { data: tipsDiseases = [] } = useGetTipsDiseasesQuery();
  const { data: tipsLinks = [] } = useGetTipsLinksQuery();
  const [addTipsDisease] = useAddTipsDiseaseMutation();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [selectedVisitDate, setSelectedVisitDate] = useState<string>(
    getLocalDateISO()
  );
  const [patientSubTab, setPatientSubTab] = useState<"symptoms" | "filter">(
    "symptoms"
  );
  const [knowledgeSource, setKnowledgeSource] =
    useState<KnowledgeSource>("mapper");
  const [newVisitDateInput, setNewVisitDateInput] = useState<string>(
    getLocalDateISO()
  );

  const selectedPatient: Patient | null = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  // Visits sorted chronologically ascending to assign Visit #1..#N
  const chronologicalVisits = useMemo(() => {
    if (!selectedPatient) return [];
    return [...selectedPatient.visits].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [selectedPatient]);

  // Display newest first in sidebar
  const displayVisits = useMemo(
    () => [...chronologicalVisits].reverse(),
    [chronologicalVisits]
  );

  const activeVisit = useMemo(
    () =>
      chronologicalVisits.find((v) => v.date === selectedVisitDate) ||
      undefined,
    [chronologicalVisits, selectedVisitDate]
  );

  // Previous visit strictly before selectedVisitDate
  const previousVisit = useMemo(() => {
    const prior = chronologicalVisits.filter(
      (v) => v.date < selectedVisitDate
    );
    return prior.length > 0 ? prior[prior.length - 1] : undefined;
  }, [chronologicalVisits, selectedVisitDate]);

  const currentVisitNumber = useMemo(() => {
    if (!activeVisit) return chronologicalVisits.length + 1;
    const idx = chronologicalVisits.findIndex(
      (v) => v.date === activeVisit.date
    );
    return idx >= 0 ? idx + 1 : chronologicalVisits.length + 1;
  }, [activeVisit, chronologicalVisits]);

  const activeMeds = knowledgeSource === "mapper" ? mapperMeds : tipsMeds;
  const activeDiseases =
    knowledgeSource === "mapper" ? mapperDiseases : tipsDiseases;
  const activeLinks = knowledgeSource === "mapper" ? mapperLinks : tipsLinks;

  const handleSelectPatient = (patientId: string, visitDate?: string) => {
    setSelectedPatientId(patientId);
    const patient = patients.find((p) => p.id === patientId);
    if (visitDate) {
      setSelectedVisitDate(visitDate);
    } else if (patient && patient.visits.length > 0) {
      const sorted = [...patient.visits].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      setSelectedVisitDate(sorted[0].date);
    } else {
      setSelectedVisitDate(getLocalDateISO());
    }
    setPatientSubTab("symptoms");
  };

  const handleOpenOrCreateVisitDate = () => {
    if (!newVisitDateInput) return;
    setSelectedVisitDate(newVisitDateInput);
    setPatientSubTab("symptoms");
  };

  const handleCreateDisease = async (name: string) => {
    if (knowledgeSource === "mapper") {
      return await addMapperDisease({ name }).unwrap();
    }
    return await addTipsDisease({ name }).unwrap();
  };

  const handleSaveVisit = async ({
    date,
    activeSymptoms,
    notes,
  }: {
    date: string;
    activeSymptoms: VisitSymptomRef[];
    notes: string;
  }) => {
    if (!selectedPatient) return;
    try {
      await upsertVisit({
        patientId: selectedPatient.id,
        date,
        activeSymptoms,
        notes,
      }).unwrap();
      toast.success(`Saved visit for ${date}`);
    } catch {
      toast.error("Failed to save visit");
    }
  };

  const handleSaveAndGoToFilter = async (params: {
    date: string;
    activeSymptoms: VisitSymptomRef[];
    notes: string;
  }) => {
    if (!selectedPatient) return;
    try {
      await upsertVisit({
        patientId: selectedPatient.id,
        date: params.date,
        activeSymptoms: params.activeSymptoms,
        notes: params.notes,
      }).unwrap();
      setPatientSubTab("filter");
    } catch {
      toast.error("Failed to save visit");
    }
  };

  const handleUpdatePrescriptions = async (
    prescriptions: VisitPrescription[]
  ) => {
    if (!selectedPatient) return;
    await upsertVisit({
      patientId: selectedPatient.id,
      date: selectedVisitDate,
      activeSymptoms:
        activeVisit?.activeSymptoms ?? previousVisit?.activeSymptoms ?? [],
      notes: activeVisit?.notes,
      prescriptions,
    }).unwrap();
  };

  const handleDeleteVisit = async (date: string) => {
    if (!selectedPatient) return;
    if (!window.confirm(`Delete visit on ${date}?`)) return;
    try {
      const updated = await deleteVisit({
        patientId: selectedPatient.id,
        date,
      }).unwrap();
      toast.success(`Deleted visit on ${date}`);
      const remaining = [...updated.visits].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      setSelectedVisitDate(remaining[0]?.date || getLocalDateISO());
    } catch {
      toast.error("Failed to delete visit");
    }
  };

  return (
    <div className="h-[90vh] flex flex-col bg-slate-100 text-slate-900 overflow-y-auto font-sans">
      {!selectedPatient ? (
        <PatientDirectory
          patients={patients}
          isLoading={isLoading}
          onSelectPatient={handleSelectPatient}
        />
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Selected Patient Top Bar */}
          <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedPatientId(null)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold flex items-center gap-1.5 border border-slate-700 transition shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Patients</span>
              </button>

              <div className="px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-400/40 text-indigo-300 font-black text-base flex items-center gap-1 shrink-0">
                <Hash className="w-4 h-4" />
                <span>{selectedPatient.patientNumber}</span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h1 className="text-lg font-extrabold truncate">
                    {selectedPatient.name}
                  </h1>
                </div>
                {selectedPatient.description && (
                  <p className="text-xs text-slate-400 truncate">
                    {selectedPatient.description}
                  </p>
                )}
              </div>
            </div>

            {/* Sub-View Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setPatientSubTab("symptoms")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
                  patientSubTab === "symptoms"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Visits & Symptoms</span>
              </button>
              <button
                type="button"
                onClick={() => setPatientSubTab("filter")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition ${
                  patientSubTab === "filter"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filter View</span>
              </button>
            </div>
          </header>

          {/* Main Workspace: Visit Timeline Sidebar + Visit/Filter Content */}
          <div className="max-w-[98vw] w-full mx-auto px-3 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
            {/* Visit Dates Timeline (3 cols) */}
            <aside className="lg:col-span-3 flex flex-col gap-3">
              {/* New Visit Creator */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-2.5">
                <div className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <CalendarPlus className="w-4 h-4 text-indigo-600" />
                  <span>New / Open Visit Date</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newVisitDateInput}
                    onChange={(e) => setNewVisitDateInput(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleOpenOrCreateVisitDate}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shrink-0"
                  >
                    Open
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  New dates automatically carry forward symptoms from the latest prior visit.
                </p>
              </div>

              {/* Visit History List */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Visit History ({chronologicalVisits.length})</span>
                  </h2>
                </div>

                <ul className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                  {/* Show unsaved draft entry if selectedVisitDate isn't saved yet */}
                  {!activeVisit && (
                    <li className="p-3 rounded-xl border-2 border-amber-400 bg-amber-50/70">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-amber-900">
                          {selectedVisitDate}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                          Draft
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-800 mt-1 font-semibold">
                        Unsaved new visit — save on the right
                      </div>
                    </li>
                  )}

                  {displayVisits.map((visit) => {
                    const visitNum =
                      chronologicalVisits.findIndex(
                        (v) => v.date === visit.date
                      ) + 1;
                    const isSelected = visit.date === selectedVisitDate;
                    return (
                      <li
                        key={visit.date}
                        onClick={() => setSelectedVisitDate(visit.date)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/80 ring-1 ring-indigo-300"
                            : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              #{visitNum}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900">
                              {visit.date}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-600">
                            {visit.activeSymptoms.length} sym
                          </span>
                        </div>

                        {/* Diff & Rx badges */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {visit.addedSymptoms.length > 0 && (
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                              <Plus className="w-3 h-3" />
                              <span>{visit.addedSymptoms.length}</span>
                            </span>
                          )}
                          {visit.removedSymptoms.length > 0 && (
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-0.5">
                              <Minus className="w-3 h-3" />
                              <span>{visit.removedSymptoms.length}</span>
                            </span>
                          )}
                          {visit.addedSymptoms.length === 0 &&
                            visit.removedSymptoms.length === 0 && (
                              <span className="text-[11px] font-semibold text-slate-400">
                                No symptom diff
                              </span>
                            )}
                          {(visit.prescriptions || []).map((rx, idx) => (
                            <span
                              key={`${rx.medicineName}-${idx}`}
                              className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 flex items-center gap-1 truncate max-w-full"
                            >
                              <Pill className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {rx.medicineName}
                                {rx.potency ? ` ${rx.potency}` : ""}
                              </span>
                            </span>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            {/* Right Main Panel (9 cols) */}
            <section className="lg:col-span-9 min-w-0">
              {patientSubTab === "symptoms" ? (
                <PatientVisitEditor
                  patientId={selectedPatient.id}
                  visitDate={selectedVisitDate}
                  visit={activeVisit}
                  previousActiveSymptoms={previousVisit?.activeSymptoms || []}
                  visitNumber={currentVisitNumber}
                  totalVisits={chronologicalVisits.length}
                  knowledgeSource={knowledgeSource}
                  onChangeKnowledgeSource={setKnowledgeSource}
                  diseases={activeDiseases}
                  links={activeLinks}
                  onCreateDisease={handleCreateDisease}
                  onSaveVisit={handleSaveVisit}
                  onSaveAndGoToFilter={handleSaveAndGoToFilter}
                  onUpdatePrescriptions={handleUpdatePrescriptions}
                  onDeleteVisit={handleDeleteVisit}
                  isSaving={isSavingVisit}
                />
              ) : (
                <PatientFilterView
                  visitDate={selectedVisitDate}
                  visit={activeVisit}
                  knowledgeSource={knowledgeSource}
                  onChangeKnowledgeSource={setKnowledgeSource}
                  allMeds={activeMeds}
                  allDiseases={activeDiseases}
                  allLinks={activeLinks}
                  onBackToSymptoms={() => setPatientSubTab("symptoms")}
                  onUpdatePrescriptions={handleUpdatePrescriptions}
                  isSavingPrescription={isSavingVisit}
                />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
