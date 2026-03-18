import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getVisitsForMonth, getExpensesForMonth, addExpense, deleteExpense, updateExpense } from '../services/db';
import { Visit, Expense, ExpenseCategory } from '../types';
import { PlusIcon } from './icons';

const ExpensesView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyVisits, setMonthlyVisits] = useState<Visit[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newlyAddedExpenseId, setNewlyAddedExpenseId] = useState<number | null>(null);
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    category: 'اخرى',
    description: '',
    amount: 0,
  });

  const expenseCategories: ExpenseCategory[] = ['ايجار', 'مرتبات الموظفين', 'الفواتير', 'اخرى'];

  const fetchData = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const [visits, expenses] = await Promise.all([
      getVisitsForMonth(year, month),
      getExpensesForMonth(year, month),
    ]);
    setMonthlyVisits(visits);
    setMonthlyExpenses(expenses);
  }, [currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (newlyAddedExpenseId) {
      const timer = setTimeout(() => setNewlyAddedExpenseId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedExpenseId]);


  const financialSummary = useMemo(() => {
    const totalIncome = monthlyVisits.reduce((sum, visit) => sum + (visit.price ?? 0), 0);

    const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netProfit };
  }, [monthlyVisits, monthlyExpenses]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1); // Avoid month-end issues
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };
  
  const handleCancel = () => {
    setIsAddingExpense(false);
    setEditingExpense(null);
    setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'اخرى', description: '', amount: 0 });
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.description) {
        alert("يرجى إدخال الوصف والمبلغ.");
        return;
    }
    if (editingExpense) {
        await updateExpense(editingExpense.id!, newExpense);
    } else {
        const newId = await addExpense(newExpense as Expense);
        setNewlyAddedExpenseId(newId);
    }
    handleCancel();
    fetchData();
  };
  
  const handleStartEdit = (expense: Expense) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingExpense(expense);
    setNewExpense({
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount
    });
    setIsAddingExpense(true);
  }

  const handleDeleteExpense = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
        try {
            await deleteExpense(id);
            setMonthlyExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
        } catch (error) {
            console.error("Failed to delete expense:", error);
            alert("حدث خطأ أثناء محاولة حذف المصروف. يرجى المحاولة مرة أخرى.");
        }
    }
  }

  const formatCurrency = (amount: number) => `${amount.toLocaleString('ar-EG')} جنيه`;

  return (
    <div className="card h-full flex-col gap-6">
      <div className="view-header">
        <h2 className="view-title">الماليات والمصروفات</h2>
        <div className="month-navigator">
          <button onClick={() => handleMonthChange('next')} className="month-nav-btn">
            <span className="icon-wrapper icon-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </span>
          </button>
          <span className="month-display">{currentDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => handleMonthChange('prev')} className="month-nav-btn">
             <span className="icon-wrapper icon-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
             </span>
          </button>
        </div>
      </div>

      <div className="stats-grid md:grid-cols-3">
        <div className="stat-item stat-success"><h3>إجمالي الدخل</h3><p>{formatCurrency(financialSummary.totalIncome)}</p></div>
        <div className="stat-item stat-danger"><h3>إجمالي المصروفات</h3><p>{formatCurrency(financialSummary.totalExpenses)}</p></div>
        <div className="stat-item stat-info"><h3>صافي الربح</h3><p>{formatCurrency(financialSummary.netProfit)}</p></div>
      </div>

      <div className="flex flex-col">
        <div className="view-header">
            <h3 className="text-lg font-bold">سجل المصروفات للشهر</h3>
            <button onClick={() => isAddingExpense ? handleCancel() : setIsAddingExpense(true)} className="btn btn-secondary">
                <span className="icon-wrapper icon-sm me-2">
                    <PlusIcon />
                </span>
                {isAddingExpense ? 'إلغاء' : 'إضافة مصروف'}
            </button>
        </div>
        
        {isAddingExpense && (
            <div className="form-container-alt animate-fade-in-down">
                 <h3 className="form-title">{editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</h3>
                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="input-label-sm">الوصف</label>
                        <input type="text" placeholder="مثال: فاتورة كهرباء" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="input mt-1" required />
                    </div>
                     <div>
                        <label className="input-label-sm">المبلغ</label>
                        <input type="number" placeholder="المبلغ بالجنيه" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} className="input mt-1" required />
                    </div>
                    <div>
                        <label className="input-label-sm">التاريخ</label>
                        <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="input mt-1" required />
                    </div>
                    <div className="md:col-span-3">
                        <label className="input-label-sm">الفئة</label>
                        <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})} className="input mt-1">
                             {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                     <div className="md:col-span-1 flex justify-end">
                         <button type="submit" className="btn btn-accent w-full">
                             {editingExpense ? 'حفظ التعديلات' : 'حفظ المصروف'}
                         </button>
                     </div>
                </form>
            </div>
        )}

        <div className="table-wrapper">
            <table className="table">
                <thead className="table-header">
                    <tr>
                        <th className="table-cell">التاريخ</th>
                        <th className="table-cell">الوصف</th>
                        <th className="table-cell">الفئة</th>
                        <th className="table-cell">المبلغ</th>
                        <th className="table-cell">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="table-body">
                {monthlyExpenses.length > 0 ? (
                    monthlyExpenses.map(expense => (
                    <tr 
                        key={expense.id} 
                        className={`table-row ${expense.id === newlyAddedExpenseId ? 'animate-new-item' : ''}`}
                    >
                        <td className="table-cell">{new Date(expense.date).toLocaleDateString('ar-EG')}</td>
                        <td className="table-cell font-medium">{expense.description}</td>
                        <td className="table-cell">{expense.category}</td>
                        <td className="table-cell font-semibold text-danger">{formatCurrency(expense.amount)}</td>
                        <td className="table-cell whitespace-nowrap">
                            <button onClick={() => handleStartEdit(expense)} className="btn-action btn-info">تعديل</button>
                            <button onClick={() => handleDeleteExpense(expense.id!)} className="btn-action btn-danger">حذف</button>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={5} className="p-6 text-center text-secondary">لا توجد مصروفات مسجلة في هذا الشهر.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ExpensesView;