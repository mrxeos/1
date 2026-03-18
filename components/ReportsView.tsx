
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getAllVisits, getAllPatients, getAllPrescriptions, getAllExpenses, getAllMedicines } from '../services/db';
import { Patient, Visit, Prescription, Expense, Medicine } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatisticsIcon } from './icons';

type ReportType = 'frequentDiseases' | 'patientsPerCity' | 'medicineUsage' | 'monthlyReport';
type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all';
type MedicineReportPeriod = 'all' | 'last7' | 'last30' | 'thisYear';

interface MonthlyReportData {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    incomeData: { name: string; 'الدخل': number }[];
    visitCounts: {
        paidExams: number;
        paidConsults: number;
        freeExams: number;
        freeConsults: number;
    };
    topMedicines: { name: string; 'عدد المرات': number }[];
}

// Helper to get start date based on period
const getStartDateForPeriod = (period: TimePeriod): Date | null => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (period) {
        case 'today':
            return start;
        case 'week':
            // Start of week (assuming Saturday in Egypt context)
            const day = start.getDay(); 
            const diff = (day + 1) % 7; // Adjust for Saturday start
            start.setDate(start.getDate() - diff);
            return start;
        case 'month':
            start.setDate(1);
            return start;
        case 'year':
            start.setMonth(0, 1);
            return start;
        case 'all':
        default:
            return null;
    }
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
        if (selectedOption) {
            if (searchTerm !== selectedOption.label) {
                setSearchTerm(selectedOption.label);
            }
        } else {
           setSearchTerm('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, selectedOption, searchTerm]);

  const filteredOptions = useMemo(() => options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  ), [options, searchTerm]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    const selected = options.find(o => o.value === optionValue);
    setSearchTerm(selected ? selected.label : '');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
    if (e.target.value === '') onChange('');
  };
  
  useEffect(() => {
    if (!value) {
        setSearchTerm('');
    } else {
        const selected = options.find(o => o.value === value);
        if (selected) setSearchTerm(selected.label);
    }
  }, [value, options]);

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


const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  
  // New States for Time Filters
  const [diseasesPeriod, setDiseasesPeriod] = useState<TimePeriod>('all');
  const [citiesPeriod, setCitiesPeriod] = useState<TimePeriod>('all');

  const [selectedMedicineId, setSelectedMedicineId] = useState<string>('');
  const [medicineReportPeriod, setMedicineReportPeriod] = useState<MedicineReportPeriod>('all');
  const [reportMonth, setReportMonth] = useState(new Date());
  const [monthlyReportData, setMonthlyReportData] = useState<MonthlyReportData | null>(null);
  const [themeColors, setThemeColors] = useState({ chart1: '#14b8a6', chart2: '#0ea5e9', chart3: '#8884d8' });
  const componentToPrintRef = useRef<HTMLDivElement>(null);

  const getThemeColors = useCallback(() => {
    const styles = getComputedStyle(document.documentElement);
    setThemeColors({
      chart1: styles.getPropertyValue('--chart-1').trim() || '#14b8a6',
      chart2: styles.getPropertyValue('--chart-2').trim() || '#0ea5e9',
      chart3: styles.getPropertyValue('--chart-3').trim() || '#8884d8',
    });
  }, []);
  
    const calculateMonthlyReport = useCallback(() => {
        // Robust way to filter by month/year using string prefix matching
        const targetYear = reportMonth.getFullYear();
        const targetMonth = String(reportMonth.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${targetYear}-${targetMonth}`; // "YYYY-MM"
        
        // Use string startsWith to ensure day 31 is never lost to timezone shifts
        const monthlyVisits = allVisits.filter(v => v.date.startsWith(monthPrefix));
        const monthlyExpenses = allExpenses.filter(e => e.date.startsWith(monthPrefix));
        const monthlyPrescriptions = allPrescriptions.filter(p => p.date.startsWith(monthPrefix));

        const exams = monthlyVisits.filter(v => v.type === 'كشف');
        const consults = monthlyVisits.filter(v => v.type === 'استشارة');
        
        const incomeFromExams = exams.reduce((sum, v) => sum + (v.price ?? 0), 0);
        const incomeFromConsults = consults.reduce((sum, v) => sum + (v.price ?? 0), 0);
        const totalIncome = incomeFromExams + incomeFromConsults;
        const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        const medicineCounts = new Map<string, number>();
        monthlyPrescriptions.forEach(p => p.items.forEach(item => {
            medicineCounts.set(item.medicineName, (medicineCounts.get(item.medicineName) || 0) + 1);
        }));

        setMonthlyReportData({
            totalIncome,
            totalExpenses,
            netProfit: totalIncome - totalExpenses,
            incomeData: [
                { name: 'الكشوفات', 'الدخل': incomeFromExams },
                { name: 'الاستشارات', 'الدخل': incomeFromConsults },
            ],
            visitCounts: {
                paidExams: exams.length,
                paidConsults: consults.length,
                freeExams: monthlyVisits.filter(v => v.type === 'كشف بدون مقابل').length,
                freeConsults: monthlyVisits.filter(v => v.type === 'استشارة بدون مقابل').length,
            },
            topMedicines: Array.from(medicineCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, count]) => ({ name, 'عدد المرات': count })),
        });
  }, [reportMonth, allVisits, allExpenses, allPrescriptions]);

  useEffect(() => {
    const fetchData = async () => {
      const [visits, patients, prescriptions, expenses, medicines] = await Promise.all([
        getAllVisits(),
        getAllPatients(),
        getAllPrescriptions(),
        getAllExpenses(),
        getAllMedicines(),
      ]);
      setAllVisits(visits);
      setAllPatients(patients);
      setAllPrescriptions(prescriptions);
      setAllExpenses(expenses);
      setAllMedicines(medicines.sort((a,b) => a.name.localeCompare(b.name, 'ar')));
    };
    fetchData();
    getThemeColors();

    const themeObserver = new MutationObserver(() => getThemeColors());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => themeObserver.disconnect();
  }, [getThemeColors]);

   useEffect(() => {
        if (activeReport === 'monthlyReport') {
            calculateMonthlyReport();
        }
    }, [activeReport, reportMonth, calculateMonthlyReport]);


  const frequentDiseases = useMemo(() => {
    const startDate = getStartDateForPeriod(diseasesPeriod);
    const filteredVisits = startDate 
        ? allVisits.filter(v => new Date(v.date) >= startDate)
        : allVisits;

    const diseaseCounts: Record<string, number> = {};
    filteredVisits.forEach(visit => {
      if (visit.diagnosis) {
        const cleanDiagnosis = visit.diagnosis.replace(/\s*\(آخر استشارة\)/g, '').trim();
        diseaseCounts[cleanDiagnosis] = (diseaseCounts[cleanDiagnosis] || 0) + 1;
      }
    });
    return Object.entries(diseaseCounts).map(([name, count]) => ({ name, 'عدد الحالات': count }))
      .sort((a, b) => b['عدد الحالات'] - a['عدد الحالات']).slice(0, 10);
  }, [allVisits, diseasesPeriod]);

  const patientsPerCity = useMemo(() => {
    const startDate = getStartDateForPeriod(citiesPeriod);
    
    // We only count patients who had visits in the selected period
    let activePatients = allPatients;
    if (startDate) {
        const activePatientIds = new Set(
            allVisits
                .filter(v => new Date(v.date) >= startDate)
                .map(v => v.patientId)
        );
        activePatients = allPatients.filter(p => activePatientIds.has(p.id!));
    }

    const cityCounts: Record<string, number> = {};
    activePatients.forEach(patient => {
        const city = patient.city || 'غير محدد';
        cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
    return Object.entries(cityCounts).map(([name, count]) => ({ name, 'عدد المرضى': count }))
      .sort((a, b) => b['عدد المرضى'] - a['عدد المرضى']);
  }, [allPatients, allVisits, citiesPeriod]);
  
  const medicineUsageData = useMemo(() => {
    const now = new Date();
    const getStartDate = (period: MedicineReportPeriod) => {
        const startDate = new Date();
        switch (period) {
            case 'last7': startDate.setDate(now.getDate() - 7); return startDate;
            case 'last30': startDate.setDate(now.getDate() - 30); return startDate;
            case 'thisYear': startDate.setFullYear(now.getFullYear(), 0, 1); return startDate;
            default: return null;
        }
    };
    const startDate = getStartDate(medicineReportPeriod);
    const filteredPrescriptions = startDate
        ? allPrescriptions.filter(p => new Date(p.date) >= startDate)
        : allPrescriptions;

    const medicineCounts = new Map<string, number>();
    filteredPrescriptions.forEach(prescription => {
        prescription.items.forEach(item => {
            medicineCounts.set(item.medicineName, (medicineCounts.get(item.medicineName) || 0) + 1);
        });
    });
    return Array.from(medicineCounts, ([name, count]) => ({ name, 'عدد المرات': count }))
        .sort((a, b) => b['عدد المرات'] - a['عدد المرات']).slice(0, 15);
  }, [allPrescriptions, medicineReportPeriod]);

  const medicineOptions = useMemo(() => {
    return allMedicines.map(med => ({
        value: med.id!.toString(),
        label: med.name
    }));
  }, [allMedicines]);

  const medicineTrackingData = useMemo(() => {
    if (!selectedMedicineId) return null;

    const medicine = allMedicines.find(m => m.id === parseInt(selectedMedicineId));
    if (!medicine) return null;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    let counts = {
        last7Days: 0,
        last30Days: 0,
        thisYear: 0,
        allTime: 0
    };

    for (const pres of allPrescriptions) {
        const hasMedicine = pres.items.some(item => item.medicineId === medicine.id);
        if (hasMedicine) {
            counts.allTime++;
            const presDate = new Date(pres.date);
            if (presDate >= sevenDaysAgo) counts.last7Days++;
            if (presDate >= thirtyDaysAgo) counts.last30Days++;
            if (presDate >= startOfYear) counts.thisYear++;
        }
    }
    
    return {
        name: medicine.name,
        ...counts
    };
  }, [selectedMedicineId, allMedicines, allPrescriptions]);

  const exportToCSV = <T extends object,>(data: T[], filename: string) => {
    if(data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
          const cell = (row as any)[header];
          return `"${String(cell).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setReportMonth(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1); 
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const handlePrint = () => {
    const printContent = componentToPrintRef.current;
    if (!printContent) return;

    const baseStyles = Array.from(document.styleSheets)
        .map(sheet => {
            try {
                return Array.from(sheet.cssRules).map(rule => rule.cssText).join('');
            } catch (e) { return ''; }
        }).join('');

    const printThemeOverrides = `
        :root {
            --primary: ${getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()};
            --chart-1: ${getComputedStyle(document.documentElement).getPropertyValue('--chart-1').trim()};
            --chart-2: ${getComputedStyle(document.documentElement).getPropertyValue('--chart-2').trim()};
            --chart-3: ${getComputedStyle(document.documentElement).getPropertyValue('--chart-3').trim()};
            --background: #ffffff;
            --surface: #ffffff;
            --surface-alt: #f9fafb;
            --text-primary: #000000;
            --text-secondary: #4b5563;
            --border: #e5e7eb;
            --info-content: #eff6ff; --success-content: #f0fdf4; --danger-content: #fef2f2;
            --info: #3b82f6; --success: #16a34a; --danger: #dc2626;
            color-scheme: light;
        }
    `;

    const printLayoutOverrides = `
        @page { 
            size: A4 portrait; 
            margin: 0;
        }
        body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #fff !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10pt;
            margin: 0;
            padding: 1.25cm;
        }
        a {
            text-decoration: none !important;
            color: inherit !important;
        }
        .monthly-report-print-area { padding: 0 !important; margin: 0 !important; }
        .monthly-report-print-area > .text-3xl { display: none !important; }
        .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 0.5rem; }
        .stat-item { padding: 0.5rem; border-width: 1px; box-shadow: none; }
        .stat-item h3 { font-size: 1rem; }
        .stat-item p { font-size: 1.5rem; }
        .grid.lg\\:grid-cols-2 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; gap: 1rem !important; }
        .report-container { padding: 0.5rem; border-width: 1px; box-shadow: none; page-break-inside: avoid; }
        .report-title { margin-bottom: 0.5rem; }
        .recharts-responsive-container { width: 100% !important; height: 250px !important; }
        .recharts-wrapper { overflow: visible !important; }
        .recharts-text, .recharts-cartesian-axis-tick-value, .recharts-legend-item-text {
            fill: var(--text-primary) !important;
        }
    `;
    
    const printHeader = `
        <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 1.5rem; page-break-after: avoid;">
            <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">التقرير الشهري</h1>
            <div style="font-size: 0.875rem; color: #4b5563; text-align: left;">
                <p><strong>تقرير عن شهر:</strong> ${reportMonth.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</p>
                <p><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
        </header>
    `;

    const printWindow = window.open('', '', 'height=800,width=800');

    if (printWindow) {
        printWindow.document.write(`
            <html lang="ar" dir="rtl">
                <head>
                    <title>التقرير الشهري الشامل - ${reportMonth.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</title>
                    <style>
                        ${baseStyles}
                        ${printThemeOverrides}
                        ${printLayoutOverrides}
                    </style>
                </head>
                <body>
                    ${printHeader}
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        };
    }
  };

  const formatCurrency = (amount: number) => `${amount.toLocaleString('ar-EG')} جنيه`;

  // Time Filter Button Component
  const TimeFilterButtons = ({ active, onChange }: { active: TimePeriod, onChange: (p: TimePeriod) => void }) => (
    <div className="tabs tabs-sm">
        <button onClick={() => onChange('today')} className={`tab-btn ${active === 'today' ? 'active' : ''}`}>اليوم</button>
        <button onClick={() => onChange('week')} className={`tab-btn ${active === 'week' ? 'active' : ''}`}>هذا الأسبوع</button>
        <button onClick={() => onChange('month')} className={`tab-btn ${active === 'month' ? 'active' : ''}`}>هذا الشهر</button>
        <button onClick={() => onChange('year')} className={`tab-btn ${active === 'year' ? 'active' : ''}`}>هذا العام</button>
        <button onClick={() => onChange('all')} className={`tab-btn ${active === 'all' ? 'active' : ''}`}>الكلي</button>
    </div>
  );

  const renderActiveReport = () => {
    switch (activeReport) {
      case 'frequentDiseases':
        return (
          <div className="report-container">
            <div className="report-header multi-part">
              <div className="flex flex-col gap-2">
                <h3 className="report-title">الأمراض الأكثر شيوعاً</h3>
                <TimeFilterButtons active={diseasesPeriod} onChange={setDiseasesPeriod} />
              </div>
              <button onClick={() => exportToCSV(frequentDiseases, 'frequent_diseases.csv')} className="btn btn-success btn-sm">تصدير CSV</button>
            </div>
            {frequentDiseases.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={frequentDiseases} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-secondary)' }}/>
                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}/>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}/>
                    <Legend wrapperStyle={{ color: 'var(--text-primary)' }}/>
                    <Bar dataKey="عدد الحالات" fill={themeColors.chart2} />
                  </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="placeholder-view h-[400px]">
                    <p>لا توجد بيانات تشخيصات للفترة المختارة.</p>
                </div>
            )}
          </div>
        );
      case 'patientsPerCity':
        return (
          <div className="report-container">
            <div className="report-header multi-part">
              <div className="flex flex-col gap-2">
                <h3 className="report-title">توزيع المرضى حسب المدينة</h3>
                <TimeFilterButtons active={citiesPeriod} onChange={setCitiesPeriod} />
              </div>
              <button onClick={() => exportToCSV(patientsPerCity, 'patients_per_city.csv')} className="btn btn-success btn-sm">تصدير CSV</button>
            </div>
            {patientsPerCity.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={patientsPerCity} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }}/>
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)' }}/>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}/>
                    <Legend wrapperStyle={{ color: 'var(--text-primary)' }}/>
                    <Bar dataKey="عدد المرضى" fill={themeColors.chart3} />
                  </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="placeholder-view h-[400px]">
                    <p>لا يوجد نشاط للمرضى في الفترة المختارة.</p>
                </div>
            )}
          </div>
        );
      case 'medicineUsage':
        const FilterButton = ({ period, label }: { period: MedicineReportPeriod, label: string }) => (
            <button
                onClick={() => setMedicineReportPeriod(period)}
                className={`tab-btn ${medicineReportPeriod === period ? 'active' : ''}`}
            >
                {label}
            </button>
        );

        return (
          <div className="flex flex-col gap-6">
            <div className="report-container">
              <div className="report-header multi-part">
                <h3 className="report-title">الأدوية الأكثر كتابةً</h3>
                <div className="tabs tabs-sm">
                    <FilterButton period="all" label="كل الأوقات" />
                    <FilterButton period="last7" label="آخر 7 أيام" />
                    <FilterButton period="last30" label="آخر 30 يوم" />
                    <FilterButton period="thisYear" label="هذا العام" />
                </div>
                <button onClick={() => exportToCSV(medicineUsageData, 'medicine_usage.csv')} className="btn btn-success btn-sm">تصدير CSV</button>
              </div>
              {medicineUsageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={medicineUsageData} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-secondary)' }}/>
                      <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}/>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}/>
                      <Bar dataKey="عدد المرات" fill={themeColors.chart1} />
                    </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="placeholder-view h-[400px]">
                      <p>لا توجد بيانات لعرضها في الفترة المحددة.</p>
                  </div>
              )}
            </div>

            <div className="report-container">
                <h3 className="report-title">متابعة دواء محدد</h3>
                <div className="space-y-4">
                    <div className="max-w-md">
                        <label className="input-label-sm mb-2">اختر الدواء للمتابعة</label>
                        <SearchableSelect
                            options={medicineOptions}
                            value={selectedMedicineId}
                            onChange={setSelectedMedicineId}
                            placeholder="ابحث عن دواء..."
                        />
                    </div>
                    {medicineTrackingData && (
                        <div className="stats-grid md:grid-cols-4">
                           <div className="stat-item stat-secondary"><h4>آخر 7 أيام</h4><p>{medicineTrackingData.last7Days}</p></div>
                           <div className="stat-item stat-secondary"><h4>آخر 30 يوم</h4><p>{medicineTrackingData.last30Days}</p></div>
                           <div className="stat-item stat-secondary"><h4>هذا العام</h4><p>{medicineTrackingData.thisYear}</p></div>
                           <div className="stat-item stat-secondary"><h4>كل الأوقات</h4><p>{medicineTrackingData.allTime}</p></div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        );
       case 'monthlyReport':
            if (!monthlyReportData) {
                return <div className="placeholder-view">جاري تحميل بيانات التقرير...</div>;
            }
            return (
                <div>
                    <div className="report-header no-print">
                        <div className="month-navigator">
                            <button onClick={() => handleMonthChange('next')} className="month-nav-btn">&gt;</button>
                            <span className="month-display">{reportMonth.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</span>
                            <button onClick={() => handleMonthChange('prev')} className="month-nav-btn">&lt;</button>
                        </div>
                        <button onClick={handlePrint} className="btn btn-accent">طباعة التقرير</button>
                    </div>
                    <div ref={componentToPrintRef}>
                        <div className="monthly-report-print-area space-y-6">
                            <h2 className="text-3xl font-bold text-center">التقرير الشهري الشامل - {reportMonth.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</h2>
                            
                            <div className="stats-grid md:grid-cols-3">
                                <div className="stat-item stat-success"><h3>إجمالي الدخل</h3><p>{formatCurrency(monthlyReportData.totalIncome)}</p></div>
                                <div className="stat-item stat-danger"><h3>إجمالي المصروفات</h3><p>{formatCurrency(monthlyReportData.totalExpenses)}</p></div>
                                <div className="stat-item stat-info"><h3>صافي الربح</h3><p>{formatCurrency(monthlyReportData.netProfit)}</p></div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="report-container">
                                    <h3 className="report-title">تفاصيل الدخل</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={monthlyReportData.incomeData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
                                            <YAxis tick={{ fill: 'var(--text-secondary)' }} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} formatter={(value: number) => formatCurrency(value)} />
                                            <Bar dataKey="الدخل" fill={themeColors.chart1} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="report-container">
                                    <h3 className="report-title">تفاصيل الزيارات</h3>
                                    <div className="space-y-3 mt-4">
                                        <div className="flex justify-between p-2 rounded bg-info-content"><span>الكشوفات (المدفوعة)</span><span className="font-bold">{monthlyReportData.visitCounts.paidExams}</span></div>
                                        <div className="flex justify-between p-2 rounded bg-success-content"><span>الاستشارات (المدفوعة)</span><span className="font-bold">{monthlyReportData.visitCounts.paidConsults}</span></div>
                                        <div className="flex justify-between p-2 rounded bg-info-content opacity-70"><span>الكشوفات (المجانية)</span><span className="font-bold">{monthlyReportData.visitCounts.freeExams}</span></div>
                                        <div className="flex justify-between p-2 rounded bg-success-content opacity-70"><span>الاستشارات (المجانية)</span><span className="font-bold">{monthlyReportData.visitCounts.freeConsults}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="report-container">
                                <h3 className="report-title">الأدوية الأكثر استخداماً هذا الشهر</h3>
                                {monthlyReportData.topMedicines.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={monthlyReportData.topMedicines} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-secondary)' }} />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} />
                                            <Bar dataKey="عدد المرات" fill={themeColors.chart2} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="placeholder-view h-[300px]">
                                        <p>لم يتم وصف أي أدوية هذا الشهر.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
      default:
        return (
            <div className="placeholder-view">
                <span className="icon-wrapper placeholder-icon">
                    <StatisticsIcon />
                </span>
                <p className="text-2xl font-semibold">مرحباً بك في صفحة التقارير</p>
                <p className="mt-2 text-lg">اختر أحد التقارير من الأعلى للبدء.</p>
            </div>
        );
    }
  };

  return (
    <div className="card h-full flex-col gap-6 reports-view-container">
      <div className="no-print">
        <h2 className="view-title border-b pb-3">التقارير والإحصائيات</h2>
        
        <div className="tabs mt-4">
            <button onClick={() => setActiveReport('monthlyReport')} className={`tab-btn ${activeReport === 'monthlyReport' ? 'active' : ''}`}>التقرير الشهري</button>
            <button onClick={() => setActiveReport('frequentDiseases')} className={`tab-btn ${activeReport === 'frequentDiseases' ? 'active' : ''}`}>الأمراض الشائعة</button>
            <button onClick={() => setActiveReport('patientsPerCity')} className={`tab-btn ${activeReport === 'patientsPerCity' ? 'active' : ''}`}>توزيع المرضى</button>
            <button onClick={() => setActiveReport('medicineUsage')} className={`tab-btn ${activeReport === 'medicineUsage' ? 'active' : ''}`}>استهلاك الأدوية</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderActiveReport()}
      </div>
    </div>
  );
};

export default ReportsView;
