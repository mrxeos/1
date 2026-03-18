
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Patient, Visit, Medicine, Prescription, PrescriptionItem, PrescriptionTemplate, Symptom, Diagnosis } from '../types';
import { addVisit, addPrescription, getAllMedicines, getAllPrescriptionTemplates, getPrescriptionById, updateVisit, updatePrescription, getAllSymptoms, findLastExaminationForPatient, getAllDiagnoses } from '../services/db';
import { getPrices } from '../services/settingsService';

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
              // FIX: Corrected variable name from optionValue to option.value
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


interface NewVisitModalProps {
  patient: Patient;
  visitToEdit?: Visit;
  onClose: void;
  onSave: (visitId: number) => void;
}

const NewVisitModal: React.FC<NewVisitModalProps> = ({ patient, visitToEdit, onClose, onSave }) => {
  const isEditMode = !!visitToEdit;

  const [visitData, setVisitData] = useState<{
    date: string;
    type: Visit['type'] | '';
    weight: number;
    temperature: number;
    diagnosis: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    type: '',
    weight: 0,
    temperature: 0,
    diagnosis: '',
  });

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptoms, setCustomSymptoms] = useState('');
  
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [requiredTests, setRequiredTests] = useState('');
  const [includeTests, setIncludeTests] = useState(false);
  const [requiredScans, setRequiredScans] = useState('');
  const [includeScans, setIncludeScans] = useState(false);
  const [isLastConsultation, setIsLastConsultation] = useState(false);
  const [followUpDays, setFollowUpDays] = useState('');
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [commonSymptoms, setCommonSymptoms] = useState<Symptom[]>([]);
  const [commonDiagnoses, setCommonDiagnoses] = useState<Diagnosis[]>([]);
  const [prices, setPrices] = useState({ exam: 0, consult: 0 });

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>('');
  const [dosage, setDosage] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isCustomDosage, setIsCustomDosage] = useState(false);


  const selectedMedicine = useMemo(() => medicines.find(m => m.id === parseInt(selectedMedicineId)), [selectedMedicineId, medicines]);

    useEffect(() => {
        const fetchAndSetData = async () => {
            const [allMedicines, allTemplates, allSymptoms, allDiagnoses, currentPrices] = await Promise.all([
                getAllMedicines(),
                getAllPrescriptionTemplates(),
                getAllSymptoms(),
                getAllDiagnoses(),
                getPrices()
            ]);
            
            // Sort medicines alphabetically by name (Arabic)
            const sortedMedicines = allMedicines.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            setMedicines(sortedMedicines);

            setTemplates(allTemplates);
            setCommonSymptoms(allSymptoms);
            setCommonDiagnoses(allDiagnoses);
            setPrices(currentPrices);

            if (isEditMode && visitToEdit) {
                let diagnosisToSet = visitToEdit.diagnosis;
                if (visitToEdit.diagnosis.includes('(آخر استشارة)')) {
                    setIsLastConsultation(true);
                    diagnosisToSet = visitToEdit.diagnosis.replace(/\s*\(آخر استشارة\)/g, '').trim();
                } else {
                    setIsLastConsultation(false);
                }

                setVisitData({
                    date: visitToEdit.date,
                    type: visitToEdit.type,
                    weight: visitToEdit.weight,
                    temperature: visitToEdit.temperature,
                    diagnosis: diagnosisToSet,
                });
                setCustomSymptoms(visitToEdit.symptoms || '');
                setSelectedSymptoms([]);

                if (visitToEdit.prescriptionId) {
                    const prescription = await getPrescriptionById(visitToEdit.prescriptionId);
                    if (prescription) {
                        setPrescriptionItems(prescription.items);
                        setDoctorNotes(prescription.doctorNotes || '');
                        setIncludeTests(!!prescription.requiredTests);
                        setRequiredTests(prescription.requiredTests || '');
                        setIncludeScans(!!prescription.requiredScans);
                        setRequiredScans(prescription.requiredScans || '');

                        if (prescription.followUpDate) {
                            const visitDate = new Date(visitToEdit.date);
                            const followUp = new Date(prescription.followUpDate);
                            const diffTime = followUp.getTime() - visitDate.getTime();
                            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            setFollowUpDays(diffDays > 0 ? diffDays.toString() : '');
                        } else {
                            setFollowUpDays('');
                        }
                    }
                }
            }
        };
        fetchAndSetData();
    }, [isEditMode, visitToEdit]);

  const handleToggleSymptom = (symptomName: string) => {
    setSelectedSymptoms(prev => 
        prev.includes(symptomName) 
            ? prev.filter(s => s !== symptomName)
            : [...prev, symptomName]
    );
  };
  
  const handleSelectDiagnosis = (diagnosisName: string) => {
    setVisitData(prev => ({...prev, diagnosis: diagnosisName}));
  };
  
  const handleSelectMedicineChange = (medId: string) => {
    setSelectedMedicineId(medId);
    setDosage('');
    setQuantity('');
    
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


  const addMedicineToPrescription = () => {
    if (selectedMedicine && dosage) {
      if (selectedMedicine.form === 'حقن' && (!quantity || parseInt(quantity) <= 0)) {
        alert('يرجى إدخال عدد صحيح للحقن.');
        return;
      }
      
      const newItem: PrescriptionItem = {
        medicineId: selectedMedicine.id!,
        medicineName: selectedMedicine.name,
        form: selectedMedicine.form,
        dosage: dosage,
        notes: selectedMedicine.notes,
      };

      if (selectedMedicine.form === 'حقن') {
        newItem.quantity = parseInt(quantity);
      }
      
      setPrescriptionItems([...prescriptionItems, newItem]);
      
      setSelectedMedicineId('');
      setDosage('');
      setQuantity('');
      setIsCustomDosage(false);
    }
  };


  const removeMedicineFromPrescription = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };
  
  const handlePrescriptionItemDosageChange = (newDosage: string, indexToUpdate: number) => {
    setPrescriptionItems(prevItems =>
      prevItems.map((item, index) =>
        index === indexToUpdate ? { ...item, dosage: newDosage } : item
      )
    );
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplateId) return;
    const template = templates.find(t => t.id === parseInt(selectedTemplateId));
    if (!template) return;

    const newItems: PrescriptionItem[] = template.items.map(item => {
        const medicine = medicines.find(m => m.id === item.medicineId);
        return {
            medicineId: item.medicineId,
            medicineName: medicine?.name || 'دواء محذوف',
            form: medicine?.form || 'أقراص',
            dosage: item.dosage,
            notes: item.notes,
        };
    });
    setPrescriptionItems(newItems);

    if (template.diagnosis) {
        setVisitData(prev => ({...prev, diagnosis: template.diagnosis!}));
    }
    if (template.doctorNotes) {
        setDoctorNotes(template.doctorNotes);
    }
  };

  const handleSave = async () => {
    if (!visitData.type) {
        alert("يرجى اختيار نوع الزيارة.");
        return;
    }
    if (!patient.id || !visitData.diagnosis) {
        alert("يرجى إدخال التشخيص.");
        return;
    }

    if (visitData.weight <= 0 || visitData.temperature <= 0) {
        alert("يرجى إدخال قيم صحيحة للوزن والحرارة.");
        return;
    }

    let visitPrice = 0;
    switch (visitData.type) {
        case 'كشف':
            visitPrice = prices.exam;
            break;
        case 'استشارة':
            visitPrice = prices.consult;
            break;
        default:
            visitPrice = 0;
            break;
    }
    const symptomsText = [
        selectedSymptoms.join(' - '),
        customSymptoms.trim()
    ].filter(Boolean).join('\n');

    let finalDiagnosis = visitData.diagnosis;
    if (isLastConsultation && (visitData.type === 'استشارة' || visitData.type === 'استشارة بدون مقابل')) {
        finalDiagnosis = `${finalDiagnosis.replace(/\s*\(آخر استشارة\)/g, '').trim()} (آخر استشارة)`;
    }

    let followUpDate: string | undefined = undefined;
    if (followUpDays && parseInt(followUpDays) > 0) {
        // To avoid timezone issues, we handle the date parts manually.
        // The input date 'YYYY-MM-DD' is treated as a local date.
        const [year, month, day] = visitData.date.split('-').map(Number);
        // new Date(year, monthIndex, day) correctly creates a date in the local timezone.
        const visitDate = new Date(year, month - 1, day);
        visitDate.setDate(visitDate.getDate() + parseInt(followUpDays));
        
        // Format it back to 'YYYY-MM-DD' string safely.
        const followUpYear = visitDate.getFullYear();
        const followUpMonth = String(visitDate.getMonth() + 1).padStart(2, '0');
        const followUpDay = String(visitDate.getDate()).padStart(2, '0');
        followUpDate = `${followUpYear}-${followUpMonth}-${followUpDay}`;
    }
    
    const isConsultation = visitData.type === 'استشارة' || visitData.type === 'استشارة بدون مقابل';
    let followUpForVisitId: number | undefined = undefined;
    if (isConsultation) {
        const lastExam = await findLastExaminationForPatient(patient.id);
        if (lastExam) {
            followUpForVisitId = lastExam.id;
        }
    }


    const shouldHavePrescription =
      prescriptionItems.length > 0 ||
      (includeTests && requiredTests.trim()) ||
      (includeScans && requiredScans.trim()) ||
      !!symptomsText ||
      !!followUpDate ||
      (doctorNotes.trim().length > 0);

    if (isEditMode) {
        // --- UPDATE LOGIC ---
        let prescriptionId = visitToEdit.prescriptionId;
        const prescriptionData: Partial<Prescription> = {
            items: prescriptionItems,
            doctorNotes: doctorNotes,
            date: visitData.date,
            requiredTests: includeTests ? requiredTests.trim() : undefined,
            requiredScans: includeScans ? requiredScans.trim() : undefined,
            followUpDate: followUpDate,
            symptoms: symptomsText,
        };

        if (prescriptionId) {
            await updatePrescription(prescriptionId, prescriptionData);
        } else if (shouldHavePrescription) {
            const newPrescription: Omit<Prescription, 'id'> = {
                ...prescriptionData,
                visitId: visitToEdit.id!,
                patientId: patient.id,
            } as Omit<Prescription, 'id'>;
            prescriptionId = await addPrescription(newPrescription as Prescription);
        }

        const visitUpdates: Partial<Visit> = {
            date: visitData.date,
            type: visitData.type as Visit['type'],
            weight: visitData.weight,
            temperature: visitData.temperature,
            diagnosis: finalDiagnosis,
            symptoms: symptomsText,
            prescriptionId: prescriptionId,
            price: visitToEdit.type === visitData.type ? visitToEdit.price : visitPrice,
            followUpForVisitId: isConsultation ? followUpForVisitId : undefined, // Link if consultation, else unlink
        };
        await updateVisit(visitToEdit.id!, visitUpdates);
        onSave(visitToEdit.id!);

    } else {
        // --- CREATE LOGIC ---
        let prescriptionId: number | undefined = undefined;
        if (shouldHavePrescription) {
            const newPrescription: Omit<Prescription, 'id'> = {
                visitId: 0, // placeholder
                patientId: patient.id,
                items: prescriptionItems,
                doctorNotes: doctorNotes,
                date: visitData.date,
                requiredTests: includeTests ? requiredTests.trim() : undefined,
                requiredScans: includeScans ? requiredScans.trim() : undefined,
                followUpDate: followUpDate,
                symptoms: symptomsText,
            };
            prescriptionId = await addPrescription(newPrescription as Prescription);
        }

        const newVisit: Omit<Visit, 'id'> = {
            patientId: patient.id,
            prescriptionId: prescriptionId,
            createdAt: Date.now(), // Add creation timestamp
            symptoms: symptomsText,
            followUpForVisitId: followUpForVisitId,
            date: visitData.date,
            type: visitData.type as Visit['type'],
            weight: visitData.weight,
            temperature: visitData.temperature,
            diagnosis: finalDiagnosis,
            price: visitPrice,
        };

        const visitId = await addVisit(newVisit as Visit);

        if (prescriptionId) {
            await updatePrescription(prescriptionId, { visitId });
        }
        onSave(visitId);
    }
  };

  const medicineOptions = useMemo(() => medicines.map(med => ({
    value: med.id!.toString(),
    label: med.name,
  })), [medicines]);

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl">
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditMode ? `تعديل زيارة لـ ${patient.name}` : `إضافة زيارة جديدة لـ ${patient.name}`}
            </h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input type="date" value={visitData.date} onChange={e => setVisitData({...visitData, date: e.target.value})} className="input" />
            <select value={visitData.type} onChange={e => setVisitData({...visitData, type: e.target.value as Visit['type']})} className="input" required>
              <option value="" disabled hidden>-- اختر نوع الزيارة --</option>
              <option value="كشف">كشف</option>
              <option value="استشارة">استشارة</option>
              <option value="كشف بدون مقابل">كشف بدون مقابل</option>
              <option value="استشارة بدون مقابل">استشارة بدون مقابل</option>
            </select>
            <input type="number" step="0.1" placeholder="الوزن (كجم)" value={visitData.weight || ''} onChange={e => setVisitData({...visitData, weight: parseFloat(e.target.value) || 0})} className="input" />
            <input type="number" step="0.1" placeholder="الحرارة (°)" value={visitData.temperature || ''} onChange={e => setVisitData({...visitData, temperature: parseFloat(e.target.value) || 0})} className="input" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="input-label font-bold">C/O (Chief Complaint)</label>
                <div className="form-container-alt mt-1">
                    <p className="input-label-sm mb-2">الأعراض الشائعة</p>
                    <div className="flex flex-wrap gap-2">
                        {commonSymptoms.map(symptom => (
                            <button
                                type="button"
                                key={symptom.id}
                                onClick={() => handleToggleSymptom(symptom.name)}
                                className={`symptom-tag ${selectedSymptoms.includes(symptom.name) ? 'active' : ''}`}
                            >
                                {symptom.name}
                            </button>
                        ))}
                    </div>
                </div>
                <textarea rows={3} value={customSymptoms || ''} onChange={e => setCustomSymptoms(e.target.value)} placeholder="أعراض إضافية أو ملاحظات..." className="input mt-1"></textarea>
              </div>
              
              <div className="mt-4">
                 <label className="input-label font-bold">Diagnosis</label>
                 <input type="text" value={visitData.diagnosis} onChange={e => setVisitData({...visitData, diagnosis: e.target.value})} className="input mt-1" required />
                 <div className="form-container-alt mt-2">
                    <p className="input-label-sm mb-2">التشخيصات الشائعة</p>
                    <div className="flex flex-wrap gap-2">
                        {commonDiagnoses.map(diagnosis => (
                            <button
                                type="button"
                                key={diagnosis.id}
                                onClick={() => handleSelectDiagnosis(diagnosis.name)}
                                className={`symptom-tag ${visitData.diagnosis === diagnosis.name ? 'active' : ''}`}
                            >
                                {diagnosis.name}
                            </button>
                        ))}
                    </div>
                </div>
              </div>
              
              <div className="form-container-alt mt-4">
                 {(visitData.type === 'استشارة' || visitData.type === 'استشارة بدون مقابل') && (
                    <label className="checkbox-label-alt mb-3">
                        <input 
                            type="checkbox"
                            checked={isLastConsultation}
                            onChange={e => setIsLastConsultation(e.target.checked)}
                            className="checkbox"
                        />
                        تحديد كآخر استشارة
                    </label>
                )}
                <div className="flex items-center gap-2">
                    <span>الاستشارة بعد</span>
                    <input 
                        type="number" 
                        value={followUpDays}
                        onChange={e => setFollowUpDays(e.target.value)}
                        className="input w-24 text-center"
                        placeholder="أيام"
                        min="1"
                    />
                    <span>يوم</span>
                </div>
              </div>

            </div>

            <div>
              <h3 className="font-bold mb-2">العلاج والوصفة الطبية</h3>
              <div className="form-container-alt">
                <div className="mb-4 border-b border-default pb-3">
                    <label className="input-label-sm mb-1">تطبيق وصفة جاهزة</label>
                    <div className="flex gap-2">
                        <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="input flex-1">
                            <option value="">اختر وصفة جاهزة</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button type="button" onClick={handleApplyTemplate} className="btn btn-accent">تطبيق</button>
                    </div>
                </div>

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
                        {selectedMedicine.dosages.map((d, i) => <option key={i} value={d}>{d}</option>)}
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

                    {selectedMedicine && selectedMedicine.form === 'حقن' && (
                        <input
                        type="number"
                        placeholder="العدد"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="input"
                        min="1"
                        />
                    )}
                  </div>

                  <button 
                    onClick={addMedicineToPrescription} 
                    className="btn btn-secondary btn-icon"
                    disabled={!selectedMedicineId || !dosage}
                    aria-label="إضافة دواء للروشتة"
                  >
                    +
                  </button>
                </div>
                
                <div className="prescription-items-list mt-4">
                  {prescriptionItems.map((item, index) => {
                    const medDetails = medicines.find(m => m.id === item.medicineId);
                    const dosageOptions = medDetails?.dosages ? [...medDetails.dosages] : [];
                    if (medDetails && !dosageOptions.includes(item.dosage)) {
                        dosageOptions.unshift(item.dosage);
                    }
                    
                    return (
                        <div key={index} className="prescription-item">
                          <div className="flex-1">
                            <p className="font-semibold">
                              {item.medicineName}
                              {item.form === 'حقن' && item.quantity && (
                                <span className="text-sm text-secondary font-medium me-2"> (العدد: {toArabicDigits(item.quantity)})</span>
                              )}
                            </p>
                            <div className="text-sm text-primary font-bold mt-1">الجرعة: {toArabicDigits(item.dosage)}</div>
                          </div>
                          <button type="button" onClick={() => removeMedicineFromPrescription(index)} className="btn-action btn-danger">حذف</button>
                        </div>
                    );
                  })}
                </div>

              </div>

               <div className="mt-4">
                 <label className="input-label font-bold">ملاحظات الطبيب</label>
                 <textarea rows={3} value={doctorNotes || ''} onChange={e => setDoctorNotes(e.target.value)} className="input mt-1"></textarea>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="checkbox-label-alt">
                        <input 
                            type="checkbox"
                            checked={includeTests}
                            onChange={e => setIncludeTests(e.target.checked)}
                            className="checkbox"
                        />
                        التحاليل المطلوبة
                    </label>
                    <textarea 
                        rows={3} 
                        value={requiredTests || ''} 
                        onChange={e => setRequiredTests(e.target.value)} 
                        className="input mt-1"
                        placeholder="اكتب التحاليل المطلوبة هنا..."
                        disabled={!includeTests}
                    />
                </div>
                <div>
                    <label className="checkbox-label-alt">
                        <input 
                            type="checkbox"
                            checked={includeScans}
                            onChange={e => setIncludeScans(e.target.checked)}
                            className="checkbox"
                        />
                        الأشعة المطلوبة
                    </label>
                    <textarea 
                        rows={3} 
                        value={requiredScans || ''} 
                        onChange={e => setRequiredScans(e.target.value)} 
                        className="input mt-1"
                        placeholder="اكتب الأشعة المطلوبة هنا..."
                        disabled={!includeScans}
                    />
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-light">إلغاء</button>
          <button onClick={handleSave} className="btn btn-success">
            {isEditMode ? 'حفظ التعديلات' : 'حفظ الزيارة'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewVisitModal;
