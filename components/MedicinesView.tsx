import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllMedicines, addMedicine, updateMedicine, deleteMedicine } from '../services/db';
import { Medicine } from '../types';
import { PlusIcon } from './icons';

const toArabicDigits = (str: string | number): string => {
    return String(str).replace(/[0-9]/g, (w) => "٠١٢٣٤٥٦٧٨٩"[parseInt(w)]);
};

const MedicinesView: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
  const [newMedicine, setNewMedicine] = useState<Omit<Medicine, 'id'>>({
    name: '',
    form: 'شراب',
    dosages: [],
    notes: ''
  });
  const [currentDosage, setCurrentDosage] = useState('');
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterForm, setFilterForm] = useState('الكل');
  const [newlyAddedMedicineId, setNewlyAddedMedicineId] = useState<number | null>(null);

  const fetchMedicines = useCallback(async () => {
    const allMedicines = await getAllMedicines();
    setMedicines(allMedicines);
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);
  
  useEffect(() => {
    if (newlyAddedMedicineId) {
      const timer = setTimeout(() => setNewlyAddedMedicineId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedMedicineId]);


  const handleStartEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setNewMedicine({
      name: medicine.name,
      form: medicine.form,
      dosages: medicine.dosages,
      notes: medicine.notes
    });
    setIsAddingOrEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDeleteMedicine = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الدواء؟')) {
      await deleteMedicine(id);
      fetchMedicines();
    }
  };

  const handleAddDosage = () => {
    if (currentDosage.trim()) {
      setNewMedicine(prev => ({ ...prev, dosages: [...prev.dosages, currentDosage.trim()] }));
      setCurrentDosage('');
    }
  };

  const handleRemoveDosage = (indexToRemove: number) => {
    setNewMedicine(prev => ({ ...prev, dosages: prev.dosages.filter((_, index) => index !== indexToRemove) }));
  };


  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedicine.name) {
        alert('يرجى إدخال اسم الدواء.');
        return;
    }

    if (editingMedicine) {
      await updateMedicine(editingMedicine.id!, newMedicine);
      await fetchMedicines();
    } else {
      const newId = await addMedicine(newMedicine as Medicine);
      await fetchMedicines();
      setNewlyAddedMedicineId(newId);
    }

    handleCancel();
  };
  
  const handleCancel = () => {
    setIsAddingOrEditing(false);
    setEditingMedicine(null);
    setNewMedicine({ name: '', form: 'شراب', dosages: [], notes: '' });
    setCurrentDosage('');
  };

  const filteredMedicines = useMemo(() => {
    return medicines
      .filter(m => filterForm === 'الكل' || m.form === filterForm)
      .filter(m => m.name.toLowerCase().startsWith(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [medicines, searchTerm, filterForm]);
  
  const medicineForms: Medicine['form'][] = ['شراب', 'أقراص', 'حقن', 'نقط', 'قطره', 'لبوس', 'بخاخ', 'كريم', 'مرهم', 'لبن اطفال', 'جل', 'بودرة', 'غسول', 'أكياس'];

  return (
    <div className="card h-full flex-col">
      <div className="view-header">
        <h2 className="view-title">قائمة الأدوية</h2>
        <button
          onClick={() => isAddingOrEditing ? handleCancel() : setIsAddingOrEditing(true)}
          className="btn btn-secondary"
        >
          <span className="icon-wrapper icon-sm me-2">
            <PlusIcon />
          </span>
          {isAddingOrEditing ? 'إلغاء' : 'إضافة دواء جديد'}
        </button>
      </div>

      {isAddingOrEditing && (
        <div className="form-container-alt animate-fade-in-down">
          <h3 className="form-title">{editingMedicine ? 'تعديل الدواء' : 'إضافة دواء جديد'}</h3>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="اسم الدواء" value={newMedicine.name} onChange={e => setNewMedicine({...newMedicine, name: e.target.value})} className="input" required />
            <select value={newMedicine.form} onChange={e => setNewMedicine({...newMedicine, form: e.target.value as Medicine['form']})} className="input">
              {medicineForms.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            
            <div className="md:col-span-2">
                <label className="input-label-sm mb-1">الجرعات</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="أضف جرعة جديدة (مثال: 5مل كل 8 ساعات)" 
                        value={currentDosage}
                        onChange={(e) => setCurrentDosage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDosage(); } }}
                        className="input flex-1"
                    />
                    <button 
                        type="button" 
                        onClick={handleAddDosage}
                        className="btn btn-accent"
                    >
                        إضافة
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {newMedicine.dosages.map((dosage, index) => (
                        <div key={index} className="tag tag-accent">
                            {toArabicDigits(dosage)}
                            <button 
                                type="button" 
                                onClick={() => handleRemoveDosage(index)}
                                className="tag-delete-btn"
                                aria-label={`حذف جرعة ${dosage}`}
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <input type="text" placeholder="ملاحظات" value={newMedicine.notes} onChange={e => setNewMedicine({...newMedicine, notes: e.target.value})} className="input md:col-span-2" />
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="btn btn-accent">
                {editingMedicine ? 'تحديث الدواء' : 'حفظ الدواء'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="ابحث عن دواء..."
          className="input md:w-1/2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="input md:w-1/4"
          value={filterForm}
          onChange={(e) => setFilterForm(e.target.value)}
        >
          <option value="الكل">كل الأشكال</option>
          {medicineForms.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-cell">الاسم</th>
              <th className="table-cell">الشكل</th>
              <th className="table-cell">الجرعات</th>
              <th className="table-cell">ملاحظات</th>
              <th className="table-cell">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredMedicines.map(med => (
              <tr 
                key={med.id} 
                className={`table-row ${med.id === newlyAddedMedicineId ? 'animate-new-item' : ''}`}
              >
                <td className="table-cell font-medium">{med.name}</td>
                <td className="table-cell">{med.form}</td>
                <td className="table-cell">{med.dosages.map(d => toArabicDigits(d)).join(' | ')}</td>
                <td className="table-cell">{med.notes}</td>
                <td className="table-cell whitespace-nowrap">
                    <button onClick={() => handleStartEdit(med)} className="btn-action btn-info">تعديل</button>
                    <button onClick={() => handleDeleteMedicine(med.id!)} className="btn-action btn-danger">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MedicinesView;