import React, { useState, useEffect, useRef } from 'react';
import { Prescription, Patient, PrescriptionSettings, Visit, PrescriptionFieldSetting } from '../types';
import { getSettings } from '../services/settingsService';

interface PrescriptionPrintProps {
    prescription: Prescription | null;
    patient?: Patient | null;
    visit?: Visit | null;
    settingsOverride?: PrescriptionSettings;
    isEditablePreview?: boolean;
    onFieldPositionChange?: (fieldKey: keyof PrescriptionSettings, newPosition: { top: string; horizontalEdge: 'left' | 'right'; horizontalOffset: string }) => void;
}

const toArabicDigits = (str: string | number): string => {
    return String(str).replace(/[0-9]/g, (w) => "٠١٢٣٤٥٦٧٨٩"[parseInt(w)]);
};

const InfoItem: React.FC<{
    fieldKey: keyof PrescriptionSettings;
    setting: PrescriptionFieldSetting;
    value?: string | number;
    isEditable?: boolean;
    containerRef?: React.RefObject<HTMLDivElement>;
    onPositionChange?: (fieldKey: keyof PrescriptionSettings, newPosition: { top: string; horizontalEdge: 'left' | 'right'; horizontalOffset: string }) => void;
}> = ({ fieldKey, setting, value, isEditable, containerRef, onPositionChange }) => {
    if (!setting.enabled || !value) return null;

    const itemRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isEditable || !itemRef.current || !containerRef?.current || !onPositionChange) return;

        e.preventDefault();
        const itemEl = itemRef.current;
        const containerEl = containerRef.current;
        const scale = 0.9; 

        const containerRect = containerEl.getBoundingClientRect();
        const itemRect = itemEl.getBoundingClientRect();
        
        const initialLeft = itemRect.left - containerRect.left;
        const initialTop = itemRect.top - containerRect.top;
        const initialMouseX = e.clientX;
        const initialMouseY = e.clientY;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - initialMouseX;
            const dy = moveEvent.clientY - initialMouseY;
            itemEl.style.top = `${initialTop + dy}px`;
            itemEl.style.left = `${initialLeft + dx}px`;
            itemEl.style.right = 'auto';
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            
            const finalItemRect = itemEl.getBoundingClientRect();
            
            const finalTopPx = (finalItemRect.top - containerRect.top) / scale;
            const finalLeftPx = (finalItemRect.left - containerRect.left) / scale;
            const finalRightPx = (containerRect.right - finalItemRect.right) / scale;

            const containerHeight = containerEl.offsetHeight;
            const containerWidth = containerEl.offsetWidth;

            const newTopPercent = (finalTopPx / containerHeight) * 100;
            const newLeftPercent = (finalLeftPx / containerWidth) * 100;
            const newRightPercent = (finalRightPx / containerWidth) * 100;
            
            const newPosition = {
                top: `${newTopPercent.toFixed(2)}%`,
                horizontalEdge: 'left' as 'left' | 'right',
                horizontalOffset: '',
            };

            if (newLeftPercent < newRightPercent) {
                newPosition.horizontalEdge = 'left';
                newPosition.horizontalOffset = `${newLeftPercent.toFixed(2)}%`;
            } else {
                newPosition.horizontalEdge = 'right';
                newPosition.horizontalOffset = `${newRightPercent.toFixed(2)}%`;
            }
            
            onPositionChange(fieldKey, newPosition);

            // Clear inline styles used for dragging so component re-renders with state-driven styles
            itemEl.style.top = '';
            itemEl.style.left = '';
            itemEl.style.right = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const editableStyles: React.CSSProperties = isEditable ? {
        cursor: 'move',
        border: '1px dashed rgba(var(--primary-rgb), 0.5)',
        padding: '2px 4px',
        borderRadius: '4px',
        userSelect: 'none',
        backgroundColor: 'rgba(var(--primary-rgb), 0.05)',
    } : {};

    const dynamicStyles: React.CSSProperties = {
        top: setting.top,
        textAlign: setting.textAlign,
        ...editableStyles,
    };
    if (setting.horizontalEdge === 'left') {
        dynamicStyles.left = setting.horizontalOffset;
    } else {
        dynamicStyles.right = setting.horizontalOffset;
    }
    
    return (
        <div
            ref={itemRef}
            className="prescription-info-item"
            style={dynamicStyles}
            onMouseDown={isEditable ? handleMouseDown : undefined}
        >
            {setting.showLabel && <span className="font-semibold" style={{pointerEvents: 'none'}}>{setting.label} </span>}
            <span style={{pointerEvents: 'none'}}>{value}</span>
        </div>
    );
};


