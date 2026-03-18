import React, { useState, useEffect } from 'react';
import { WaitingListItem } from '../types';
import { getWaitingList } from '../services/db';
import { PatientIcon } from './icons';

const WaitingListDisplay: React.FC = () => {
    const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const list = await getWaitingList();
            
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
        } catch (error) {
            console.error('Error fetching waiting list data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="waiting-list-display-container">
            <div className="display-header">
                <h1 className="display-title">قائمة الانتظار - عيادتي</h1>
                <div className="display-stats">
                    <span className="count-badge">{waitingList.length} مريض</span>
                    <span className="time-badge">{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            <div className="display-content">
                {isLoading ? (
                    <div className="display-loading">
                        <div className="spinner"></div>
                        <p>جاري التحميل...</p>
                    </div>
                ) : waitingList.length > 0 ? (
                    <div className="display-grid">
                        {waitingList.map((item: any, index) => (
                            <div key={item.id} className={`display-item ${index === 0 ? 'next-patient' : ''} ${item.isEmergency ? 'is-emergency' : ''}`}>
                                <div className={`item-number ${item.isEmergency ? 'bg-danger' : ''}`}>{item.originalNumber || index + 1}</div>
                                <div className="item-info">
                                    <h2 className={`patient-name ${item.isEmergency ? 'text-danger' : ''}`}>
                                        {item.patientName}
                                        {item.isEmergency && <span className="ms-2 badge badge-danger">حالة طارئة</span>}
                                    </h2>
                                    <p className="file-number">رقم الملف: {item.patientFileNumber}</p>
                                </div>
                                {item.isEmergency ? (
                                    <div className="next-label bg-danger">حالة طارئة</div>
                                ) : index === 0 && (
                                    <div className="next-label">الدور القادم</div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="display-empty">
                        <div className="icon-wrapper">
                            <PatientIcon />
                        </div>
                        <p>لا يوجد مرضى في قائمة الانتظار حالياً.</p>
                    </div>
                )}
            </div>
            
            <div className="display-footer">
                <p>يرجى الانتظار حتى يتم مناداة اسمك. شكراً لتعاونكم.</p>
            </div>
        </div>
    );
};

export default WaitingListDisplay;
