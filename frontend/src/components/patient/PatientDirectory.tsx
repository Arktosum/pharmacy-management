import { useMemo, useState } from "react";
import {
  UserPlus,
  Search,
  Calendar,
  Hash,
  FileText,
  Trash2,
  Edit3,
  X,
  ArrowRight,
  Stethoscope,
  Pill,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useCreatePatientMutation,
  useDeletePatientMutation,
  useUpdatePatientMutation,
} from "../../api/patientApi";
import { Patient } from "../../types";
import { matchesSearch } from "../Utils";
import { getLocalDateISO } from "../../utils/patientHelpers";

interface PatientDirectoryProps {
  patients: Patient[];
  isLoading: boolean;
  onSelectPatient: (patientId: string, visitDate?: string) => void;
}

export default function PatientDirectory({
  patients,
  isLoading,
  onSelectPatient,
}: PatientDirectoryProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [createPatient, { isLoading: isCreating }] = useCreatePatientMutation();
  const [updatePatient, { isLoading: isUpdating }] = useUpdatePatientMutation();
  const [deletePatient] = useDeletePatientMutation();

  const nextAutoNumber = useMemo(() => {
    const maxNum = patients.reduce(
      (max, p) => (p.patientNumber > max ? p.patientNumber : max),
      0
    );
    return maxNum + 1;
  }, [patients]);

  // Create / Edit form state
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState(getLocalDateISO());

  const openCreateModal = () => {
    setEditingPatient(null);
    setFormNumber(String(nextAutoNumber));
    setFormName("");
    setFormDesc("");
    setFormDate(getLocalDateISO());
    setShowCreateModal(true);
  };

  const openEditModal = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPatient(patient);
    setFormNumber(String(patient.patientNumber));
    setFormName(patient.name);
    setFormDesc(patient.description || "");
    setShowCreateModal(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      toast.error("Patient name is required");
      return;
    }

    const parsedNum = formNumber.trim() ? Number(formNumber.trim()) : null;
    if (
      parsedNum !== null &&
      (!Number.isInteger(parsedNum) || parsedNum <= 0)
    ) {
      toast.error("Patient number must be a positive integer");
      return;
    }

    try {
      if (editingPatient) {
        await updatePatient({
          id: editingPatient.id,
          patientNumber: parsedNum ?? editingPatient.patientNumber,
          name: trimmedName,
          description: formDesc.trim(),
        }).unwrap();
        toast.success(`Updated patient #${parsedNum ?? editingPatient.patientNumber}`);
        setShowCreateModal(false);
      } else {
        const created = await createPatient({
          patientNumber: parsedNum,
          name: trimmedName,
          description: formDesc.trim(),
          visitDate: formDate || getLocalDateISO(),
        }).unwrap();
        toast.success(
          `Created patient #${created.patientNumber} (${created.name})`
        );
        setShowCreateModal(false);
        onSelectPatient(created.id, created.visits[0]?.date);
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string } };
      toast.error(apiErr?.data?.error || "Failed to save patient");
    }
  };

  const handleDeletePatient = async (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete patient #${patient.patientNumber} (${patient.name}) and all ${patient.visits.length} visit(s)?`
      )
    ) {
      return;
    }
    try {
      await deletePatient(patient.id).unwrap();
      toast.success(`Deleted patient #${patient.patientNumber}`);
    } catch {
      toast.error("Failed to delete patient");
    }
  };

  const filteredPatients = useMemo(() => {
    const rawQ = searchQuery.trim();
    const q = rawQ.replace(/^#/, "");
    return patients.filter((p) => {
      if (dateFilter && !p.visits.some((v) => v.date === dateFilter)) {
        return false;
      }
      if (!rawQ) return true;
      const numMatch = matchesSearch(q, String(p.patientNumber));
      const nameMatch = matchesSearch(rawQ, p.name);
      const descMatch = matchesSearch(rawQ, p.description || "");
      const visitDateMatch = p.visits.some((v) => matchesSearch(rawQ, v.date));
      return numMatch || nameMatch || descMatch || visitDateMatch;
    });
  }, [patients, searchQuery, dateFilter]);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5">
      {/* Top Action & Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Patient Case Directory
              </h2>
              <p className="text-sm text-slate-500">
                Search by patient #, name, description, or visiting date — or register a new case.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            <span>New Patient</span>
          </button>
        </div>

        {/* Search & Date Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by #ID, patient name, description, or visit date (e.g. 2026-11-12)..."
              className="w-full pl-11 pr-10 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none"
              title="Filter patients who visited on this date"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                className="text-slate-400 hover:text-rose-600 p-0.5"
                title="Clear date filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-3.5 py-3 rounded-xl text-center">
            {filteredPatients.length} / {patients.length} Patients
          </div>
        </div>
      </div>

      {/* Patient Cards */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 font-bold">
          Loading patients...
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-700">
            {patients.length === 0
              ? "No patients registered yet"
              : "No patients match your search"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {patients.length === 0
              ? 'Click "New Patient" above to create your first patient case.'
              : "Try searching by a different patient #, name, description, or visit date."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredPatients.map((patient) => {
            const sortedVisits = [...patient.visits].sort((a, b) =>
              b.date.localeCompare(a.date)
            );
            const latestVisit = sortedVisits[0];
            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient.id, latestVisit?.date)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md p-4 sm:p-5 cursor-pointer transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="px-3.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-black text-lg shrink-0 flex items-center gap-1">
                    <Hash className="w-4 h-4 text-indigo-500" />
                    <span>{patient.patientNumber}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-700 transition truncate">
                        {patient.name}
                      </h3>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {patient.visits.length}{" "}
                        {patient.visits.length === 1 ? "visit" : "visits"}
                      </span>
                      {latestVisit && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />
                          <span>
                            {latestVisit.activeSymptoms.length} active symptoms
                          </span>
                        </span>
                      )}
                      {latestVisit?.prescriptions?.map((rx, idx) => (
                        <span
                          key={`${rx.medicineName}-${idx}`}
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1"
                        >
                          <Pill className="w-3 h-3" />
                          <span>
                            {rx.medicineName}
                            {rx.potency ? ` (${rx.potency})` : ""}
                          </span>
                        </span>
                      ))}
                    </div>

                    {patient.description && (
                      <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5 line-clamp-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{patient.description}</span>
                      </p>
                    )}

                    {/* Visit Date Chips */}
                    {sortedVisits.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400 mr-1">
                          Visits:
                        </span>
                        {sortedVisits.slice(0, 6).map((v) => (
                          <button
                            key={v.date}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPatient(patient.id, v.date);
                            }}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                              dateFilter === v.date
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800"
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>{v.date}</span>
                          </button>
                        ))}
                        {sortedVisits.length > 6 && (
                          <span className="text-xs font-bold text-slate-400">
                            +{sortedVisits.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  <button
                    type="button"
                    onClick={(e) => openEditModal(patient, e)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 transition"
                    title="Edit patient details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeletePatient(patient, e)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition"
                    title="Delete patient"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white font-extrabold text-xs uppercase flex items-center gap-1.5 transition border border-indigo-200 group-hover:border-indigo-600">
                    <span>Open Case</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Patient Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-extrabold">
                  {editingPatient
                    ? `Edit Patient #${editingPatient.patientNumber}`
                    : "Register New Patient"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                    Patient # (Unique)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder={String(nextAutoNumber)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 font-extrabold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  {!editingPatient && (
                    <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                      Auto-suggested: #{nextAutoNumber}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Full name..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                  Description (for filtering / notes)
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Age, phone, chronic condition, tags, remarks..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {!editingPatient && (
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                    Visiting Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold shadow-sm transition"
                >
                  {editingPatient
                    ? isUpdating
                      ? "Saving..."
                      : "Save Changes"
                    : isCreating
                    ? "Creating..."
                    : "Create & Add Symptoms"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
