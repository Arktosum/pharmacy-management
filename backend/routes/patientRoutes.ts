import path from "path";
import fs from "fs";
import express from "express";
import { nanoid } from "nanoid";

const DATA_PATH = path.resolve("./databases/patients.json");

export type KnowledgeSource = "mapper" | "tips";

export interface VisitSymptomRef {
  id: string;
  name: string;
  source: KnowledgeSource;
}

export interface VisitPrescription {
  medicineId?: string;
  medicineName: string;
  source: KnowledgeSource | "manual";
  potency?: string;
  notes?: string;
}

export interface PatientVisit {
  date: string; // YYYY-MM-DD
  addedSymptoms: VisitSymptomRef[];
  removedSymptoms: VisitSymptomRef[];
  activeSymptoms: VisitSymptomRef[];
  notes?: string;
  prescriptions: VisitPrescription[];
  updatedAt: string;
}

export interface Patient {
  id: string;
  patientNumber: number;
  name: string;
  description: string;
  createdAt: string;
  visits: PatientVisit[];
}

interface PatientDB {
  patients: Patient[];
}

let cachedDB: PatientDB | null = null;
let lastMtime = 0;

function readDB(): PatientDB {
  if (!fs.existsSync(DATA_PATH)) {
    const initial: PatientDB = { patients: [] };
    fs.writeFileSync(DATA_PATH, JSON.stringify(initial, null, 2));
    cachedDB = initial;
    try {
      lastMtime = fs.statSync(DATA_PATH).mtimeMs;
    } catch {
      lastMtime = Date.now();
    }
    return initial;
  }
  try {
    const stat = fs.statSync(DATA_PATH);
    if (!cachedDB || stat.mtimeMs > lastMtime) {
      cachedDB = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as PatientDB;
      lastMtime = stat.mtimeMs;
    }
  } catch {
    if (!cachedDB) {
      cachedDB = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as PatientDB;
    }
  }
  return cachedDB!;
}

function writeDB(db: PatientDB) {
  cachedDB = db;
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
  try {
    lastMtime = fs.statSync(DATA_PATH).mtimeMs;
  } catch {
    lastMtime = Date.now();
  }
}

const symptomKey = (s: VisitSymptomRef) => s.name.trim().toLowerCase();

function deduplicateSymptoms(symptoms: VisitSymptomRef[]): VisitSymptomRef[] {
  const seen = new Set<string>();
  const out: VisitSymptomRef[] = [];
  for (const s of symptoms) {
    if (!s?.name?.trim()) continue;
    const key = symptomKey(s);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: String(s.id || ""),
      name: s.name.trim(),
      source: s.source === "tips" ? "tips" : "mapper",
    });
  }
  return out;
}

function normalizePrescriptions(visit: {
  prescriptions?: VisitPrescription[];
  prescription?: VisitPrescription | null;
}): VisitPrescription[] {
  if (Array.isArray(visit.prescriptions)) {
    return visit.prescriptions.filter((p) => p && p.medicineName?.trim());
  }
  if (visit.prescription && visit.prescription.medicineName?.trim()) {
    return [visit.prescription];
  }
  return [];
}

function recomputeVisitDiffs(visits: PatientVisit[]): PatientVisit[] {
  const sorted = [...visits].sort((a, b) => a.date.localeCompare(b.date));
  let prevActive: VisitSymptomRef[] = [];

  return sorted.map((visit) => {
    const active = deduplicateSymptoms(visit.activeSymptoms || []);
    const prevMap = new Map(prevActive.map((s) => [symptomKey(s), s]));
    const activeMap = new Map(active.map((s) => [symptomKey(s), s]));

    const addedSymptoms = active.filter((s) => !prevMap.has(symptomKey(s)));
    const removedSymptoms = prevActive.filter((s) => !activeMap.has(symptomKey(s)));

    prevActive = active;

    return {
      ...visit,
      activeSymptoms: active,
      addedSymptoms,
      removedSymptoms,
      prescriptions: normalizePrescriptions(
        visit as PatientVisit & { prescription?: VisitPrescription | null }
      ),
    };
  });
}

function isValidDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

const router = express.Router();

// GET all patients (sorted by patientNumber ascending)
router.get("/", (_req, res) => {
  const db = readDB();
  const sorted = [...db.patients]
    .sort((a, b) => a.patientNumber - b.patientNumber)
    .map((p) => ({
      ...p,
      visits: (p.visits || []).map((v) => ({
        ...v,
        prescriptions: normalizePrescriptions(
          v as PatientVisit & { prescription?: VisitPrescription | null }
        ),
      })),
    }));
  res.json(sorted);
});

// GET single patient by id
router.get("/:id", (req, res) => {
  const db = readDB();
  const patient = db.patients.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  res.json({
    ...patient,
    visits: (patient.visits || []).map((v) => ({
      ...v,
      prescriptions: normalizePrescriptions(
        v as PatientVisit & { prescription?: VisitPrescription | null }
      ),
    })),
  });
});

