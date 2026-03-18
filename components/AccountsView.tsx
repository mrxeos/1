import React, { useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { getUsers, addUser, updateUser, deleteUser } from '../services/settingsService';
import { PlusIcon } from './icons';

const AccountsView: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newlyAddedUserId, setNewlyAddedUserId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'Doctor' as Role,
    });

    const fetchUsers = useCallback(async () => {
        try {
            const allUsers = await getUsers();
            if (allUsers) {
                setUsers(allUsers);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (newlyAddedUserId) {
            const timer = setTimeout(() => setNewlyAddedUserId(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [newlyAddedUserId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCancel = () => {
        setIsFormVisible(false);
        setEditingUser(null);
        setFormData({ username: '', password: '', role: 'Doctor' });
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '', // Always require re-entering password for security
            role: user.role,
        });
        setIsFormVisible(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (userId: number) => {
        if (users.length <= 1) {
            alert('لا يمكن حذف آخر مستخدم في النظام.');
            return;
        }

        const userToDelete = users.find(u => u.id === userId);
        if (!userToDelete) return;

        if (window.confirm(`هل أنت متأكد من حذف المستخدم "${userToDelete.username}"؟`)) {
            try {
                await deleteUser(userId);
                fetchUsers();
            } catch (error) {
                alert('فشل في حذف المستخدم');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.password) {
            alert('يرجى إدخال اسم المستخدم وكلمة المرور.');
            return;
        }

        try {
            if (editingUser) {
                await updateUser({
                    ...editingUser,
                    username: formData.username,
                    password: formData.password,
                    role: formData.role,
                 });
            } else {
                // Check if username already exists
                if (users.some(u => u.username === formData.username)) {
                    alert('اسم المستخدم موجود بالفعل.');
                    return;
                }
                const newUser = await addUser({ ...formData });
                setNewlyAddedUserId(newUser.id);
            }
            fetchUsers();
            handleCancel();
        } catch (error) {
            alert('فشل في حفظ بيانات المستخدم');
        }
    };

    return (
        <div className="card h-full flex-col">
            <div className="view-header">
                <h2 className="view-title">إدارة المستخدمين</h2>
                <button
                    onClick={() => isFormVisible ? handleCancel() : setIsFormVisible(true)}
                    className="btn btn-secondary"
                >
                    <span className="icon-wrapper icon-sm me-2">
                        <PlusIcon />
                    </span>
                    {isFormVisible ? 'إلغاء' : 'إضافة مستخدم جديد'}
                </button>
            </div>

            {isFormVisible && (
                <div className="form-container-alt animate-fade-in-down">
                    <h3 className="form-title">{editingUser ? `تعديل المستخدم: ${editingUser.username}` : 'إضافة مستخدم جديد'}</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" name="username" placeholder="اسم المستخدم" value={formData.username} onChange={handleInputChange} className="input" required />
                        <input type="password" name="password" placeholder="كلمة المرور" value={formData.password} onChange={handleInputChange} className="input" required />
                        <select name="role" value={formData.role} onChange={handleInputChange} className="input">
                            <option value="Doctor">طبيب</option>
                            <option value="Assistant">مساعد</option>
                            <option value="Display">شاشة عرض</option>
                        </select>
                        <div className="md:col-span-3 flex justify-end">
                            <button type="submit" className="btn btn-accent">
                                {editingUser ? 'تحديث المستخدم' : 'حفظ المستخدم'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-wrapper">
                <table className="table">
                    <thead className="table-header">
                        <tr>
                            <th className="table-cell">اسم المستخدم</th>
                            <th className="table-cell">الصلاحية</th>
                            <th className="table-cell">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="table-body">
                        {users.map(user => (
                            <tr 
                                key={user.id} 
                                className={`table-row ${user.id === newlyAddedUserId ? 'animate-new-item' : ''}`}
                            >
                                <td className="table-cell font-medium">{user.username}</td>
                                <td className="table-cell">
                                    <span className={`user-role-tag ${
                                        user.role === 'Doctor' ? 'is-doctor' : 
                                        user.role === 'Assistant' ? 'is-assistant' : 
                                        'is-display'
                                    }`}>
                                        {user.role === 'Doctor' ? 'طبيب' : 
                                         user.role === 'Assistant' ? 'مساعد' : 
                                         'شاشة عرض'}
                                    </span>
                                </td>
                                <td className="table-cell whitespace-nowrap">
                                    <button onClick={() => handleEdit(user)} className="btn-action btn-info">تعديل</button>
                                    <button onClick={() => handleDelete(user.id)} className="btn-action btn-danger">حذف</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AccountsView;