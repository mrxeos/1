import React from 'react';
import { View, User } from '../types';
import { PatientIcon, MedicineIcon, PrescriptionIcon, ReportIcon, LogoutIcon, SettingsIcon, StatisticsIcon, ExpensesIcon, DeveloperIcon, AccountsIcon, PrescriptionSettingsIcon, WaitingListIcon } from './icons';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  onLogout: () => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onLogout, user }) => {
  const navItems = [
    { view: View.Patients, icon: PatientIcon, label: 'المرضى', roles: ['Doctor', 'Assistant'] },
    { view: View.WaitingList, icon: WaitingListIcon, label: 'قائمة الانتظار', roles: ['Doctor', 'Assistant'] },
    { view: View.Medicines, icon: MedicineIcon, label: 'الأدوية', roles: ['Doctor'] },
    { view: View.Prescriptions, icon: PrescriptionIcon, label: 'الوصفات', roles: ['Doctor'] },
    { view: View.Statistics, icon: StatisticsIcon, label: 'الإحصاء', roles: ['Doctor'] },
    { view: View.Expenses, icon: ExpensesIcon, label: 'المصروفات', roles: ['Doctor'] },
    { view: View.Reports, icon: ReportIcon, label: 'التقارير', roles: ['Doctor'] },
    { view: View.Accounts, icon: AccountsIcon, label: 'المستخدمين', roles: ['Doctor'] },
    { view: View.About, icon: DeveloperIcon, label: 'عن المطور', roles: ['Doctor', 'Assistant'] },
    { view: View.PrescriptionSettings, icon: PrescriptionSettingsIcon, label: 'ضبط الروشتة', roles: ['Doctor'] },
    { view: View.Settings, icon: SettingsIcon, label: 'الإعدادات', roles: ['Doctor'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="sidebar no-print">
      <div className="sidebar-header">
        <h1 className="sidebar-title">عيادتي</h1>
        <div className="user-info-badge">
            <span className="user-role-tag">{user.role === 'Doctor' ? 'طبيب' : 'مساعد'}</span>
            <span className="user-name-tag">{user.username}</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {filteredNavItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setActiveView(item.view)}
            className={`sidebar-btn ${activeView === item.view ? 'active' : ''}`}
          >
            <span className="icon-wrapper icon-md me-3">
              <item.icon />
            </span>
            <span className="sidebar-btn-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
            onClick={onLogout}
            className="sidebar-btn logout"
        >
            <span className="icon-wrapper icon-md me-3">
              <LogoutIcon />
            </span>
            <span className="sidebar-btn-label">تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;