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


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>(View.Patients);
  const [isLoading, setIsLoading] = useState(true); // Prevent UI flicker
  const [triggerAddPatientModal, setTriggerAddPatientModal] = useState(false);

  useEffect(() => {
    const user = getRememberedUser();
    if (user) {
      setCurrentUser(user);
    }
    setIsLoading(false);
  }, []);


  const renderView = () => {
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
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={handleLogout}
        user={currentUser}
      />
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
};

export default App;