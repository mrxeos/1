import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PrescriptionSettings, Prescription, Patient, Visit, User, Symptom, PrescriptionFieldSetting, Diagnosis } from '../types';
import { getSettings, saveSettings } from '../services/settingsService';
import { exportDB, importDB, getAllSymptoms, addSymptom, deleteSymptom, getAllDiagnoses, addDiagnosis, deleteDiagnosis } from '../services/db';
import PrescriptionPrint from './PrescriptionPrint';

const fontOptions = [
    { name: 'System Default', value: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
    { name: 'Tahoma', value: 'Tahoma, Geneva, Verdana, sans-serif' },
    { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { name: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { name: 'Courier New', value: "'Courier New', Courier, monospace" }
];

// --- Mini Editor Component and its dependencies ---

const BoldIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    </svg>
);
const ItalicIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line>
    </svg>
);
const UnderlineIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line>
    </svg>
);
const AlignCenterIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line>
    </svg>
);
const ColorSwatch = ({ colorVar }: { colorVar: string }) => (
    <div className="w-4 h-4 rounded-full border border-gray-400" style={{ backgroundColor: `var(${colorVar})` }} />
);

interface MiniEditorProps {
    value: string;
    onChange: (event: { target: { name: string; value: string } }) => void;
    name: string;
    rows: number;
}
const MiniEditor: React.FC<MiniEditorProps> = ({ value, onChange, name, rows }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const applyStyle = (tag: string, styles?: React.CSSProperties) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const { selectionStart, selectionEnd, value: currentValue } = textarea;
        const selectedText = currentValue.substring(selectionStart, selectionEnd);

        if (!selectedText) {
             alert('الرجاء تحديد النص أولاً لتطبيق التنسيق.');
             return;
        }

        const styleString = styles ? ` style="${Object.entries(styles).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';')}"` : '';
        const replacement = `<${tag}${styleString}>${selectedText}</${tag}>`;

        const newValue = 
            currentValue.substring(0, selectionStart) + 
            replacement + 
            currentValue.substring(selectionEnd);
            
        onChange({ target: { name, value: newValue } });
    };

    // FIX: Refactored ToolbarButton to use a standard interface and React.FC typing
    // to resolve incorrect "missing children" compiler errors.
    interface ToolbarButtonProps {
        onClick: () => void;
        children: React.ReactNode;
        title: string;
    }
    const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, children, title }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="editor-toolbar-btn"
        >
            {children}
        </button>
    );

    return (
        <div>
            <div className="editor-toolbar">
                <ToolbarButton onClick={() => applyStyle('b')} title="غليظ"><BoldIcon /></ToolbarButton>
                <ToolbarButton onClick={() => applyStyle('i')} title="مائل"><ItalicIcon /></ToolbarButton>
                <ToolbarButton onClick={() => applyStyle('u')} title="تحته خط"><UnderlineIcon /></ToolbarButton>
                <ToolbarButton onClick={() => applyStyle('div', { textAlign: 'center' })} title="توسيط"><AlignCenterIcon /></ToolbarButton>
                <div className="editor-toolbar-divider"></div>
                <ToolbarButton onClick={() => applyStyle('span', { color: 'var(--primary)' })} title="لون أساسي"><ColorSwatch colorVar="--primary" /></ToolbarButton>
                <ToolbarButton onClick={() => applyStyle('span', { color: 'var(--text-secondary)' })} title="لون ثانوي"><ColorSwatch colorVar="--text-secondary" /></ToolbarButton>
            </div>
            <textarea
                ref={textareaRef}
                name={name}
                value={value || ''}
                onChange={onChange}
                rows={rows}
                className="input editor-textarea"
                spellCheck="false"
            />
        </div>
    );
};

// --- Settings Field Control Component ---
interface FieldControlProps {
    fieldKey: keyof Omit<PrescriptionSettings, 'headerText' | 'footerText' | 'fontSize' | 'fontFamily' | 'paperSize' | 'showDoctorNotes' | 'headerAreaHeight'>;
    title: string;
    settings: PrescriptionSettings;
    onChange: (field: keyof PrescriptionSettings, property: keyof PrescriptionFieldSetting, value: any) => void;
}

