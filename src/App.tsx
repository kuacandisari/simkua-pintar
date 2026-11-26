/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { KuaProvider, useKua } from './context/KuaContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { NikahView } from './components/NikahView';
import { SuratView } from './components/SuratView';
import { ArsipView } from './components/ArsipView';
import { LaporanView } from './components/LaporanView';
import { BukuNikahView } from './components/BukuNikahView';
import { WakafMuallafView } from './components/WakafMuallafView';
import { PengaturanView, PengaturanSection } from './components/PengaturanView';
import { KuaSettingsModal } from './components/KuaSettingsModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { LoginScreen } from './components/LoginScreen';
import { PublicJadwalNikahView } from './components/PublicJadwalNikahView';
import { isPublicScheduleRoute } from './lib/publicScheduleService';

function MainApp() {
  const { currentUser } = useKua();
  const [isPublicRoute, setIsPublicRoute] = useState<boolean>(() => isPublicScheduleRoute());
  const [isPublicPreview, setIsPublicPreview] = useState<boolean>(false);

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [pengaturanSection, setPengaturanSection] = useState<PengaturanSection>('master');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isNewNikahModalOpen, setIsNewNikahModalOpen] = useState(false);
  const [isNewSuratModalOpen, setIsNewSuratModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      setIsPublicRoute(isPublicScheduleRoute());
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const handleNavigateTab = (tab: string) => {
    if (tab === 'master') {
      setPengaturanSection('master');
      setCurrentTab('pengaturan');
    } else if (tab === 'audit') {
      setPengaturanSection('pejabat');
      setCurrentTab('pengaturan');
    } else if (tab === 'sheets') {
      setPengaturanSection('sheets');
      setCurrentTab('pengaturan');
    } else if (tab === 'drive') {
      setPengaturanSection('drive');
      setCurrentTab('pengaturan');
    } else if (tab === 'publik-jadwal') {
      setIsPublicPreview(true);
    } else {
      setCurrentTab(tab);
    }
    setIsMobileSidebarOpen(false);
  };

  // Standalone public wedding schedule route (/jadwal-nikah or ?mode=jadwal)
  // Accessible without login and hides all internal admin features
  if (isPublicRoute) {
    return <PublicJadwalNikahView />;
  }

  // In-app preview mode for admins / citizens from LoginScreen
  if (isPublicPreview) {
    return (
      <PublicJadwalNikahView
        onExitPreview={() => setIsPublicPreview(false)}
      />
    );
  }

  // If user is not logged in, display the dedicated institutional LoginScreen
  if (!currentUser) {
    return (
      <LoginScreen
        onOpenPublicJadwal={() => setIsPublicPreview(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans antialiased">
      {/* Permanent / Collapsible Institutional Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleNavigateTab}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopHeader
          currentTab={currentTab}
          setCurrentTab={handleNavigateTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => {
            if (window.innerWidth < 768) {
              setIsMobileSidebarOpen((prev) => !prev);
            } else {
              setIsSidebarCollapsed((prev) => !prev);
            }
          }}
          onOpenNewNikah={() => {
            setCurrentTab('nikah');
            setIsNewNikahModalOpen(true);
          }}
          onOpenNewSurat={() => {
            if (currentTab !== 'surat-keluar') {
              setCurrentTab('surat-masuk');
            }
            setIsNewSuratModalOpen(true);
          }}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-full w-full mx-auto overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={handleNavigateTab}
              onOpenNewNikah={() => {
                setCurrentTab('nikah');
                setIsNewNikahModalOpen(true);
              }}
              onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
            />
          )}

          {currentTab === 'nikah' && (
            <NikahView
              defaultViewMode="tabel"
              isAddModalOpen={isNewNikahModalOpen}
              setIsAddModalOpen={setIsNewNikahModalOpen}
              onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
            />
          )}

          {currentTab === 'kalender' && (
            <NikahView
              defaultViewMode="kalender"
              isAddModalOpen={isNewNikahModalOpen}
              setIsAddModalOpen={setIsNewNikahModalOpen}
              onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
            />
          )}

          {(currentTab === 'surat-masuk' || currentTab === 'surat') && (
            <SuratView
              forcedJenis="Surat Masuk"
              onSwitchJenis={(jenis) =>
                setCurrentTab(jenis === 'Surat Masuk' ? 'surat-masuk' : 'surat-keluar')
              }
              isAddModalOpen={isNewSuratModalOpen}
              setIsAddModalOpen={setIsNewSuratModalOpen}
              onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
            />
          )}

          {currentTab === 'surat-keluar' && (
            <SuratView
              forcedJenis="Surat Keluar"
              onSwitchJenis={(jenis) =>
                setCurrentTab(jenis === 'Surat Masuk' ? 'surat-masuk' : 'surat-keluar')
              }
              isAddModalOpen={isNewSuratModalOpen}
              setIsAddModalOpen={setIsNewSuratModalOpen}
              onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
            />
          )}

          {currentTab === 'buku-nikah' && <BukuNikahView />}

          {currentTab === 'wakaf-muallaf' && <WakafMuallafView />}

          {currentTab === 'arsip' && (
            <ArsipView
              onOpenDriveSettings={() => handleNavigateTab('drive')}
            />
          )}

          {currentTab === 'laporan' && <LaporanView />}

          {currentTab === 'pengaturan' && (
            <PengaturanView
              initialSection={pengaturanSection}
              onOpenGoogleSheets={() => setIsSheetsModalOpen(true)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onNavigateArsip={() => setCurrentTab('arsip')}
              onOpenPublicJadwal={() => setIsPublicPreview(true)}
            />
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
