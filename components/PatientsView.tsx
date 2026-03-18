
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllPatients, addPatient, checkPatientByName, getAllPrescriptions, getAllVisits } from '../services/db';
import { Patient, User, Prescription, Visit } from '../types';
import { PlusIcon } from './icons';
import PatientDetail from './PatientDetail';

interface PatientsViewProps {
  user: User;
  triggerAddModal?: boolean;
  onAddModalTriggered?: () => void;
}

interface FollowUpAppointment {
    patient: Patient;
    prescription: Prescription;
}

const FollowUpCalendarView: React.FC<{ followUps: FollowUpAppointment[], onSelectPatient: (patient: Patient) => void, isLoading: boolean }> = ({ followUps, onSelectPatient, isLoading }) => {
    const [displayDate, setDisplayDate] = useState(new Date());
    const [viewingDayDetails, setViewingDayDetails] = useState<Date | null>(null);

    const appointmentsByDate = useMemo(() => {
        const groups: Map<string, FollowUpAppointment[]> = new Map();
        followUps.forEach(item => {
            if (item.prescription.followUpDate) {
                const dateStr = item.prescription.followUpDate;
                if (!groups.has(dateStr)) {
                    groups.set(dateStr, []);
                }
                groups.get(dateStr)!.push(item);
            }
        });
        return groups;
    }, [followUps]);

    const navState = useMemo(() => {
        if (!followUps.length) return { canGoPrev: false, canGoNext: false };
        
        const getLocalTimestamp = (dateStr: string) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d).getTime();
        };

        const followUpTimestamps = followUps.map(f => getLocalTimestamp(f.prescription.followUpDate!));
        const firstFollowUp = new Date(Math.min(...followUpTimestamps));
        const lastFollowUp = new Date(Math.max(...followUpTimestamps));

        const displayMonthStart = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
        const displayMonthEnd = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);

        return {
            canGoPrev: firstFollowUp < displayMonthStart,
            canGoNext: lastFollowUp > displayMonthEnd,
        };
    }, [followUps, displayDate]);

    const calendarDays = useMemo(() => {
        const days = [];
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const startingDayOfWeek = (firstDayOfMonth.getDay() + 1) % 7;

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            days.push(new Date(year, month, day));
        }
        return days;
    }, [displayDate]);

    const handleMonthChange = (offset: number) => {
        setDisplayDate(current => {
            const newDate = new Date(current);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
        setViewingDayDetails(null);
    };

    const getMapKeyFromDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    if (isLoading) {
        return <div className="placeholder-view">جاري تحميل الاستشارات المتوقعة...</div>
    }

    return (
        <React.Fragment>
            <div className="flex-1 flex flex-col follow-up-calendar-container">
                <div className="calendar-header">
                    <button onClick={() => handleMonthChange(-1)} className="month-nav-btn" disabled={!navState.canGoPrev}>
                         <span className="icon-wrapper icon-sm"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></span>
                    </button>
                    <h2>{displayDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => handleMonthChange(1)} className="month-nav-btn" disabled={!navState.canGoNext}>
                        <span className="icon-wrapper icon-sm"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></span>
                    </button>
                </div>
                <div className="calendar-weekdays">
                    {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="calendar-grid">
                    {calendarDays.map((day, index) => {
                        if (!day) return <div key={`empty-${index}`} className="calendar-day is-empty"></div>;
                        
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPast = day < today;
                        const isToday = day.getTime() === today.getTime();
                        
                        const dateStr = getMapKeyFromDate(day);
                        const appointments = appointmentsByDate.get(dateStr) || [];

                        const dayClasses = [
                            'calendar-day',
                            isPast && 'is-past',
                            isToday && 'is-today',
                            appointments.length > 0 && 'has-appointments',
                        ].filter(Boolean).join(' ');

                        return (
                            <div key={dateStr} className={dayClasses} onClick={() => appointments.length > 0 && setViewingDayDetails(day)}>
                                <div className="calendar-day-number">{day.getDate()}</div>
                                <div className="calendar-day-name">{day.toLocaleDateString('ar-EG', { weekday: 'short' })}</div>
                                {appointments.length > 0 && (
                                    <div className="calendar-appointment-badge">{appointments.length}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {viewingDayDetails && (
                <div className="day-view-overlay">
                    <div className="day-view-content animate-fade-in-down">
                        <div className="day-view-header">
                            <h3 className="day-view-title">
                                مواعيد يوم {viewingDayDetails.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <button onClick={() => setViewingDayDetails(null)} className="modal-close-btn">&times;</button>
                        </div>
                        <div className="day-view-body">
                             {(() => {
                                const key = getMapKeyFromDate(viewingDayDetails);
                                const modalAppointments = appointmentsByDate.get(key) || [];
                                return modalAppointments.length > 0 ? (
                                    modalAppointments.map(item => (
                                        <div key={item.prescription.id} onClick={() => onSelectPatient(item.patient)} className="follow-up-patient-item">
                                            <div>
                                                <p className="font-bold">{item.patient.name}</p>
                                                <p className="text-sm text-secondary">ملف رقم: {item.patient.fileNumber}</p>
                                            </div>
                                            <button className="btn btn-sm btn-light">عرض الملف</button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="placeholder-view">
                                        <p>لا توجد مواعيد لهذا اليوم.</p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

const initialNewPatientState: Omit<Patient, 'id' | 'fileNumber'> = {
  name: '',
  birthDate: '',
  gender: 'ذكر',
  chronicComplaints: '',
  diseaseHistory: '',
  city: '',
  doctorNotes: '',
};

const PatientsView: React.FC<PatientsViewProps> = ({ user, triggerAddModal, onAddModalTriggered }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newlyAddedPatientId, setNewlyAddedPatientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'followups'>('list');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  
  const [followUps, setFollowUps] = useState<FollowUpAppointment[]>([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(true);

  const [newPatient, setNewPatient] = useState(initialNewPatientState);

  const [sortOrder, setSortOrder] = useState('id_desc');
  const [genderFilter, setGenderFilter] = useState('الكل');
  const [cityFilter, setCityFilter] = useState('الكل');

  useEffect(() => {
    if (triggerAddModal) {
        setIsAddingPatient(true);
        setActiveTab('list');
        setSelectedPatient(null);
        if (onAddModalTriggered) onAddModalTriggered();
    }
  }, [triggerAddModal, onAddModalTriggered]);

  const fetchPatients = useCallback(async () => {
    const allPatients = await getAllPatients();
    setPatients(allPatients);
  }, []);
  
  const fetchFollowUps = useCallback(async () => {
        setIsLoadingFollowUps(true);
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;

        const allPrescriptions = await getAllPrescriptions();
        const potentialFollowUps = allPrescriptions.filter(p => p.followUpDate && p.followUpDate >= todayString);
        const allVisits: Visit[] = await getAllVisits();
        const allPatients: Patient[] = await getAllPatients();
        const visitsMap = new Map(allVisits.map(v => [v.id, v]));
        const patientsMap = new Map(allPatients.map(p => [p.id, p]));

        const upcomingFollowUps: FollowUpAppointment[] = [];
        for (const pres of potentialFollowUps) {
            const originalVisit = visitsMap.get(pres.visitId);
            if (!originalVisit) continue;

            const hasBeenFollowedUp = allVisits.some(v =>
                v.patientId === pres.patientId && v.followUpForVisitId === originalVisit.id
            );

            if (!hasBeenFollowedUp) {
                const patient = patientsMap.get(pres.patientId);
                if (patient) {
                    upcomingFollowUps.push({ patient, prescription: pres });
                }
            }
        }
        setFollowUps(upcomingFollowUps.sort((a,b) => a.prescription.followUpDate!.localeCompare(b.prescription.followUpDate!)));
        setIsLoadingFollowUps(false);
    }, []);

  useEffect(() => {
    fetchPatients();
    fetchFollowUps();
  }, [fetchPatients, fetchFollowUps]);

  useEffect(() => {
    if (newlyAddedPatientId) {
      const timer = setTimeout(() => setNewlyAddedPatientId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedPatientId]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.birthDate) return;

    const exists = await checkPatientByName(newPatient.name.trim());
    if (exists) {
        setShowDuplicateModal(true);
        return;
    }

    await confirmAddPatient();
  };

  const confirmAddPatient = async () => {
    const newId = await addPatient(newPatient);
    setNewPatient(initialNewPatientState);
    setIsAddingPatient(false);
    setShowDuplicateModal(false);
    await fetchPatients();
    setNewlyAddedPatientId(newId);
  };

  const cities = useMemo(() => {
    return ['الكل', ...Array.from(new Set(patients.map(p => p.city).filter(Boolean)))];
  }, [patients]);

  const citiesForSuggestions = useMemo(() => {
    // FIX: Added explicit types to the sort callback arguments to resolve 'unknown' type error.
    return Array.from(new Set(patients.map(p => p.city).filter(Boolean))).sort((a: string, b: string) => a.localeCompare(b, 'ar'));
  }, [patients]);


  const filteredPatients = useMemo(() => {
    let sortedAndFiltered = [...patients];

    if (genderFilter !== 'الكل') {
        sortedAndFiltered = sortedAndFiltered.filter(p => p.gender === genderFilter);
    }
    if (cityFilter !== 'الكل') {
        sortedAndFiltered = sortedAndFiltered.filter(p => p.city === cityFilter);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
        sortedAndFiltered = sortedAndFiltered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.fileNumber.toString().includes(term)
        );
    }

    switch (sortOrder) {
        case 'id_desc':
            sortedAndFiltered.sort((a, b) => b.id! - a.id!);
            break;
        case 'id_asc':
            sortedAndFiltered.sort((a, b) => a.id! - b.id!);
            break;
        case 'fileNumber_asc':
            sortedAndFiltered.sort((a, b) => a.fileNumber - b.fileNumber);
            break;
        case 'fileNumber_desc':
            sortedAndFiltered.sort((a, b) => b.fileNumber - a.fileNumber);
            break;
        case 'name_asc':
            sortedAndFiltered.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            break;
        default:
            break;
    }
    
    return sortedAndFiltered;
}, [patients, searchTerm, sortOrder, genderFilter, cityFilter]);


  if (selectedPatient) {
    return <PatientDetail patient={selectedPatient} onBack={() => setSelectedPatient(null)} user={user} />;
  }

  return (
    <div className="card h-full flex-col">
      <div className="view-header">
        <div className="flex items-center gap-4">
            <h2 className="view-title">
                {activeTab === 'list' ? 'قائمة المرضى' : 'الاستشارات المتوقعة'}
            </h2>
            <button 
                onClick={() => { fetchPatients(); fetchFollowUps(); }}
                className="btn btn-sm btn-light"
                title="تحديث"
            >
                <span className="icon-wrapper icon-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </span>
            </button>
        </div>
        {activeTab === 'list' && (
            <button
            onClick={() => setIsAddingPatient(!isAddingPatient)}
            className="btn btn-secondary"
            >
            <span className="icon-wrapper icon-sm me-2">
                <PlusIcon />
            </span>
            {isAddingPatient ? 'إلغاء' : 'إضافة مريض جديد'}
            </button>
        )}
      </div>

      <div className="tabs mb-4">
          <button onClick={() => setActiveTab('list')} className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}>
              قائمة المرضى
          </button>
          <button onClick={() => setActiveTab('followups')} className={`tab-btn ${activeTab === 'followups' ? 'active' : ''}`}>
              الاستشارات المتوقعة
              <span className="follow-up-count-badge">{followUps.length}</span>
          </button>
      </div>

    {activeTab === 'list' ? (
    <>
      {isAddingPatient && (
        <div className="form-container-alt animate-fade-in-down">
          <form onSubmit={handleAddPatient} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="اسم المريض" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} className="input" required />
            <input type="date" placeholder="تاريخ الميلاد" value={newPatient.birthDate} onChange={e => setNewPatient({...newPatient, birthDate: e.target.value})} className="input" required />
            <select value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value as 'ذكر' | 'أنثى'})} className="input">
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
            </select>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="المدينة" 
                    value={newPatient.city} 
                    onChange={e => setNewPatient({...newPatient, city: e.target.value})} 
                    className="input w-full" 
                    list="city-suggestions-list"
                />
                <datalist id="city-suggestions-list">
                    {citiesForSuggestions.map(city => (
                        <option key={city} value={city} />
                    ))}
                </datalist>
            </div>
            <input type="text" placeholder="أمراض مزمنة" value={newPatient.chronicComplaints} onChange={e => setNewPatient({...newPatient, chronicComplaints: e.target.value})} className="input md:col-span-2" />
            {user.role === 'Doctor' && (
              <>
                <textarea placeholder="تاريخ مرضي" value={newPatient.diseaseHistory || ''} onChange={e => setNewPatient({...newPatient, diseaseHistory: e.target.value})} className="input md:col-span-3" />
                <textarea placeholder="ملاحظات الطبيب" value={newPatient.doctorNotes || ''} onChange={e => setNewPatient({...newPatient, doctorNotes: e.target.value})} className="input md:col-span-3" />
              </>
            )}
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="btn btn-accent">حفظ المريض</button>
            </div>
          </form>
        </div>
      )}

      {showDuplicateModal && (
        <div className="modal-overlay">
            <div className="modal-content max-w-md animate-fade-in-down">
                <div className="modal-header">
                    <h3 className="modal-title text-danger">تنبيه: اسم مكرر</h3>
                    <button onClick={() => setShowDuplicateModal(false)} className="modal-close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p className="text-lg">يوجد مريض مسجل بالفعل بهذا الاسم: <span className="font-bold text-primary">{newPatient.name}</span></p>
                    <p className="mt-2 text-secondary">هل تريد الاستمرار في تسجيل هذا المريض كملف جديد؟</p>
                </div>
                <div className="modal-footer">
                    <button onClick={() => setShowDuplicateModal(false)} className="btn btn-light">إلغاء</button>
                    <button onClick={confirmAddPatient} className="btn btn-primary">نعم، إضافة الملف</button>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
            <label className="input-label-sm">ترتيب حسب</label>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="input mt-1">
                <option value="id_desc">الأحدث أولاً</option>
                <option value="id_asc">الأقدم أولاً</option>
                <option value="fileNumber_asc">رقم الملف (تصاعدي)</option>
                <option value="fileNumber_desc">رقم الملف (تنازلي)</option>
                <option value="name_asc">الاسم (أبجدي)</option>
            </select>
        </div>
        <div className="flex-1">
            <label className="input-label-sm">تصفية حسب الجنس</label>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="input mt-1">
                <option value="الكل">الكل</option>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
            </select>
        </div>
        <div className="flex-1">
            <label className="input-label-sm">تصفية حسب المدينة</label>
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="input mt-1">
                {cities.map(city => <option key={city} value={city}>{city || 'غير محدد'}</option>)}
            </select>
        </div>
      </div>


      <div className="mb-4">
        <input
          type="text"
          placeholder="ابحث بالاسم أو رقم الملف..."
          className="input w-full text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>


      <div className="table-wrapper">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-cell">رقم الملف</th>
              <th className="table-cell">الاسم</th>
              <th className="table-cell">العمر</th>
              <th className="table-cell">الجنس</th>
              <th className="table-cell">المدينة</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredPatients.map(patient => (
              <tr 
                key={patient.id} 
                onClick={() => setSelectedPatient(patient)} 
                className={`table-row ${patient.id === newlyAddedPatientId ? 'animate-new-item' : ''}`}
              >
                <td className="table-cell font-semibold">{patient.fileNumber}</td>
                <td className="table-cell">{patient.name}</td>
                <td className="table-cell">{calculateAge(patient.birthDate)}</td>
                <td className="table-cell">{patient.gender}</td>
                <td className="table-cell">{patient.city}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      ) : (
        <FollowUpCalendarView 
            followUps={followUps} 
            onSelectPatient={setSelectedPatient} 
            isLoading={isLoadingFollowUps} 
        />
      )}
    </div>
  );
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

    if (diffDays < 30) {
        return `${diffDays <= 0 ? 1 : diffDays} يوم`;
    }

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
        years--;
        months += 12;
    }
    
    if (years < 1) {
        return `${months} شهر`;
    }

    return `${years} سنة و ${months} شهر`;
};


export default PatientsView;
