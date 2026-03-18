import React, { useState, useEffect } from 'react';
import { WaitingListItem, Patient, User } from '../types';
import { getWaitingList, removeFromWaitingList, addToWaitingList, getAllPatients, toggleEmergency } from '../services/db';
import { PlusIcon, TrashIcon, PatientIcon, UserIcon, CheckIcon, XIcon } from './icons';
import { View } from '../types';

interface WaitingListViewProps {
    user: User;
    setActiveView: (view: View) => void;
    onTriggerAddPatient: () => void;
}

const WaitingListView: React.FC<WaitingListViewProps> = ({ user, setActiveView, onTriggerAddPatient }) => {
    const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [list, allPatients] = await Promise.all([
                getWaitingList(),
                getAllPatients()
            ]);
            
            // Calculate original numbers based on addedAt time
            const sortedByTime = [...list].sort((a, b) => a.addedAt - b.addedAt);
            const listWithOriginalNumbers = list.map(item => {
                const originalIndex = sortedByTime.findIndex(i => i.id === item.id);
                return { ...item, originalNumber: originalIndex + 1 };
            });

            // Sort for display: Emergency first, then by original number
            const sortedList = listWithOriginalNumbers.sort((a, b) => {
                if (a.isEmergency && !b.isEmergency) return -1;
                if (!a.isEmergency && b.isEmergency) return 1;
                return a.addedAt - b.addedAt;
            });
            
            setWaitingList(sortedList as any);
            setPatients(allPatients);
        } catch (error) {
            console.error('Error fetching waiting list data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToBottom = () => {
        const container = document.getElementById('waiting-list-container');
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    };

    const handleAddToWaitingList = async (patient: Patient) => {
        if (waitingList.some(item => item.patientId === patient.id)) {
            alert('المريض موجود بالفعل في قائمة الانتظار.');
            return;
        }

        try {
            await addToWaitingList({
                patientId: patient.id!,
                patientName: patient.name,
                patientFileNumber: patient.fileNumber
            });
            await fetchData();
            setIsAddModalOpen(false);
            setSearchTerm('');
        } catch (error) {
            console.error('Error adding to waiting list:', error);
        }
    };

    const handleRemoveFromWaitingList = async (id: number) => {
        try {
            await removeFromWaitingList(id);
            await fetchData();
        } catch (error) {
            console.error('Error removing from waiting list:', error);
        }
    };

    const handleToggleEmergency = async (id: number, currentStatus: boolean) => {
        try {
            await toggleEmergency(id, !currentStatus);
            await fetchData();
        } catch (error) {
            console.error('Error toggling emergency status:', error);
        }
    };

    const handleGoToAddNewPatient = () => {
        setIsAddModalOpen(false);
        setSearchTerm('');
        onTriggerAddPatient();
        setActiveView(View.Patients);
    };

    const filteredPatients = searchTerm.trim() ? patients.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.fileNumber.toString().includes(searchTerm)
    ).slice(0, 10) : [];

    return (
        <div className="card h-full flex-col">
            <div className="view-header">
                <div className="flex items-center gap-4">
                    <h2 className="view-title">قائمة الانتظار</h2>
                    <span className="waiting-list-count">
                        {waitingList.length} مريض
                    </span>
                    <button 
                        onClick={fetchData}
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
                <div className="flex gap-2">
                    {waitingList.length > 5 && (
                        <button 
                            onClick={scrollToBottom}
                            className="btn btn-light"
                            title="النزول للأسفل"
                        >
                            <span className="icon-wrapper icon-sm me-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7m14-8l-7 7-7-7" />
                                </svg>
                            </span>
                            النزول للأسفل
                        </button>
                    )}
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn btn-secondary"
                    >
                        <span className="icon-wrapper icon-sm me-2">
                            <PlusIcon />
                        </span>
                        إضافة للقائمة
                    </button>
                </div>
            </div>

            <div id="waiting-list-container" className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : waitingList.length > 0 ? (
                    <div className="flex flex-col gap-3 p-2 max-w-4xl mx-auto">
                        {waitingList.map((item: any, index) => (
                            <div key={item.id} className={`waiting-list-item animate-fade-in-down ${item.isEmergency ? 'is-emergency' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`waiting-list-number ${item.isEmergency ? 'bg-danger text-white' : ''}`}>
                                        {item.originalNumber || index + 1}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${item.isEmergency ? 'text-danger' : ''}`}>
                                            {item.patientName}
                                            {item.isEmergency && <span className="ms-2 badge badge-danger">حالة طارئة</span>}
                                        </h3>
                                        <p className="text-secondary text-sm">رقم الملف: {item.patientFileNumber}</p>
                                        <p className="text-xs opacity-50 mt-1">
                                            تمت الإضافة: {new Date(item.addedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {user.role === 'Doctor' && (
                                        <button 
                                            onClick={() => handleToggleEmergency(item.id!, !!item.isEmergency)}
                                            className={`btn btn-sm ${item.isEmergency ? 'btn-light' : 'btn-warning'} flex items-center gap-1`}
                                            title={item.isEmergency ? 'إلغاء الحالة الطارئة' : 'تحديد كحالة طارئة'}
                                        >
                                            <span className="icon-wrapper icon-xs">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </span>
                                            {item.isEmergency ? 'إلغاء الطوارئ' : 'حالة طارئة'}
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleRemoveFromWaitingList(item.id!)}
                                        className="btn btn-sm btn-success flex items-center gap-1"
                                        title="تمت الزيارة"
                                    >
                                        <span className="icon-wrapper icon-xs"><CheckIcon /></span>
                                        تمت الزيارة
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveFromWaitingList(item.id!)}
                                        className="btn btn-sm btn-danger flex items-center gap-1"
                                        title="إلغاء الزيارة"
                                    >
                                        <span className="icon-wrapper icon-xs"><XIcon /></span>
                                        إلغاء الزيارة
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="placeholder-view">
                        <div className="icon-wrapper placeholder-icon">
                            <PatientIcon />
                        </div>
                        <p className="text-xl">قائمة الانتظار فارغة حالياً.</p>
                        <p className="text-secondary mt-2">يمكنك إضافة مرضى من زر "إضافة للقائمة" أعلاه.</p>
                    </div>
                )}
            </div>

            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-2xl">
                        <div className="modal-header">
                            <h3 className="modal-title">إضافة مريض لقائمة الانتظار</h3>
                            <button onClick={() => {
                                setIsAddModalOpen(false);
                                setSearchTerm('');
                            }} className="modal-close-btn">&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="بحث باسم المريض أو رقم الملف..." 
                                    className="input flex-1"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                                <button 
                                    onClick={handleGoToAddNewPatient}
                                    className="btn btn-secondary"
                                    title="إضافة مريض جديد"
                                >
                                    <PlusIcon />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {searchTerm.trim() === '' ? (
                                    <div className="text-center py-8">
                                        <p className="text-secondary">ابدأ البحث بالاسم أو رقم الملف للعثور على مريض...</p>
                                    </div>
                                ) : filteredPatients.length > 0 ? (
                                    filteredPatients.map(patient => (
                                        <div 
                                            key={patient.id} 
                                            className="flex items-center justify-between p-3 bg-surface-alt rounded border border-transparent hover:border-primary cursor-pointer transition-all"
                                            onClick={() => handleAddToWaitingList(patient)}
                                        >
                                            <div>
                                                <p className="font-bold">{patient.name}</p>
                                                <p className="text-sm text-secondary">رقم الملف: {patient.fileNumber} - {patient.city}</p>
                                            </div>
                                            <button className="btn btn-sm btn-primary">إضافة</button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-secondary mb-4">لم يتم العثور على مرضى بهذا الاسم.</p>
                                        <button 
                                            onClick={handleGoToAddNewPatient}
                                            className="btn btn-primary"
                                        >
                                            إضافة مريض جديد
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => {
                                setIsAddModalOpen(false);
                                setSearchTerm('');
                            }} className="btn btn-light">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaitingListView;
