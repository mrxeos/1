
import { Patient, Visit, Medicine, Prescription, PrescriptionTemplate, Expense, WaitingListItem, Symptom, Diagnosis } from '../types';

const API_URL = '/api';

// Helper to format local dates as YYYY-MM-DD without timezone shifts
const formatLocalISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper for fetch calls
async function apiFetch(path: string, options?: RequestInit) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'API request failed');
    }
    return response.json();
}

// Helper functions for data access
export const getAllPatients = (): Promise<Patient[]> => apiFetch('/patients');
export const getPatientById = (id: number): Promise<Patient> => apiFetch(`/patients/${id}`);
export const addPatient = async (patient: Omit<Patient, 'id' | 'fileNumber'>): Promise<number> => {
    const result = await apiFetch('/patients', {
        method: 'POST',
        body: JSON.stringify(patient),
    });
    return result.id;
};
export const checkPatientByName = async (name: string): Promise<boolean> => {
    const patients = await getAllPatients();
    return patients.some(p => p.name === name);
};
export const updatePatient = (id: number, updates: Partial<Patient>) => apiFetch(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
});
export const getVisitsByPatientId = (patientId: number): Promise<Visit[]> => apiFetch(`/visits/patient/${patientId}`);
export const getAllVisits = (): Promise<Visit[]> => apiFetch('/visits');

export const getVisitsForMonth = (year: number, month: number): Promise<Visit[]> => {
    const startDate = formatLocalISO(new Date(year, month, 1));
    const endDate = formatLocalISO(new Date(year, month + 1, 0));
    return apiFetch(`/visits/month?start=${startDate}&end=${endDate}`);
};

export const addVisit = async (visit: Visit): Promise<number> => {
    const result = await apiFetch('/visits', {
        method: 'POST',
        body: JSON.stringify(visit),
    });
    return result.id;
};
export const updateVisit = (id: number, updates: Partial<Visit>) => apiFetch(`/visits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
});
export const findLastExaminationForPatient = async (patientId: number): Promise<Visit | undefined> => {
    const visits = await getVisitsByPatientId(patientId);
    return visits.find(v => v.type === 'كشف' || v.type === 'كشف بدون مقابل');
};
export const getAllMedicines = (): Promise<Medicine[]> => apiFetch('/medicines');
export const addMedicine = async (medicine: Medicine): Promise<number> => {
    const result = await apiFetch('/medicines', {
        method: 'POST',
        body: JSON.stringify(medicine),
    });
    return result.id;
};
export const updateMedicine = (id: number, updates: Partial<Medicine>) => apiFetch(`/medicines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
});
export const deleteMedicine = (id: number) => apiFetch(`/medicines/${id}`, {
    method: 'DELETE',
});
export const getAllPrescriptions = (): Promise<Prescription[]> => apiFetch('/prescriptions');
export const getPrescriptionById = (id: number): Promise<Prescription> => apiFetch(`/prescriptions/${id}`);
export const addPrescription = async (prescription: Prescription): Promise<number> => {
    const result = await apiFetch('/prescriptions', {
        method: 'POST',
        body: JSON.stringify(prescription),
    });
    return result.id;
};
export const updatePrescription = (id: number, updates: Partial<Prescription>) => apiFetch(`/prescriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
});

// Prescription Templates
export const getAllPrescriptionTemplates = (): Promise<PrescriptionTemplate[]> => apiFetch('/templates');
export const addPrescriptionTemplate = async (template: PrescriptionTemplate): Promise<number> => {
    const result = await apiFetch('/templates', {
        method: 'POST',
        body: JSON.stringify(template),
    });
    return result.id;
};
export const updatePrescriptionTemplate = (id: number, updates: Partial<PrescriptionTemplate>) => apiFetch(`/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
});
export const deletePrescriptionTemplate = (id: number) => apiFetch(`/templates/${id}`, {
    method: 'DELETE',
});

// Expenses
export const getAllExpenses = (): Promise<Expense[]> => apiFetch('/expenses');

export const getExpensesForMonth = (year: number, month: number): Promise<Expense[]> => {
    const startDate = formatLocalISO(new Date(year, month, 1));
    const endDate = formatLocalISO(new Date(year, month + 1, 0));
    return apiFetch(`/expenses/month?start=${startDate}&end=${endDate}`);
};
export const addExpense = async (expense: Expense): Promise<number> => {
    const result = await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify(expense),
    });
    return result.id;
};
export const updateExpense = (id: number, updates: Partial<Expense>) => apiFetch(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
});
export const deleteExpense = (id: number) => apiFetch(`/expenses/${id}`, {
    method: 'DELETE',
});

// --- Waiting List ---
export const getWaitingList = (): Promise<WaitingListItem[]> => apiFetch('/waiting-list');
export const addToWaitingList = async (item: Omit<WaitingListItem, 'id' | 'addedAt'>): Promise<number> => {
    const result = await apiFetch('/waiting-list', {
        method: 'POST',
        body: JSON.stringify(item),
    });
    return result.id;
};
export const removeFromWaitingList = (id: number): Promise<void> => apiFetch(`/waiting-list/${id}`, {
    method: 'DELETE',
});

// --- Symptoms ---
export const getAllSymptoms = (): Promise<Symptom[]> => apiFetch('/symptoms');
export const addSymptom = async (symptom: Symptom): Promise<number> => {
    const result = await apiFetch('/symptoms', {
        method: 'POST',
        body: JSON.stringify(symptom),
    });
    return result.id;
};
export const deleteSymptom = (id: number) => apiFetch(`/symptoms/${id}`, {
    method: 'DELETE',
});

// --- Diagnoses ---
export const getAllDiagnoses = (): Promise<Diagnosis[]> => apiFetch('/diagnoses');
export const addDiagnosis = async (diagnosis: Diagnosis): Promise<number> => {
    const result = await apiFetch('/diagnoses', {
        method: 'POST',
        body: JSON.stringify(diagnosis),
    });
    return result.id;
};
export const deleteDiagnosis = (id: number) => apiFetch(`/diagnoses/${id}`, {
    method: 'DELETE',
});

// --- Backup and Restore ---
export const exportDB = async (): Promise<any> => {
    const response = await apiFetch('/backup/export');
    return response;
};

export const importDB = async (data: any): Promise<void> => {
    await apiFetch('/backup/import', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