const PrescriptionPrint: React.FC<PrescriptionPrintProps> = ({ prescription, patient, visit, settingsOverride, isEditablePreview, onFieldPositionChange }) => {
    const [settings, setSettings] = useState<PrescriptionSettings | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Use override for live preview, otherwise fetch from storage
        const fetchSettings = async () => {
            if (settingsOverride) {
                setSettings(settingsOverride);
            } else {
                const s = await getSettings();
                setSettings(s);
            }
        };
        fetchSettings();
    }, [settingsOverride]);

    if (!prescription || !patient || !settings) return null;
    
    const calculateAge = (birthDate: string, visitDateStr: string): string => {
        const birth = new Date(birthDate);
        const visitDate = new Date(visitDateStr);
    
        if (isNaN(birth.getTime()) || birth > visitDate) {
            return "Invalid Date";
        }
        
        const birthDay = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
        const visitDay = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());
        
        if (birthDay.getTime() === visitDay.getTime()) {
            return "Newborn";
        }
    
        const diff = visitDate.getTime() - birth.getTime();
        const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
        if (diffDays < 30) {
            return `${diffDays <= 0 ? 1 : diffDays} D`;
        }
    
        let years = visitDate.getFullYear() - birth.getFullYear();
        let months = visitDate.getMonth() - birth.getMonth();
    
        if (months < 0 || (months === 0 && visitDate.getDate() < birth.getDate())) {
            years--;
            months += 12;
        }
        
        if (years < 1) {
            return `${months} M`;
        }
    
        return `${years} Y, ${months} M`;
    };

    const formatFollowUpDate = (dateString: string): string => {
        const date = new Date(dateString);
        const dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' });
        const formattedDate = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric', year: 'numeric' });
        return `الاستشارة يوم ${dayName} الموافق ${formattedDate}`;
    };

    const renderInfoItem = (fieldKey: keyof PrescriptionSettings, value?: string | number) => {
        return (
            <InfoItem
                fieldKey={fieldKey}
                setting={settings[fieldKey] as PrescriptionFieldSetting}
                value={value}
                isEditable={isEditablePreview}
                containerRef={containerRef}
                onPositionChange={onFieldPositionChange}
            />
        );
    };


    return (
        <div 
            ref={containerRef}
            className="prescription-print"
            style={{ 
                fontSize: `${settings.fontSize}px`,
                fontFamily: settings.fontFamily 
            }}
        >
            <header className="prescription-header" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: settings.headerText }}></header>
            
            <div 
                className="prescription-patient-info"
                style={{ minHeight: `${settings.headerAreaHeight * 0.25}rem` }}
            >
                {/* This div is now just a container for spacing, positioning is handled by InfoItem relative to the main print div */}
            </div>

            {renderInfoItem('patientName', patient.name)}
            {renderInfoItem('visitDate', new Date(prescription.date).toLocaleDateString('ar-EG'))}
            {renderInfoItem('patientAge', calculateAge(patient.birthDate, prescription.date))}
            {renderInfoItem('patientWeight', visit && visit.weight > 0 ? `${visit.weight} Kg` : undefined)}
            {renderInfoItem('temperature', visit && visit.temperature > 0 ? `${visit.temperature}°` : undefined)}
            {renderInfoItem('symptoms', prescription.symptoms)}
            {renderInfoItem('diagnosis', visit?.diagnosis.replace('(آخر استشارة)', '').trim())}

            <div className="prescription-body">
                <div className="prescription-items-container mt-4">
                    {prescription.items.map((item, index) => (
                        <div key={index} dir="ltr" className="prescription-item-print" style={{fontSize: `${settings.fontSize}px`}}>
                            <div className="font-bold text-left">
                                R/ {item.medicineName}
                                {item.form === 'حقن' && item.quantity && 
                                    <span className="font-semibold"> ({toArabicDigits(item.quantity)})</span>
                                }
                            </div>
                            <div className="text-secondary text-right">
                                {toArabicDigits(item.dosage)}
                            </div>
                        </div>
                    ))}
                </div>
            
                {settings.showDoctorNotes && prescription.doctorNotes && (
                    <div className="prescription-notes-section">
                        <p className="text-sm whitespace-pre-wrap">
                            <span className="font-bold">ملاحظات الطبيب:</span> {prescription.doctorNotes}
                        </p>
                    </div>
                )}

                {(prescription.requiredTests || prescription.requiredScans) && (
                     <div className="prescription-notes-section">
                        <p>
                            {prescription.requiredTests && (
                                <span>
                                    <span className="font-bold">التحاليل:</span> {prescription.requiredTests}
                                </span>
                            )}
                            {prescription.requiredTests && prescription.requiredScans && '   '}
                            {prescription.requiredScans && (
                                <span>
                                    <span className="font-bold">الاشعه:</span> {prescription.requiredScans}
                                </span>
                            )}
                        </p>
                    </div>
                )}

                {prescription.followUpDate && (
                    <div className="prescription-follow-up">
                        <p>{formatFollowUpDate(prescription.followUpDate)}</p>
                    </div>
                )}

            </div>
            
            <footer className="prescription-footer">
                <div className="signature-area text-left" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: settings.footerText }}></div>
            </footer>
            {renderInfoItem('fileNumber', patient.fileNumber)}
        </div>
    );
};

export default PrescriptionPrint;