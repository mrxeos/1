import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PatientsView from './components/PatientsView';
import MedicinesView from './components/MedicinesView';
import PrescriptionsView from './components/PrescriptionsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import LoginScreen from './components/LoginScreen';
import { View, User } from './types';
import StatisticsView from './components/StatisticsView';
import ExpensesView from './components/ExpensesView';
import AboutView from './components/AboutView';
import AccountsView from './components/AccountsView';
import { getRememberedUser, clearRememberedUser } from './services/settingsService';
import PrescriptionSettingsView from './components/PrescriptionSettingsView';
import WaitingListView from './components/WaitingListView';
import WaitingListDisplay from './components/WaitingListDisplay';


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>(View.Patients);
  const [isLoading, setIsLoading] = useState(true); // Prevent UI flicker
  const [triggerAddPatientModal, setTriggerAddPatientModal] = useState(false);

  useEffect(() => {
    const user = getRememberedUser();
    if (user) {
      setCurrentUser(user);
      if (user.role === 'Display') {
        setActiveView(View.WaitingList);
      }
    }
    setIsLoading(false);
  }, []);


  const renderView = () => {
    if (currentUser?.role === 'Display') {
      return <WaitingListDisplay />;
    }
    switch (activeView) {
      case View.Patients:
        return (
          <PatientsView 
            user={currentUser!} 
            triggerAddModal={triggerAddPatientModal}
            onAddModalTriggered={() => setTriggerAddPatientModal(false)}
          />
        );
      case View.WaitingList:
        return (
          <WaitingListView 
            user={currentUser!} 
            setActiveView={setActiveView}
            onTriggerAddPatient={() => setTriggerAddPatientModal(true)}
          />
        );
      case View.Medicines:
        return <MedicinesView />;
      case View.Prescriptions:
        return <PrescriptionsView />;
      case View.Statistics:
        return <StatisticsView />;
      case View.Expenses:
        return <ExpensesView />;
      case View.Reports:
        return <ReportsView />;
      case View.Accounts:
        return <AccountsView />;
      case View.About:
        return <AboutView />;
      case View.Settings:
        return <SettingsView user={currentUser!} />;
      case View.PrescriptionSettings:
        return <PrescriptionSettingsView user={currentUser!} />;
      default:
        return <PatientsView user={currentUser!} />;
    }
  };

  const handleLogout = () => {
    clearRememberedUser();
    setCurrentUser(null);
  };
  
  if (isLoading) {
    return null; // Render nothing during check to avoid flicker
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => {
      setCurrentUser(user);
      if (user.role === 'Display') {
        setActiveView(View.WaitingList);
      }
    }} />;
  }

  return (
    <div className={`app-container ${currentUser.role === 'Display' ? 'display-mode' : ''}`}>
      {currentUser.role !== 'Display' && (
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          onLogout={handleLogout}
          user={currentUser}
        />
      )}
      <main className={`main-content ${currentUser.role === 'Display' ? 'full-width' : ''}`}>
        {renderView()}
      </main>
      {currentUser.role === 'Display' && (
        <button 
          onClick={handleLogout} 
          className="display-logout-btn no-print"
          title="تسجيل الخروج"
        >
          <span className="me-2">تسجيل الخروج</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default App;