// POST create a new patient
router.post("/", (req, res) => {
  const { patientNumber, name, description, visitDate, notes } = req.body as {
    patientNumber?: number | string | null;
    name?: string;
    description?: string;
    visitDate?: string;
    notes?: string;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Patient name is required" });
  }

  const db = readDB();
  let assignedNumber: number;

  if (
    patientNumber !== undefined &&
    patientNumber !== null &&
    String(patientNumber).trim() !== ""
  ) {
    const parsed = Number(patientNumber);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res
        .status(400)
        .json({ error: "Patient number must be a positive integer" });
    }
    if (db.patients.some((p) => p.patientNumber === parsed)) {
      return res
        .status(409)
        .json({ error: `Patient number #${parsed} already exists` });
    }
    assignedNumber = parsed;
  } else {
    const maxNum = db.patients.reduce(
      (max, p) => (p.patientNumber > max ? p.patientNumber : max),
      0
    );
    assignedNumber = maxNum + 1;
  }

  const initialDate =
    visitDate && isValidDateString(visitDate)
      ? visitDate
      : new Date().toISOString().slice(0, 10);

  const now = new Date().toISOString();
  const newPatient: Patient = {
    id: nanoid(),
    patientNumber: assignedNumber,
    name: name.trim(),
    description: (description || "").trim(),
    createdAt: now,
    visits: [
      {
        date: initialDate,
        addedSymptoms: [],
        removedSymptoms: [],
        activeSymptoms: [],
        notes: (notes || "").trim() || undefined,
        prescriptions: [],
        updatedAt: now,
      },
    ],
  };

  db.patients.push(newPatient);
  writeDB(db);
  res.status(201).json(newPatient);
});

// PUT update patient metadata
router.put("/:id", (req, res) => {
  const { patientNumber, name, description } = req.body as {
    patientNumber?: number | string;
    name?: string;
    description?: string;
  };

  const db = readDB();
  const patient = db.patients.find((p) => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  if (patientNumber !== undefined && String(patientNumber).trim() !== "") {
    const parsed = Number(patientNumber);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res
        .status(400)
        .json({ error: "Patient number must be a positive integer" });
    }
    if (
      db.patients.some(
        (p) => p.id !== patient.id && p.patientNumber === parsed
      )
    ) {
      return res
        .status(409)
        .json({ error: `Patient number #${parsed} already exists` });
    }
    patient.patientNumber = parsed;
  }

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ error: "Patient name cannot be empty" });
    }
    patient.name = name.trim();
  }

  if (description !== undefined) {
    patient.description = description.trim();
  }

  writeDB(db);
  res.json(patient);
});

// DELETE patient
router.delete("/:id", (req, res) => {
  const db = readDB();
  const exists = db.patients.some((p) => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Patient not found" });
  db.patients = db.patients.filter((p) => p.id !== req.params.id);
  writeDB(db);
  res.status(204).send();
});

// PUT upsert a visit for a given YYYY-MM-DD date and recompute all diffs
router.put("/:id/visits/:date", (req, res) => {
  const { id, date } = req.params;
  if (!isValidDateString(date)) {
    return res.status(400).json({ error: "Invalid date format (YYYY-MM-DD)" });
  }

  const db = readDB();
  const patient = db.patients.find((p) => p.id === id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  const { activeSymptoms, notes, prescriptions } = req.body as {
    activeSymptoms?: VisitSymptomRef[];
    notes?: string;
    prescriptions?: VisitPrescription[];
  };

  if (!Array.isArray(activeSymptoms)) {
    return res.status(400).json({ error: "activeSymptoms array is required" });
  }

  const now = new Date().toISOString();
  const existingIdx = patient.visits.findIndex((v) => v.date === date);
  const existingVisit = existingIdx >= 0 ? patient.visits[existingIdx] : undefined;

  const updatedVisit: PatientVisit = {
    date,
    addedSymptoms: [],
    removedSymptoms: [],
    activeSymptoms: deduplicateSymptoms(activeSymptoms),
    notes: notes !== undefined ? notes.trim() || undefined : existingVisit?.notes,
    prescriptions:
      prescriptions !== undefined
        ? prescriptions.filter((p) => p && p.medicineName?.trim())
        : existingVisit
        ? normalizePrescriptions(
            existingVisit as PatientVisit & {
              prescription?: VisitPrescription | null;
            }
          )
        : [],
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    patient.visits[existingIdx] = updatedVisit;
  } else {
    patient.visits.push(updatedVisit);
  }

  patient.visits = recomputeVisitDiffs(patient.visits);
  writeDB(db);
  res.json(patient);
});

// DELETE a visit by date and recompute remaining diffs
router.delete("/:id/visits/:date", (req, res) => {
  const { id, date } = req.params;
  const db = readDB();
  const patient = db.patients.find((p) => p.id === id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  const beforeCount = patient.visits.length;
  patient.visits = patient.visits.filter((v) => v.date !== date);
  if (patient.visits.length === beforeCount) {
    return res.status(404).json({ error: "Visit not found" });
  }

  patient.visits = recomputeVisitDiffs(patient.visits);
  writeDB(db);
  res.json(patient);
});

export default router;
