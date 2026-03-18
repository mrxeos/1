
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllVisits, getAllPatients, getAllExpenses } from '../services/db';
import { Visit, Patient, Expense } from '../types';

type FilterPeriod = 'daily' | 'monthly' | 'yearly' | 'allTime';

const StatisticsView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('daily');
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [patientsMap, setPatientsMap] = useState<Map<number, Patient>>(new Map());

  const fetchData = useCallback(async () => {
    const [visits, patients, expenses] = await Promise.all([
        getAllVisits(),
        getAllPatients(),
        getAllExpenses(),
    ]);
    setAllVisits(visits);
    setAllExpenses(expenses);
    setPatientsMap(new Map(patients.map(p => [p.id!, p])));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredStats = useMemo(() => {
    // We use string-based matching for accuracy across timezones
    const contextDate = new Date(selectedDate);
    const targetYear = String(contextDate.getFullYear());
    const targetMonth = String(contextDate.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${targetYear}-${targetMonth}`;

    let visitsForPeriod: Visit[];
    let expensesForPeriod: Expense[];

    switch (filterPeriod) {
        case 'monthly':
            visitsForPeriod = allVisits.filter(v => v.date.startsWith(monthPrefix));
            expensesForPeriod = allExpenses.filter(e => e.date.startsWith(monthPrefix));
            break;
        case 'yearly':
            visitsForPeriod = allVisits.filter(v => v.date.startsWith(targetYear));
            expensesForPeriod = allExpenses.filter(e => e.date.startsWith(targetYear));
            break;
        case 'allTime':
            visitsForPeriod = allVisits;
            expensesForPeriod = allExpenses;
            break;
        case 'daily':
        default:
            visitsForPeriod = allVisits.filter(v => v.date === selectedDate);
            expensesForPeriod = allExpenses.filter(e => e.date === selectedDate);
            break;
    }

    const examinations = visitsForPeriod.filter(v => v.type === 'كشف');
    const consultations = visitsForPeriod.filter(v => v.type === 'استشارة');
    const freeExaminations = visitsForPeriod.filter(v => v.type === 'كشف بدون مقابل');
    const freeConsultations = visitsForPeriod.filter(v => v.type === 'استشارة بدون مقابل');

    const examTotal = examinations.reduce((sum, visit) => sum + (visit.price ?? 0), 0);
    const consultTotal = consultations.reduce((sum, visit) => sum + (visit.price ?? 0), 0);
    const totalIncome = examTotal + consultTotal;
    const totalExpenses = expensesForPeriod.reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      examCount: examinations.length,
      consultCount: consultations.length,
      freeExamCount: freeExaminations.length,
      freeConsultCount: freeConsultations.length,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
    };
  }, [selectedDate, filterPeriod, allVisits, allExpenses]);
  
  const dailyDetails = useMemo(() => {
    const visitsForDay = allVisits.filter(v => v.date === selectedDate);
    const expensesForDay = allExpenses.filter(e => e.date === selectedDate);
    
    return {
      visits: visitsForDay.sort((a,b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
      expenses: expensesForDay,
    };
  }, [selectedDate, allVisits, allExpenses]);
  
  const getTypeStyle = (type: Visit['type']) => {
    switch(type) {
        case 'كشف':
            return 'tag-info';
        case 'كشف بدون مقابل':
            return 'tag-info-light';
        case 'استشارة':
            return 'tag-success';
        case 'استشارة بدون مقابل':
            return 'tag-success-light';
        default:
            return 'tag';
    }
  };

  const formatCurrency = (amount: number) => `${amount.toLocaleString('ar-EG')} جنيه`;

  const periodLabels: Record<FilterPeriod, string> = {
    daily: 'الإحصائيات اليومية',
    monthly: 'الإحصائيات الشهرية',
    yearly: 'إحصائيات هذا العام',
    allTime: 'الإحصائيات الكلية',
  };

  const periodDateLabels: Record<FilterPeriod, string> = {
    daily: 'اختر يوماً',
    monthly: 'اختر شهراً',
    yearly: 'اختر عاماً',
    allTime: '',
  };


  return (
    <div className="card flex-col gap-6">
      <div className="view-header">
        <h2 className="view-title">{periodLabels[filterPeriod]}</h2>
        <div className="flex flex-wrap items-center gap-4">
            <div>
                <label htmlFor="stats-period" className="font-semibold me-2">عرض إحصائيات:</label>
                <select 
                    id="stats-period" 
                    value={filterPeriod} 
                    onChange={e => setFilterPeriod(e.target.value as FilterPeriod)} 
                    className="input"
                    style={{minWidth: '150px'}}
                >
                    <option value="daily">اليومية</option>
                    <option value="monthly">الشهرية</option>
                    <option value="yearly">السنوية</option>
                    <option value="allTime">منذ البدء</option>
                </select>
            </div>
            {filterPeriod !== 'allTime' && (
              <div>
                <label htmlFor="stats-date" className="font-semibold me-2">{periodDateLabels[filterPeriod]}:</label>
                <input
                  id="stats-date"
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="input"
                />
              </div>
            )}
        </div>
      </div>
      
      <div className="stats-grid md:grid-cols-3 lg:grid-cols-5">
          <div className="stat-item stat-info">
            <h3>الكشوفات (مقابل)</h3>
            <p>{filteredStats.examCount}</p>
          </div>
          <div className="stat-item stat-success">
            <h3>الاستشارات (مقابل)</h3>
            <p>{filteredStats.consultCount}</p>
          </div>
          <div className="stat-item stat-info-light">
            <h3>الكشوفات (بدون)</h3>
            <p>{filteredStats.freeExamCount}</p>
          </div>
          <div className="stat-item stat-success-light">
            <h3>الاستشارات (بدون)</h3>
            <p>{filteredStats.freeConsultCount}</p>
          </div>
          <div className="stat-item stat-danger">
            <h3>إجمالي المصروفات</h3>
            <p>{formatCurrency(filteredStats.totalExpenses)}</p>
          </div>
          <div className="stat-item stat-accent col-span-full">
            <h3>صافي الدخل</h3>
            <p>{formatCurrency(filteredStats.netIncome)}</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col">
            <h3 className="text-lg font-bold mb-2">تفاصيل زيارات اليوم المحدد</h3>
            <div className="table-wrapper">
                <table className="table">
                    <thead className="table-header">
                        <tr>
                            <th className="table-cell">اسم المريض (رقم الملف)</th>
                            <th className="table-cell">نوع الزيارة</th>
                            <th className="table-cell">التشخيص</th>
                        </tr>
                    </thead>
                    <tbody className="table-body">
                    {dailyDetails.visits.length > 0 ? (
                        dailyDetails.visits.map(visit => {
                            const patient = patientsMap.get(visit.patientId);
                            return (
                                <tr key={visit.id} className="table-row">
                                    <td className="table-cell font-medium">
                                        {patient ? `${patient.name} (${patient.fileNumber})` : 'غير معروف'}
                                    </td>
                                    <td className="table-cell">
                                        <span className={`tag ${getTypeStyle(visit.type)}`}>
                                            {visit.type}
                                        </span>
                                    </td>
                                    <td className="table-cell">{visit.diagnosis}</td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={3} className="p-6 text-center text-secondary">لا توجد زيارات مسجلة في هذا اليوم.</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
        <div className="flex flex-col">
            <h3 className="text-lg font-bold mb-2">تفاصيل مصروفات اليوم المحدد</h3>
            <div className="table-wrapper">
            <table className="table">
                <thead className="table-header">
                    <tr>
                        <th className="table-cell">الوصف</th>
                        <th className="table-cell">الفئة</th>
                        <th className="table-cell">المبلغ</th>
                    </tr>
                </thead>
                <tbody className="table-body">
                {dailyDetails.expenses.length > 0 ? (
                    dailyDetails.expenses.map(expense => (
                        <tr key={expense.id} className="table-row">
                            <td className="table-cell font-medium">{expense.description}</td>
                            <td className="table-cell">{expense.category}</td>
                            <td className="table-cell font-semibold text-danger">{formatCurrency(expense.amount)}</td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={3} className="p-6 text-center text-secondary">لا توجد مصروفات مسجلة في هذا اليوم.</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