const FieldControl: React.FC<FieldControlProps> = ({ fieldKey, title, settings, onChange }) => {
    const fieldSettings = settings[fieldKey] as PrescriptionFieldSetting;

    return (
        <div className="settings-field-control">
            <label className="checkbox-label-alt !bg-transparent !p-0">
                <input
                    type="checkbox"
                    checked={fieldSettings.enabled}
                    onChange={(e) => onChange(fieldKey, 'enabled', e.target.checked)}
                    className="checkbox"
                />
                <span className="font-semibold">{title}</span>
            </label>
            {fieldSettings.enabled && (
                <div className="settings-field-options">
                    <label className="checkbox-label-alt">
                        <input
                            type="checkbox"
                            checked={fieldSettings.showLabel}
                            onChange={(e) => onChange(fieldKey, 'showLabel', e.target.checked)}
                            className="checkbox"
                        />
                        <span>عرض النص التعريفي</span>
                    </label>
                    <input
                        type="text"
                        value={fieldSettings.label}
                        onChange={(e) => onChange(fieldKey, 'label', e.target.value)}
                        className="input"
                        disabled={!fieldSettings.showLabel}
                    />
                     <div>
                        <label className="input-label-sm mt-2">محاذاة النص</label>
                        <select
                            value={fieldSettings.textAlign}
                            onChange={(e) => onChange(fieldKey, 'textAlign', e.target.value)}
                            className="input mt-1"
                        >
                            <option value="right">محاذاة لليمين</option>
                            <option value="left">محاذاة لليسار</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Main PrescriptionSettingsView Component ---
interface PrescriptionSettingsViewProps {
    user: User;
}

const PrescriptionSettingsView: React.FC<PrescriptionSettingsViewProps> = ({ user }) => {
    const [settings, setSettings] = useState<PrescriptionSettings | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [symptoms, setSymptoms] = useState<Symptom[]>([]);
    const [newSymptomName, setNewSymptomName] = useState('');
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [newDiagnosisName, setNewDiagnosisName] = useState('');
    
    const fetchSettings = useCallback(async () => {
        const s = await getSettings();
        setSettings(s);
    }, []);

    const fetchSymptoms = useCallback(async () => {
        const allSymptoms = await getAllSymptoms();
        setSymptoms(allSymptoms);
    }, []);

    const fetchDiagnoses = useCallback(async () => {
        const allDiagnoses = await getAllDiagnoses();
        setDiagnoses(allDiagnoses);
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchSymptoms();
        fetchDiagnoses();
    }, [fetchSettings, fetchSymptoms, fetchDiagnoses]);

    if (!settings) return <div className="p-8 text-center">جاري تحميل الإعدادات...</div>;

    const samplePatient: Patient = {
        id: 1,
        fileNumber: 1001,
        name: 'اسم المريض النموذجي',
        birthDate: new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString(), // 5 years old
        gender: 'ذكر',
        chronicComplaints: '',
        diseaseHistory: '',
        city: 'مدينة افتراضية',
    };
    
    const samplePrescription: Prescription = {
        id: 1,
        patientId: 1,
        visitId: 1,
        date: new Date().toISOString(),
        doctorNotes: 'الراحة التامة وتناول السوائل بكثرة.',
        items: [
            { medicineId: 1, medicineName: 'Amoxil Syrup', form: 'شراب', dosage: '5 مل كل 8 ساعات', notes: '' },
            { medicineId: 2, medicineName: 'Cetal Syrup', form: 'شراب', dosage: '5 مل عند اللزوم', notes: '' },
        ],
        symptoms: 'Fever - Continuous cough - Headache.',
    };

    const sampleVisit: Visit = {
        id: 1,
        patientId: 1,
        date: new Date().toISOString(),
        type: 'كشف',
        weight: 18.5,
        temperature: 37.8,
        symptoms: 'Sample symptoms',
        diagnosis: 'Acute Bronchitis',
        prescriptionId: 1,
    };

    const handleSettingsInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [name]: isCheckbox ? (e.target as HTMLInputElement).checked : type === 'range' ? parseFloat(value) : value,
            };
        });
    };

    const handleFieldControlChange = (field: keyof PrescriptionSettings, property: keyof PrescriptionFieldSetting, value: any) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [field]: {
                    ...(prev[field] as any),
                    [property]: value,
                },
            };
        });
    };

    const handleFieldPositionChange = (
        fieldKey: keyof PrescriptionSettings, 
        newPosition: { top: string; horizontalEdge: 'left' | 'right'; horizontalOffset: string }
    ) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [fieldKey]: {
                    ...(prev[fieldKey] as any),
                    top: newPosition.top,
                    horizontalEdge: newPosition.horizontalEdge,
                    horizontalOffset: newPosition.horizontalOffset,
                },
            };
        });
    };


    const handleFontSizeChange = (size: number) => {
        setSettings(prev => {
            if (!prev) return null;
            return { ...prev, fontSize: size };
        });
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        setSaveStatus('saving');
        await saveSettings(settings);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleAddSymptom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newSymptomName.trim()) {
            try {
                await addSymptom({ name: newSymptomName.trim() });
                setNewSymptomName('');
                fetchSymptoms();
            } catch (error) {
                alert('هذا العرض موجود بالفعل.');
                console.error("Failed to add symptom:", error);
            }
        }
    };

    const handleDeleteSymptom = async (id: number) => {
        await deleteSymptom(id);
        fetchSymptoms();
    };
    
    const handleAddDiagnosis = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newDiagnosisName.trim()) {
            try {
                await addDiagnosis({ name: newDiagnosisName.trim() });
                setNewDiagnosisName('');
                fetchDiagnoses();
            } catch (error) {
                alert('هذا التشخيص موجود بالفعل.');
                console.error("Failed to add diagnosis:", error);
            }
        }
    };

    const handleDeleteDiagnosis = async (id: number) => {
        await deleteDiagnosis(id);
        fetchDiagnoses();
    };


    return (
        <div className="card h-full flex-col">
            <h2 className="view-title">ضبط الروشتة</h2>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
                
                <div className="overflow-y-auto pr-4 space-y-10">
                    {/* Symptom Management */}
                    <section>
                        <h4 className="settings-section-title">إدارة الأعراض الشائعة</h4>
                        <div className="form-container-alt">
                            <form onSubmit={handleAddSymptom} className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="أضف عرض جديد للقائمة..." 
                                    value={newSymptomName}
                                    onChange={(e) => setNewSymptomName(e.target.value)}
                                    className="input flex-1"
                                />
                                <button type="submit" className="btn btn-accent">إضافة</button>
                            </form>
                            <div className="flex flex-wrap gap-2">
                                {symptoms.map((symptom) => (
                                    <div key={symptom.id} className="tag tag-accent">
                                        {symptom.name}
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteSymptom(symptom.id!)}
                                            className="tag-delete-btn"
                                            aria-label={`حذف عرض ${symptom.name}`}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    
                    {/* Diagnosis Management */}
                    <section>
                        <h4 className="settings-section-title">إدارة التشخيصات الشائعة</h4>
                        <div className="form-container-alt">
                            <form onSubmit={handleAddDiagnosis} className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="أضف تشخيص جديد للقائمة..." 
                                    value={newDiagnosisName}
                                    onChange={(e) => setNewDiagnosisName(e.target.value)}
                                    className="input flex-1"
                                />
                                <button type="submit" className="btn btn-accent">إضافة</button>
                            </form>
                            <div className="flex flex-wrap gap-2">
                                {diagnoses.map((diagnosis) => (
                                    <div key={diagnosis.id} className="tag tag-accent">
                                        {diagnosis.name}
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteDiagnosis(diagnosis.id!)}
                                            className="tag-delete-btn"
                                            aria-label={`حذف تشخيص ${diagnosis.name}`}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Prescription Settings */}
                    <section>
                        <h4 className="settings-section-title">إعدادات شكل الروشتة</h4>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="headerText" className="input-label text-lg mb-2">محتوى رأس الروشتة (Header)</label>
                                <MiniEditor 
                                    name="headerText" 
                                    value={settings.headerText} 
                                    onChange={handleSettingsInputChange} 
                                    rows={6} 
                                />
                            </div>
                            <div>
                                <label htmlFor="footerText" className="input-label text-lg mb-2">محتوى تذييل الروشتة (Footer)</label>
                                <MiniEditor 
                                    name="footerText" 
                                    value={settings.footerText} 
                                    onChange={handleSettingsInputChange} 
                                    rows={4} 
                                />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="input-label-sm mb-2">حجم الخط</h3>
                                    <div className="tabs tabs-sm">
                                        <button onClick={() => handleFontSizeChange(14)} className={`tab-btn ${settings.fontSize === 14 ? 'active' : ''}`}>صغير</button>
                                        <button onClick={() => handleFontSizeChange(16)} className={`tab-btn ${settings.fontSize === 16 ? 'active' : ''}`}>متوسط</button>
                                        <button onClick={() => handleFontSizeChange(18)} className={`tab-btn ${settings.fontSize === 18 ? 'active' : ''}`}>كبير</button>
                                    </div>
                                </div>
                                 <div>
                                    <h3 className="input-label-sm mb-2">نوع الخط</h3>
                                    <select name="fontFamily" value={settings.fontFamily} onChange={handleSettingsInputChange} className="input">
                                        {fontOptions.map(font => (<option key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.name}</option>))}
                                    </select>
                                </div>
                                 <div>
                                    <h3 className="input-label-sm mb-2">مقاس ورق الطباعة</h3>
                                    <select name="paperSize" value={settings.paperSize} onChange={handleSettingsInputChange} className="input">
                                        <option value="A4">A4</option>
                                        <option value="A5">A5</option>
                                        <option value="auto">تلقائي (حسب الطابعة)</option>
                                    </select>
                                </div>
                                 <div>
                                    <label htmlFor="headerAreaHeight" className="input-label-sm mb-2">
                                        المسافة العلوية (Header) ({settings.headerAreaHeight}%)
                                    </label>
                                    <input
                                        type="range"
                                        id="headerAreaHeight"
                                        name="headerAreaHeight"
                                        min="5"
                                        max="40"
                                        step="1"
                                        value={settings.headerAreaHeight}
                                        onChange={handleSettingsInputChange}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <h3 className="input-label text-lg mb-2">العناصر المعروضة وتنسيقها</h3>
                                <p className="text-sm text-secondary mb-3">يمكنك الآن سحب وإفلات العناصر في نافذة المعاينة لتغيير مكانها.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldControl fieldKey="patientName" title="اسم المريض" settings={settings} onChange={handleFieldControlChange} />
                                    <FieldControl fieldKey="visitDate" title="تاريخ الزيارة" settings={settings} onChange={handleFieldControlChange} />
                                    <FieldControl fieldKey="patientAge" title="عمر المريض" settings={settings} onChange={handleFieldControlChange} />
                                    <FieldControl fieldKey="patientWeight" title="وزن المريض" settings={settings} onChange={handleFieldControlChange} />
                                    <FieldControl fieldKey="temperature" title="درجة الحرارة" settings={settings} onChange={handleFieldControlChange} />
                                    <FieldControl fieldKey="diagnosis" title="التشخيص" settings={settings} onChange={handleFieldControlChange} />
                                    <FieldControl fieldKey="symptoms" title="الأعراض (C/O)" settings={settings} onChange={handleFieldControlChange} />
                                    <FieldControl fieldKey="fileNumber" title="رقم الملف" settings={settings} onChange={handleFieldControlChange} />
                                    
                                    <div className="settings-field-control">
                                        <label className="checkbox-label-alt !bg-transparent !p-0">
                                          <input type="checkbox" name="showDoctorNotes" checked={settings.showDoctorNotes} onChange={handleSettingsInputChange} className="checkbox" />
                                          <span className="font-semibold">ملاحظات الطبيب</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-4 border-default">
                            <button onClick={handleSaveSettings} className="btn btn-secondary w-full">
                                {saveStatus === 'saving' ? 'جاري الحفظ...' : saveStatus === 'saved' ? 'تم حفظ الإعدادات!' : 'حفظ إعدادات الروشتة'}
                            </button>
                        </div>
                    </section>
                </div>

                {/* Left side: Live Preview */}
                <div className="settings-preview">
                    <h3 className="text-lg font-bold text-center mb-4 text-secondary">معاينة حية</h3>
                    <div className="settings-preview-content">
                        <PrescriptionPrint 
                            prescription={samplePrescription}
                            patient={samplePatient}
                            visit={sampleVisit}
                            settingsOverride={settings}
                            isEditablePreview={true}
                            onFieldPositionChange={handleFieldPositionChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrescriptionSettingsView;