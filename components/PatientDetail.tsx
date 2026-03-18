import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Patient, Visit, Prescription, User } from '../types';
import { getVisitsByPatientId, getPrescriptionById, updatePatient } from '../services/db';
import NewVisitModal from './NewVisitModal';
import { PlusIcon } from './icons';
import PrescriptionPrint from './PrescriptionPrint';
import { getSettings } from '../services/settingsService';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
  user: User;
}

const toArabicDigits = (str: string | number): string => {
    return String(str).replace(/[0-9]/g, (w) => "٠١٢٣٤٥٦٧٨٩"[parseInt(w)]);
};

const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate);
    const today = new Date();

    if (isNaN(birth.getTime()) || birth > today) {
        return "تاريخ غير صالح";
    }

    const birthDay = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (birthDay.getTime() === todayDay.getTime()) {
        return "مولود اليوم";
    }

    const diff = today.getTime() - birth.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    // If less than 30 days old, display age in days.
    if (diffDays < 30) {
        return `${diffDays <= 0 ? 1 : diffDays} يوم`;
    }

    // Calculate years and months for older infants/children.
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
        years--;
        months += 12;
    }
    
    // If less than a year old, display age in months.
    if (years < 1) {
        return `${months} شهر`;
    }

    // For children one year or older, display years and months.
    return `${years} سنة و ${months} شهر`;
};

const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack, user }) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [modalVisit, setModalVisit] = useState<Visit | 'new' | null>(null);
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [viewingVisit, setViewingVisit] = useState<Visit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient>(patient);
  const [editFormData, setEditFormData] = useState<Patient>(patient);
  const [newlyAddedVisitId, setNewlyAddedVisitId] = useState<number | null>(null);
  const componentToPrintRef = useRef(null);

  useEffect(() => {
    setCurrentPatient(patient);
    setEditFormData(patient);
  }, [patient]);


  const fetchVisits = useCallback(async () => {
    if (patient.id) {
      const patientVisits = await getVisitsByPatientId(patient.id);
      setVisits(patientVisits);
    }
  }, [patient.id]);
  
  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  useEffect(() => {
    if (newlyAddedVisitId) {
      const timer = setTimeout(() => setNewlyAddedVisitId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedVisitId]);

  const visitStats = useMemo(() => {
    const examCount = visits.filter(v => v.type === 'كشف' || v.type === 'كشف بدون مقابل').length;
    const consultationCount = visits.filter(v => v.type === 'استشارة' || v.type === 'استشارة بدون مقابل').length;
    return {
        examCount,
        consultationCount,
        totalVisits: visits.length,
    };
  }, [visits]);

  const visitThreads = useMemo(() => {
    const primaryVisits = visits.filter(v => !v.followUpForVisitId);
    const followUpVisitsMap = new Map<number, Visit[]>();

    visits.forEach(v => {
        if (v.followUpForVisitId) {
            if (!followUpVisitsMap.has(v.followUpForVisitId)) {
                followUpVisitsMap.set(v.followUpForVisitId, []);
            }
            // Sort follow-ups by date ascending to show chronological order
            followUpVisitsMap.get(v.followUpForVisitId)!.push(v);
            followUpVisitsMap.get(v.followUpForVisitId)!.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
    });

    return primaryVisits.map(primary => ({
        primary,
        followUps: followUpVisitsMap.get(primary.id!) || []
    }));
  }, [visits]);
  
  const isEditable = (visit: Visit): boolean => {
      if (!visit.createdAt) return false; // Old visits without timestamp are not editable
      const oneDayInMs = 24 * 60 * 60 * 1000;
      return (Date.now() - visit.createdAt) < oneDayInMs;
  };

  const handleViewPrescription = async (prescriptionId: number) => {
    const prescription = await getPrescriptionById(prescriptionId);
    if (prescription) {
        const visit = visits.find(v => v.id === prescription.visitId);
        setViewingPrescription(prescription);
        setViewingVisit(visit || null);
    }
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value } as Patient));
  };
  
  const handleSave = async () => {
    if (!editFormData.name || !editFormData.birthDate) {
      alert("الاسم وتاريخ الميلاد مطلوبان.");
      return;
    }
    try {
      const { id, ...updates } = editFormData;
      await updatePatient(currentPatient.id!, updates);
      setCurrentPatient(editFormData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update patient", error);
      alert("فشل تحديث بيانات المريض.");
    }
  };

  const handleCancel = () => {
    setEditFormData(currentPatient);
    setIsEditing(false);
  };
  

  const closePrescriptionModal = () => {
    setViewingPrescription(null);
    setViewingVisit(null);
  };

  const renderVisitCard = (visit: Visit) => {
    const isExam = visit.type === 'كشف' || visit.type === 'كشف بدون مقابل';
    const cardTypeClass = isExam ? 'is-exam' : 'is-consultation';
    const animationClass = visit.id === newlyAddedVisitId ? 'animate-new-item' : '';
    const lastConsultationText = '(آخر استشارة)';

    return (
        <div className={`visit-card ${cardTypeClass} ${animationClass}`}>
            <div className="flex justify-between items-center mb-2">
                <p className="visit-card-title">
                    {new Date(visit.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} - <span>{visit.type}</span>
                </p>
                <div className="visit-card-meta">
                    <span>الوزن: {visit.weight} كجم</span> | <span>الحرارة: {visit.temperature}°</span>
                </div>
            </div>
            <p><strong>الأعراض:</strong> {visit.symptoms}</p>
            <p><strong>التشخيص:</strong> {
                visit.diagnosis.includes(lastConsultationText) ? (
                    <>
                        {visit.diagnosis.replace(lastConsultationText, '').trim()}
                        <span className="last-consultation-tag">آخر استشارة</span>
                    </>
                ) : visit.diagnosis
            }</p>
            <div className="mt-2">
                {isEditable(visit) && (
                    <button 
                        onClick={() => setModalVisit(visit)} 
                        className="btn btn-primary btn-sm me-2"
                    >
                        تعديل
                    </button>
                )}
                {visit.prescriptionId && (
                    <button 
                        onClick={() => handleViewPrescription(visit.prescriptionId!)} 
                        className="btn btn-accent btn-sm"
                    >
                        عرض الروشتة
                    </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="card h-full flex-col overflow-hidden">
        <div className="view-header flex-shrink-0">
            <div>
                <h2 className="text-3xl font-bold">
                    {currentPatient.name}
                    {currentPatient.chronicComplaints && (
                        <span className="chronic-complaints-badge no-print">
                            ({currentPatient.chronicComplaints})
                        </span>
                    )}
                </h2>
                <p className="text-secondary">{calculateAge(currentPatient.birthDate)} - {currentPatient.gender} - {currentPatient.city}</p>
            </div>
            <div className="flex gap-2">
                {user.role === 'Doctor' && !isEditing && (
                    <button onClick={() => setIsEditing(true)} className="btn btn-accent">
                        تعديل بيانات المريض
                    </button>
                )}
                <button onClick={onBack} className="btn btn-light">
                    &rarr; العودة لقائمة المرضى
                </button>
            </div>
        </div>
      
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
            {/* Left Column: Patient Info */}
            <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2">
                <div className="stats-grid md:grid-cols-3">
                    <div className="stat-item stat-info">
                        <h4>إجمالي الزيارات</h4>
                        <p>{visitStats.totalVisits}</p>
                    </div>
                    <div className="stat-item stat-success">
                        <h4>عدد الكشوفات</h4>
                        <p>{visitStats.examCount}</p>
                    </div>
                    <div className="stat-item stat-info">
                        <h4>عدد الاستشارات</h4>
                        <p>{visitStats.consultationCount}</p>
                    </div>
                </div>

                {isEditing ? (
                    <div className="form-container-alt animate-fade-in-down">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="input-label-sm">الاسم</label>
                                <input name="name" value={editFormData.name || ''} onChange={handleFormChange} className="input" />
                            </div>
                            <div>
                                <label className="input-label-sm">تاريخ الميلاد</label>
                                <input name="birthDate" type="date" value={editFormData.birthDate || ''} onChange={handleFormChange} className="input" />
                            </div>
                            <div>
                                <label className="input-label-sm">الجنس</label>
                                <select name="gender" value={editFormData.gender || 'ذكر'} onChange={handleFormChange} className="input">
                                    <option value="ذكر">ذكر</option>
                                    <option value="أنثى">أنثى</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="input-label-sm">المدينة</label>
                                <input name="city" value={editFormData.city || ''} onChange={handleFormChange} className="input" />
                            </div>
                            {user.role === 'Doctor' && (
                                <>
                                    <div className="md:col-span-2">
                                        <label className="input-label-sm">أمراض مزمنة</label>
                                        <textarea name="chronicComplaints" value={editFormData.chronicComplaints || ''} onChange={handleFormChange} className="input" rows={2}/>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="input-label-sm">تاريخ مرضي</label>
                                        <textarea name="diseaseHistory" value={editFormData.diseaseHistory || ''} onChange={handleFormChange} className="input" rows={2} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="input-label-sm">ملاحظات الطبيب</label>
                                        <textarea name="doctorNotes" value={editFormData.doctorNotes || ''} onChange={handleFormChange} className="input" rows={3} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={handleCancel} className="btn btn-light">إلغاء</button>
                            <button onClick={handleSave} className="btn btn-success">حفظ التعديلات</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="info-box">
                                <h3 className="info-box-title">أمراض مزمنة</h3>
                                <p>{currentPatient.chronicComplaints || 'لا يوجد'}</p>
                            </div>
                            {user.role === 'Doctor' && (
                                <div className="info-box">
                                    <h3 className="info-box-title">تاريخ مرضي</h3>
                                    <p>{currentPatient.diseaseHistory || 'لا يوجد'}</p>
                                </div>
                            )}
                        </div>
                        {user.role === 'Doctor' && (
                            <div className="info-box-alt !mb-0">
                                <h3 className="info-box-title">ملاحظات الطبيب</h3>
                                <p className="whitespace-pre-wrap">{currentPatient.doctorNotes || 'لا توجد ملاحظات.'}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {/* Right Column: Visit History */}
            {user.role === 'Doctor' && (
                <div className="lg:col-span-3 flex flex-col min-h-0">
                    <div className="view-header flex-shrink-0">
                        <h3 className="text-2xl font-bold">سجل الزيارات</h3>
                        <button
                            onClick={() => setModalVisit('new')}
                            className="btn btn-secondary"
                        >
                        <span className="icon-wrapper icon-sm me-2">
                            <PlusIcon />
                        </span>
                        إضافة زيارة جديدة
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-4">
                    {visitThreads.length > 0 ? (
                        visitThreads.map((thread, threadIndex) => (
                            <div key={thread.primary.id} className="visit-thread-container">
                                <div className={`visit-item is-parent ${thread.followUps.length > 0 ? '' : 'has-no-children'} ${threadIndex === visitThreads.length -1 ? 'is-last-thread' : ''}`}>
                                    {renderVisitCard(thread.primary)}
                                </div>
                                {thread.followUps.map((followUp, followUpIndex) => (
                                    <div key={followUp.id} className={`visit-item is-child ${followUpIndex === thread.followUps.length - 1 ? 'is-last-child' : ''}`}>
                                        {renderVisitCard(followUp)}
                                    </div>
                                ))}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-secondary mt-8">لا توجد زيارات مسجلة لهذا المريض.</p>
                    )}
                    </div>
                </div>
            )}
        </div>

      {modalVisit && (
        <NewVisitModal
          patient={currentPatient}
          visitToEdit={modalVisit === 'new' ? undefined : modalVisit}
          onClose={() => setModalVisit(null)}
          onSave={async (savedId) => {
            setModalVisit(null);
            await fetchVisits();
            setNewlyAddedVisitId(savedId);
          }}
        />
      )}

      {viewingPrescription && (
        <div className="modal-overlay">
            <div className="modal-content max-w-2xl">
                <button onClick={closePrescriptionModal} className="modal-close-btn no-print">&times;</button>
                <div className="modal-body">
                    <div ref={componentToPrintRef}>
                        <PrescriptionPrint prescription={viewingPrescription} patient={currentPatient} visit={viewingVisit} />
                    </div>
                </div>
                <div className="modal-footer no-print">
                    <button onClick={closePrescriptionModal} className="btn btn-light">
                        العودة للمريض
                    </button>
                    <button onClick={handlePrint} className="btn btn-accent">
                        طباعة
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;