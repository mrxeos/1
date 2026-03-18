// FIX: Removed a self-import that caused a conflict with the type declarations within this file.

export interface Patient {
  id?: number;
  fileNumber: number;
  name: string;
  birthDate: string;
  gender: 'ذكر' | 'أنثى';
  chronicComplaints: string;
  diseaseHistory: string;
  city: string;
  doctorNotes?: string;
}

export interface Visit {
  id?: number;
  patientId: number;
  date: string;
  createdAt?: number;
  type: 'كشف' | 'استشارة' | 'كشف بدون مقابل' | 'استشارة بدون مقابل';
  weight: number;
  temperature: number;
  symptoms: string;
  diagnosis: string;
  prescriptionId?: number;
  followUpForVisitId?: number; // ID of the parent 'كشف' visit
  price?: number;
}

export interface Medicine {
  id?: number;
  name: string;
  form: 'شراب' | 'أقراص' | 'حقن' | 'نقط' | 'قطره' | 'لبوس' | 'بخاخ' | 'كريم' | 'مرهم' | 'لبن اطفال' | 'جل' | 'بودرة' | 'غسول' | 'أكياس';
  dosages: string[];
  notes: string;
}

export interface PrescriptionItem {
  medicineId: number;
  medicineName: string;
  form: Medicine['form'];
  dosage: string;
  notes: string;
  quantity?: number;
}

export interface Prescription {
  id?: number;
  visitId: number;
  patientId: number;
  items: PrescriptionItem[];
  doctorNotes: string;
  date: string;
  requiredTests?: string;
  requiredScans?: string;
  followUpDate?: string;
  symptoms?: string;
}

export interface PrescriptionTemplateItem {
  medicineId: number;
  dosage: string;
  notes: string;
}

export interface PrescriptionTemplate {
  id?: number;
  name: string;
  items: PrescriptionTemplateItem[];
  diagnosis?: string;
  doctorNotes?: string;
}

// FIX: Added WaitingListItem interface for the waiting list feature.
export interface WaitingListItem {
  id?: number;
  patientId: number;
  patientName: string;
  patientFileNumber: number;
  addedAt: number;
  isEmergency?: boolean;
}

export type ExpenseCategory = 'ايجار' | 'مرتبات الموظفين' | 'الفواتير' | 'اخرى';

export interface Expense {
  id?: number;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
}

export type Role = 'Doctor' | 'Assistant' | 'Display';

export interface User {
  id: number;
  username: string;
  password?: string;
  role: Role;
}

export enum View {
  Patients = 'المرضى',
  WaitingList = 'قائمة الانتظار',
  Medicines = 'الأدوية',
  Prescriptions = 'الوصفات الطبية',
  Statistics = 'الإحصاء',
  Expenses = 'المصروفات',
  Reports = 'التقارير',
  Accounts = 'المستخدمين',
  About = 'عن المطور',
  Settings = 'الإعدادات',
  PrescriptionSettings = 'ضبط الروشتة',
}

export interface DiseaseSuggestion {
  disease: string;
  probability: number;
}

export interface Symptom {
    id?: number;
    name: string;
}

export interface Diagnosis {
    id?: number;
    name: string;
}

export interface PrescriptionFieldSetting {
    enabled: boolean;
    showLabel: boolean;
    label: string;
    top: string;
    horizontalEdge: 'right' | 'left';
    horizontalOffset: string;
    textAlign: 'right' | 'left';
}

export interface PrescriptionSettings {
  headerText: string;
  footerText: string;
  showDoctorNotes: boolean;
  fontSize: number;
  fontFamily: string;
  paperSize: 'A4' | 'A5' | 'auto';
  headerAreaHeight: number;
  // New granular controls
  patientName: PrescriptionFieldSetting;
  patientAge: PrescriptionFieldSetting;
  visitDate: PrescriptionFieldSetting;
  patientWeight: PrescriptionFieldSetting;
  temperature: PrescriptionFieldSetting;
  fileNumber: PrescriptionFieldSetting;
  symptoms: PrescriptionFieldSetting;
  diagnosis: PrescriptionFieldSetting;
}