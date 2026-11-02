/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KuaProvider, useKua } from './context/KuaContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { NikahView } from './components/NikahView';
import { SuratView } from './components/SuratView';
import { ArsipView } from './components/ArsipView';
import { LaporanView } from './components/LaporanView';
import { StaffAuditView } from './components/StaffAuditView';
import { MasterDataView } from './components/MasterDataView';
import { JadwalNikahCalendarView } from './components/JadwalNikahCalendarView';
import { KuaSettingsModal } from './components/KuaSettingsModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { LoginScreen } from './components/LoginScreen';

function MainApp() {
  const { currentUser } = useKua();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isNewNikahModalOpen, setIsNewNikahModalOpen] = useState(false);
  const [isNewSuratModalOpen, setIsNewSuratModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // If user is not logged in, display the dedicated institutional LoginScreen
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans antialiased">
      {/* Permanent Institutional Sidebar (No duplicate user card at bottom) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopHeader
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenNewNikah={() => {
            setCurrentTab('nikah');
            setIsNewNikahModalOpen(true);
          }}
          onOpenNewSurat={() => {
            setCurrentTab('surat');
            setIsNewSuratModalOpen(true);
          }}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
        />

        {/* Content Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onOpenNewNikah={() => {
                setCurrentTab('nikah');
                setIsNewNikahModalOpen(true);
              }}
            />
          )}

          {(currentTab === 'nikah' || currentTab === 'kalender') && (
            <NikahView
              isAddModalOpen={isNewNikahModalOpen}
              setIsAddModalOpen={setIsNewNikahModalOpen}
              onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
            />
          )}

          {currentTab === 'surat' && (
            <SuratView
              isAddModalOpen={isNewSuratModalOpen}
              setIsAddModalOpen={setIsNewSuratModalOpen}
              onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
            />
          )}

          {currentTab === 'arsip' && <ArsipView />}

          {currentTab === 'laporan' && <LaporanView />}

          {currentTab === 'audit' && <StaffAuditView />}

          {currentTab === 'master' && (
            <MasterDataView onOpenGoogleSheets={() => setIsSheetsModalOpen(true)} />
          )}
        </main>
      </div>

      {/* Settings Modal */}
      <KuaSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Google Sheets Synchronization Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <KuaProvider>
      <MainApp />
    </KuaProvider>
  );
}
