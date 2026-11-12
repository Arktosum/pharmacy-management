export type ID = string
export interface Medicine { id: ID; name: string }
export interface Disease { id: ID; name: string }
export interface Link { medicineId: ID; diseaseId: ID }


export type SearchType = 'medicine' | 'disease'


export interface SearchResponse {
    type: SearchType
    query: string
    matches: Array<{ id: ID; name: string }>
    related: Array<{ id: ID; name: string }>
}

export type KnowledgeSource = 'mapper' | 'tips'

export interface VisitSymptomRef {
    id: string
    name: string
    source: KnowledgeSource
}

export interface VisitPrescription {
    medicineId?: string
    medicineName: string
    source: KnowledgeSource | 'manual'
    potency?: string
    notes?: string
}

export interface PatientVisit {
    date: string // YYYY-MM-DD
    addedSymptoms: VisitSymptomRef[]
    removedSymptoms: VisitSymptomRef[]
    activeSymptoms: VisitSymptomRef[]
    notes?: string
    prescriptions: VisitPrescription[]
    updatedAt: string
}

export interface Patient {
    id: string
    patientNumber: number
    name: string
    description: string
    createdAt: string
    visits: PatientVisit[]
}
