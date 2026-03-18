import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getTheme, saveTheme, getCustomThemeColors, saveCustomThemeColors, defaultCustomColors, getPrices, savePrices } from '../services/settingsService';
import { exportDB, importDB } from '../services/db';

type Theme = { id: string; name: string; colors: { bg: string; primary: string; secondary: string } };
const themes: Theme[] = [
    { id: 'default', name: 'أساسي', colors: { bg: '#f3f4f6', primary: '#0d9488', secondary: '#0ea5e9' } },
    { id: 'dark', name: 'الداكن', colors: { bg: '#000000', primary: '#dc2626', secondary: '#f97316' } },
    { id: 'different', name: 'مختلف', colors: { bg: '#fdf6e3', primary: '#fb923c', secondary: '#854d0e' } },
    { id: 'feminine', name: 'النسائي', colors: { bg: '#fdf2f8', primary: '#d946ef', secondary: '#fb7185' } },
    { id: 'custom', name: 'مخصص', colors: { bg: 'var(--background)', primary: 'var(--primary)', secondary: 'var(--secondary)' } },
];

const customizableColors = [
    { name: 'primary', label: 'اللون الأساسي' },
    { name: 'primaryFocus', label: 'تركيز الأساسي' },
    { name: 'primaryContent', label: 'محتوى الأساسي' },
    { name: 'secondary', label: 'اللون الثانوي' },
    { name: 'accent', label: 'اللون المميز' },
    { name: 'background', label: 'لون الخلفية' },
    { name: 'surface', label: 'لون الأسطح' },
    { name: 'textPrimary', label: 'لون النص الأساسي' },
    { name: 'textSecondary', label: 'لون النص الثانوي' },
    { name: 'border', label: 'لون الحدود' },
];


// --- Main SettingsView Component ---
interface SettingsViewProps {
    user: User;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
    const [backupStatus, setBackupStatus] = useState('');
    const [activeTheme, setActiveTheme] = useState(getTheme());
    const [customColors, setCustomColors] = useState(getCustomThemeColors());
    const [prices, setPrices] = useState({ exam: 0, consult: 0 });

    useEffect(() => {
        const fetchPrices = async () => {
            const p = await getPrices();
            setPrices(p);
        };
        fetchPrices();
    }, []);

    const handlePriceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newPrices = { ...prices, [name]: Number(value) || 0 };
        setPrices(newPrices);
        await savePrices(newPrices);
    };

    const applyCustomTheme = (colors: typeof defaultCustomColors) => {
        const root = document.documentElement;
        root.className = 'theme-custom';
        for (const [key, value] of Object.entries(colors)) {
            const cssVar = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            root.style.setProperty(`--${cssVar}`, value);
        }
    };

    const clearCustomTheme = () => {
        const root = document.documentElement;
        for (const key of Object.keys(defaultCustomColors)) {
             const cssVar = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            root.style.removeProperty(`--${cssVar}`);
        }
    };
    
     const handleThemeChange = (themeId: string) => {
        setActiveTheme(themeId);
        saveTheme(themeId);

        if (themeId === 'custom') {
            applyCustomTheme(customColors);
        } else {
            clearCustomTheme();
            document.documentElement.className = 'theme-' + themeId;
        }
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newColors = { ...customColors, [name]: value };
        setCustomColors(newColors);
        saveCustomThemeColors(newColors);
        if (activeTheme === 'custom') {
            const cssVar = name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            document.documentElement.style.setProperty(`--${cssVar}`, value);
        }
    };

    const handleExport = async () => {
        try {
            setBackupStatus('جاري تصدير البيانات...');
            const data = await exportDB();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            link.download = `clinic-backup-${date}.json`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setBackupStatus('تم تصدير البيانات بنجاح!');
        } catch (error) {
            console.error('Export failed:', error);
            setBackupStatus('فشل تصدير البيانات.');
        } finally {
            setTimeout(() => setBackupStatus(''), 3000);
        }
    };

    const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const confirmation = window.confirm(
            'تحذير: استعادة نسخة احتياطية ستحذف جميع البيانات الحالية بشكل دائم. هل أنت متأكد من المتابعة؟'
        );
        if (!confirmation) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                setBackupStatus('جاري استعادة البيانات...');
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('File could not be read');
                const data = JSON.parse(text);
                await importDB(data);
                setBackupStatus('تم استعادة البيانات بنجاح! سيتم إعادة تحميل التطبيق.');
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                console.error('Import failed:', error);
                setBackupStatus('فشل استعادة البيانات. تأكد من أن الملف صحيح.');
                setTimeout(() => setBackupStatus(''), 3000);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="card h-full flex-col">
            <h2 className="view-title">الإعدادات العامة</h2>
            <div className="flex-1 overflow-y-auto pr-4 space-y-10">
                
                {/* Theme Settings */}
                <section>
                    <h3 className="settings-section-title">مظهر التطبيق</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {themes.map(theme => (
                            <div key={theme.id} onClick={() => handleThemeChange(theme.id)} className={`theme-selector ${activeTheme === theme.id ? 'active' : ''}`}>
                                <p className="font-semibold mb-3">{theme.name}</p>
                                <div className="flex items-center gap-2">
                                    <div className="theme-swatch" style={{ backgroundColor: theme.colors.bg, border: `2px solid ${theme.colors.secondary}` }}></div>
                                    <div className="theme-swatch" style={{ backgroundColor: theme.colors.primary }}></div>
                                    <div className="theme-swatch" style={{ backgroundColor: theme.colors.secondary }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                
                 {activeTheme === 'custom' && (
                    <section>
                        <h3 className="settings-section-title">تخصيص الألوان</h3>
                        <div className="form-container-alt grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                            {customizableColors.map(({name, label}) => (
                                <div key={name} className="flex items-center justify-between">
                                    <label htmlFor={name} className="text-sm font-medium text-secondary">{label}</label>
                                    <div className="relative">
                                        <input
                                            type="color"
                                            id={name}
                                            name={name}
                                            value={customColors[name as keyof typeof customColors]}
                                            onChange={handleCustomColorChange}
                                            className="color-picker"
                                            style={{backgroundColor: customColors[name as keyof typeof customColors]}}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                
                {/* Price Settings */}
                <section>
                    <h3 className="settings-section-title">إعدادات أسعار الزيارات</h3>
                     <div className="form-container-alt grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="input-label-sm">قيمة الكشف (جنيه)</label>
                            <input type="number" name="exam" value={prices.exam} onChange={handlePriceChange} className="input mt-1" />
                        </div>
                        <div>
                            <label className="input-label-sm">قيمة الاستشارة (جنيه)</label>
                            <input type="number" name="consult" value={prices.consult} onChange={handlePriceChange} className="input mt-1" />
                        </div>
                    </div>
                </section>

                {/* Data Management */}
                <section>
                    <h3 className="settings-section-title">إدارة البيانات (النسخ الاحتياطي والاستعادة)</h3>
                    <div className="form-container-alt space-y-4">
                        <p className="text-sm text-secondary">
                            قم بتصدير نسخة من جميع بيانات العيادة لحفظها في مكان آمن. يمكنك استعادتها لاحقاً إذا لزم الأمر.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={handleExport} className="btn btn-primary w-full">
                                تصدير نسخة احتياطية
                            </button>
                            <label className="btn btn-danger w-full text-center cursor-pointer">
                                استعادة نسخة احتياطية
                                <input type="file" accept=".json" onChange={handleImportChange} className="hidden" />
                            </label>
                        </div>
                        {backupStatus && <p className="text-center text-sm font-semibold mt-2">{backupStatus}</p>}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SettingsView;