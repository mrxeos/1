import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getAllPrescriptions, getPatientById, getAllMedicines, addPrescriptionTemplate, getAllPrescriptionTemplates, deletePrescriptionTemplate, updatePrescriptionTemplate, getAllVisits } from '../services/db';
import { Prescription, Patient, Medicine, PrescriptionTemplate, PrescriptionTemplateItem, Visit } from '../types';
import PrescriptionPrint from './PrescriptionPrint';
import { PlusIcon } from './icons';
import { getSettings } from '../services/settingsService';

const CUSTOM_DOSAGE_VALUE = "__custom__";

const toArabicDigits = (str: string | number): string => {
    return String(str).replace(/[0-9]/g, (w) => "٠١٢٣٤٥٦٧٨٩"[parseInt(w)]);
};

// A reusable searchable select component
interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If user clicks outside and input text doesn't match selection, revert it
        if (selectedOption && searchTerm !== selectedOption.label) {
          setSearchTerm(selectedOption.label);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, selectedOption, searchTerm]);

  const filteredOptions = useMemo(() => options.filter(option =>
    option.label.toLowerCase().startsWith(searchTerm.toLowerCase())
  ), [options, searchTerm]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    const selected = options.find(o => o.value === optionValue);
    setSearchTerm(selected ? selected.label : '');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
    if (e.target.value === '') {
      onChange('');
    }
  };

  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm('');
    }
  }, [selectedOption]);

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef}>
      <input
        type="text"
        className="input"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder || 'ابحث واختر...'}
        autoComplete="off"
      />
      {isOpen && (
        <div className="searchable-select-dropdown">
          {filteredOptions.length > 0 ? filteredOptions.map(option => (
            <div
              key={option.value}
              className={`searchable-select-option ${option.value === value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          )) : (
            <div className="searchable-select-option" style={{ color: 'var(--text-secondary)' }}>لا توجد نتائج</div>
          )}
        </div>
      )}
    </div>
  );
};

const PrescriptionsView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'history' | 'templates'>('history');

    // State for History View
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [patients, setPatients] = useState<Map<number, Patient>>(new Map());
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // State for Templates View
    const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PrescriptionTemplate | null>(null);
    const [newTemplate, setNewTemplate] = useState<{name: string, items: PrescriptionTemplateItem[], diagnosis?: string, doctorNotes?: string}>({ name: '', items: [], diagnosis: '', doctorNotes: '' });
    const [selectedMedicineId, setSelectedMedicineId] = useState('');
    const [dosage, setDosage] = useState('');
    const [isCustomDosage, setIsCustomDosage] = useState(false);

    const componentToPrintRef = useRef(null);
    
    const selectedMedicine = useMemo(() => medicines.find(m => m.id === parseInt(selectedMedicineId)), [selectedMedicineId, medicines]);
    const medicineOptions = useMemo(() => medicines.map(med => ({
        value: med.id!.toString(),
        label: med.name,
    })), [medicines]);


    const fetchHistoryData = useCallback(async () => {
        const [allPrescriptions, allVisits] = await Promise.all([
            getAllPrescriptions(),
            getAllVisits(),
        ]);
        setPrescriptions(allPrescriptions);
        setVisits(allVisits);

        const patientIds = [...new Set(allPrescriptions.map(p => p.patientId))];
        const patientMap = new Map<number, Patient>();
        for (const id of patientIds) {
            const patient = await getPatientById(id as number);
            if (patient) {
                patientMap.set(id as number, patient);
            }
        }
        setPatients(patientMap);
    }, []);

    const fetchTemplatesData = useCallback(async () => {
        const allTemplates = await getAllPrescriptionTemplates();
        setTemplates(allTemplates);
        if (medicines.length === 0) {
            const allMedicines = await getAllMedicines();
             // Sort medicines alphabetically by name (Arabic)
            const sortedMedicines = allMedicines.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            setMedicines(sortedMedicines);
        }
    }, [medicines.length]);

    useEffect(() => {
        if (viewMode === 'history') {
            fetchHistoryData();
        } else {
            fetchTemplatesData();
        }
    }, [viewMode, fetchHistoryData, fetchTemplatesData]);
    
    useEffect(() => {
        if (viewMode === 'history') {
            setSelectedPrescription(null);
            setSelectedVisit(null);
        }
    }, [selectedDate, viewMode]);

    const filteredPrescriptions = useMemo(() => {
        if (viewMode !== 'history') return [];
        return prescriptions.filter(p => p.date === selectedDate);
    }, [prescriptions, selectedDate, viewMode]);


    const handleSelectPrescription = (prescription: Prescription) => {
        setSelectedPrescription(prescription);
        const associatedVisit = visits.find(v => v.id === prescription.visitId);
        setSelectedVisit(associatedVisit || null);
    };

    const handlePrint = async () => {
        const printContent = componentToPrintRef.current;
        if (!printContent) return;
        
        const currentSettings = await getSettings();
        const paperSize = currentSettings.paperSize;

        let pageStyle = '@page { margin: 0; }';
        if (paperSize && paperSize !== 'auto') {
            pageStyle = `@page { size: ${paperSize}; margin: 0; }`;
        }

        const baseStyles = Array.from(document.styleSheets)
            .map(sheet => {
                try {
                    return Array.from(sheet.cssRules).map(rule => rule.cssText).join('');
                } catch (e) { return ''; }
            }).join('');
        
        const printThemeOverrides = `
            :root {
                /* Keep brand color from the active theme */
                --primary: ${getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()};
                /* Force standard print colors (black on white) */
                --background: #ffffff;
                --surface: #ffffff;
                --surface-alt: #f9fafb;
                --text-primary: #000000;
                --text-secondary: #4a5568;
                --border: #e2e8f0;
                /* Keep border radius from the active theme */
                --border-radius: ${getComputedStyle(document.documentElement).getPropertyValue('--border-radius').trim()};
                color-scheme: light; /* Hint to the browser for a light theme context */
            }
        `;

        const printLayoutOverrides = `
            ${pageStyle}
            html, body {
                height: 100%; /* Ensure full height context */
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            body { margin: 0; }
            .no-print { display: none !important; }
            .prescription-print {
                padding: 1.25cm !important; height: 100%; box-sizing: border-box !important;
                border: none !important; box-shadow: none !important;
                display: flex; flex-direction: column;
            }
            .prescription-header *, .prescription-footer * {
                margin: 0 !important; padding: 0 !important; line-height: 1.5 !important;
            }
            .prescription-header, .prescription-footer { flex-shrink: 0; }
            .prescription-body { flex-grow: 1; }
            .prescription-items-container { gap: 0 !important; }
            .prescription-item-print { padding-bottom: 0.25rem !important; margin-bottom: 1rem !important; line-height: 1.4 !important; }
            .prescription-notes-section, .prescription-follow-up { margin-top: 0.75rem !important; line-height: 1.4 !important; }
            .signature-area { display: none !important; }
            .prescription-info-item {
                /* Aggressive reset for print layout issues in specific renderers */
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                line-height: 1.0 !important;
                height: auto !important;
            }
            .prescription-info-item > * {
                /* Target children to ensure no inherited extra spacing */
                line-height: 1.0 !important;
                margin: 0 !important;
                padding: 0 !important;
                vertical-align: baseline !important;
            }
        `;

        const content = (printContent as HTMLDivElement).innerHTML;
        const printWindow = window.open('', '', 'height=800,width=800');

        if (printWindow) {
            printWindow.document.write(`
                <html lang="ar" dir="rtl" style="height: 100%;">
                    <head>
                        <title>وصفة طبية</title>
                        <style>
                            ${baseStyles}
                            ${printThemeOverrides}
                            ${printLayoutOverrides}
                        </style>
                    </head>
                    <body>
                        ${content}
                    </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            };
        }
    };

    // --- Template Management Functions ---
    const handleSelectMedicineChange = (medId: string) => {
        setSelectedMedicineId(medId);
        setDosage('');
        
        const med = medicines.find(m => m.id === parseInt(medId));
        if (med && med.dosages.length === 0) {
          setIsCustomDosage(true);
        } else {
          setIsCustomDosage(false);
        }
    };
    
    const handleSelectDosage = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === CUSTOM_DOSAGE_VALUE) {
          setIsCustomDosage(true);
          setDosage('');
        } else {
          setIsCustomDosage(false);
          setDosage(value);
        }
    };

    const handleAddMedicineToTemplate = () => {
        const medicine = medicines.find(m => m.id === parseInt(selectedMedicineId));
        if (medicine && dosage) {
            const newItem: PrescriptionTemplateItem = {
                medicineId: medicine.id!,
                dosage: dosage,
                notes: medicine.notes,
            };
            setNewTemplate({ ...newTemplate, items: [...newTemplate.items, newItem] });
            setSelectedMedicineId('');
            setDosage('');
            setIsCustomDosage(false);
        }
    };

    const handleRemoveMedicineFromTemplate = (index: number) => {
        setNewTemplate({ ...newTemplate, items: newTemplate.items.filter((_, i) => i !== index) });
    };

    const handleCancel = () => {
        setIsAddingOrEditing(false);
        setEditingTemplate(null);
        setNewTemplate({ name: '', items: [], diagnosis: '', doctorNotes: '' });
    };

    const handleStartEditTemplate = (template: PrescriptionTemplate) => {
        setEditingTemplate(template);
        setNewTemplate({ 
            name: template.name, 
            items: template.items,
            diagnosis: template.diagnosis || '',
            doctorNotes: template.doctorNotes || '',
        });
        setIsAddingOrEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplate.name || newTemplate.items.length === 0) {
            alert('يرجى إدخال اسم للوصفة وإضافة دواء واحد على الأقل.');
            return;
        }

        if (editingTemplate) {
            await updatePrescriptionTemplate(editingTemplate.id!, newTemplate);
        } else {
            await addPrescriptionTemplate(newTemplate as PrescriptionTemplate);
        }

        handleCancel();
        fetchTemplatesData();
    };
    
    const handleDeleteTemplate = async (id: number) => {
        if(window.confirm('هل أنت متأكد من حذف هذه الوصفة الجاهزة؟')) {
            await deletePrescriptionTemplate(id);
            fetchTemplatesData();
        }
    };


    const renderHistoryView = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
            <div className="md:col-span-1 flex flex-col min-h-0 border-e pe-4 border-default">
                <div className="mb-4 flex-shrink-0">
                    <label htmlFor="prescription-date" className="input-label-sm">عرض وصفات يوم:</label>
                    <input
                        type="date"
                        id="prescription-date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="input mt-1"
                    />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredPrescriptions.length > 0 ? (
                        filteredPrescriptions.map(p => (
                            <div key={p.id} onClick={() => handleSelectPrescription(p)} className={`list-item ${selectedPrescription?.id === p.id ? 'active' : ''}`}>
                                <p className="font-bold">{patients.get(p.patientId)?.name || 'مريض غير معروف'}</p>
                                <p className="text-sm">
                                    {p.createdAt ? new Date(p.createdAt).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }) : new Date(p.date).toLocaleDateString('ar-EG')}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-4 text-secondary">لا توجد وصفات طبية لهذا اليوم.</div>
                    )}
                </div>
            </div>
            <div className="md:col-span-2 overflow-y-auto">
                {selectedPrescription ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                           <h3 className="text-xl font-bold">تفاصيل الوصفة</h3>
                           <button onClick={handlePrint} className="btn btn-accent">طباعة</button>
                        </div>
                        
                        <div ref={componentToPrintRef}>
                            <PrescriptionPrint prescription={selectedPrescription} patient={patients.get(selectedPrescription.patientId)} visit={selectedVisit} />
                        </div>
                    </div>
                ) : (
                    <div className="placeholder-view">
                        <p>اختر وصفة طبية لعرض تفاصيلها.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderTemplatesView = () => {
        return (
            <div className="flex-col">
                <div className="view-header">
                    <h3 className="text-xl font-bold">قائمة الوصفات الجاهزة</h3>
                    <button onClick={() => isAddingOrEditing ? handleCancel() : setIsAddingOrEditing(true)} className="btn btn-secondary">
                        <span className="icon-wrapper icon-sm me-2">
                            <PlusIcon />
                        </span>
                        {isAddingOrEditing ? 'إلغاء' : 'إضافة وصفة جديدة'}
                    </button>
                </div>

                {isAddingOrEditing && (
                    <div className="form-container-alt">
                        <h3 className="form-title">{editingTemplate ? 'تعديل الوصفة الجاهزة' : 'إضافة وصفة جديدة'}</h3>
                        <form onSubmit={handleSaveTemplate} className="space-y-3">
                            <input type="text" placeholder="اسم الوصفة (مثال: نزلة برد)" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} className="input" required />
                            <input type="text" placeholder="التشخيص الافتراضي (اختياري)" value={newTemplate.diagnosis} onChange={e => setNewTemplate({...newTemplate, diagnosis: e.target.value})} className="input" />
                            <textarea placeholder="ملاحظات الطبيب الافتراضية (اختياري)" value={newTemplate.doctorNotes || ''} onChange={e => setNewTemplate({...newTemplate, doctorNotes: e.target.value})} className="input" />

                            <div className="form-container-alt">
                                <div className="flex gap-2 items-start">
                                    <div className="flex-1 flex flex-col gap-2">
                                        <SearchableSelect
                                            options={medicineOptions}
                                            value={selectedMedicineId}
                                            onChange={handleSelectMedicineChange}
                                            placeholder="ابحث عن دواء أو اختر..."
                                        />
                                        
                                        {selectedMedicine && !isCustomDosage && selectedMedicine.dosages.length > 0 && (
                                            <select value={dosage} onChange={handleSelectDosage} className="input">
                                                <option value="">اختر جرعة</option>
                                                {selectedMedicine.dosages.map((d, i) => <option key={i} value={d}>{toArabicDigits(d)}</option>)}
                                                <option value={CUSTOM_DOSAGE_VALUE}>جرعة مخصصة...</option>
                                            </select>
                                        )}
                                        
                                        {selectedMedicineId && (isCustomDosage || (selectedMedicine && selectedMedicine.dosages.length === 0)) && (
                                           <input 
                                              type="text" 
                                              placeholder="أدخل الجرعة" 
                                              value={dosage} 
                                              onChange={e => setDosage(e.target.value)} 
                                              className="input"
                                           />
                                        )}
                                    </div>
                                    <button type="button" onClick={handleAddMedicineToTemplate} className="btn btn-accent btn-icon" disabled={!selectedMedicineId || !dosage}>+</button>
                                </div>
                                <div className="prescription-items-list mt-2">
                                    {newTemplate.items.map((item, index) => {
                                        const medicine = medicines.find(m => m.id === item.medicineId);
                                        return (
                                            <div key={index} className="prescription-item">
                                                <div>
                                                <p className="font-semibold">{medicine?.name}</p>
                                                <p className="text-sm text-primary font-bold">{toArabicDigits(item.dosage)}</p>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveMedicineFromTemplate(index)} className="btn-action btn-danger">حذف</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex justify-end mt-3">
                                <button type="submit" className="btn btn-success">
                                    {editingTemplate ? 'حفظ التعديلات' : 'حفظ الوصفة'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-3 overflow-y-auto">
                    {templates.map(template => (
                        <div key={template.id} className="template-card">
                            <div>
                                <p className="font-bold text-lg">{template.name}</p>
                                <p className="text-sm text-secondary">{toArabicDigits(template.items.length)} أدوية</p>
                            </div>
                            <div className="whitespace-nowrap">
                                <button onClick={() => handleStartEditTemplate(template)} className="btn-action btn-info">تعديل</button>
                                <button onClick={() => handleDeleteTemplate(template.id!)} className="btn-action btn-danger">حذف</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card h-full flex-col">
            <div className="view-header">
                <h2 className="view-title">الوصفات الطبية</h2>
                <div className="tabs">
                    <button onClick={() => setViewMode('history')} className={`tab-btn ${viewMode === 'history' ? 'active' : ''}`}>عرض المحفوظات</button>
                    <button onClick={() => setViewMode('templates')} className={`tab-btn ${viewMode === 'templates' ? 'active' : ''}`}>إدارة الوصفات الجاهزة</button>
                </div>
            </div>
            {viewMode === 'history' ? renderHistoryView() : renderTemplatesView()}
        </div>
    );
};

export default PrescriptionsView;