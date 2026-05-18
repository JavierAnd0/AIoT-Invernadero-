import { useState, useEffect } from 'react';
import { useAuth }    from './hooks/useAuth';
import { Shell } from './layout';
import { prefetchCommon } from './api';

import LoginScreen         from './screens/LoginScreen';
import AuthCallback        from './screens/AuthCallback';
import TenantSelectScreen  from './screens/TenantSelectScreen';
import DashboardScreen   from './screens/DashboardScreen';
import SensorsScreen     from './screens/SensorsScreen';
import AlertsScreen      from './screens/AlertsScreen';
import PredictScreen     from './screens/PredictScreen';
import CropsScreen       from './screens/CropsScreen';
import DeviceManagement  from './screens/DeviceManagement';
import ZoneManagement    from './screens/ZoneManagement';
import UserManagement    from './screens/UserManagement';
import CropTypeCatalog   from './screens/CropTypeCatalog';
import SimulatorScreen   from './screens/SimulatorScreen';
import PredictionHistory from './screens/PredictionHistory';
import SettingsScreen    from './screens/SettingsScreen';
import ActuatorsScreen   from './screens/ActuatorsScreen';

const SCREEN_ROLES = {
  dashboard:   ['admin', 'operator', 'viewer'],
  sensors:     ['admin', 'operator', 'viewer'],
  crops:       ['admin', 'operator', 'viewer'],
  alerts:      ['admin', 'operator', 'viewer'],
  predict:     ['admin', 'operator'],
  predictions: ['admin', 'operator'],
  devices:     ['admin', 'operator'],
  zones:       ['admin', 'operator'],
  users:       ['admin'],
  croptypes:   ['admin'],
  actuators:   ['admin', 'operator'],
  simulator:   ['admin'],
  settings:    ['admin', 'operator', 'viewer'],
};

const PATH_SCREENS = new Set(Object.keys(SCREEN_ROLES));

function screenFromPath() {
  const key = window.location.pathname.replace(/^\/+/, '').split('/')[0];
  return PATH_SCREENS.has(key) ? key : 'dashboard';
}

function updatePath(screen) {
  const path = screen === 'dashboard' ? '/dashboard' : `/${screen}`;
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
}

export default function App() {
  const { isAuthenticated, requiresTenantSelection, currentRole, doLogout } = useAuth();
  const [screen, setScreen] = useState(screenFromPath);
  const [zone,   setZone]   = useState(null);

  // Warm the cache as soon as the user is authenticated so that
  // the first screen (Dashboard) renders with data already in-flight or cached.
  useEffect(() => {
    if (isAuthenticated) prefetchCommon();
  }, [isAuthenticated]);

  function handleLogin() {
    setScreen('dashboard');
    updatePath('dashboard');
  }

  function handleScreenChange(nextScreen) {
    setScreen(nextScreen);
    updatePath(nextScreen);
  }

  // OAuth2 callback — Google redirects here with ?token=
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback onLogin={() => {
      window.history.replaceState({}, '', '/');
      setScreen('dashboard');
    }} />;
  }

  // User authenticated but hasn't selected a tenant yet (multi-tenant case)
  if (requiresTenantSelection && !isAuthenticated) {
    return <TenantSelectScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  function renderScreen() {
    const active = SCREEN_ROLES[screen]?.includes(currentRole) ? screen : 'dashboard';
    switch (active) {
      case 'dashboard':   return <DashboardScreen zone={zone} />;
      case 'sensors':     return <SensorsScreen zone={zone} />;
      case 'crops':       return <CropsScreen zone={zone} />;
      case 'alerts':      return <AlertsScreen />;
      case 'predict':     return <PredictScreen />;
      case 'predictions': return <PredictionHistory />;
      case 'devices':     return <DeviceManagement />;
      case 'zones':       return <ZoneManagement />;
      case 'users':       return <UserManagement />;
      case 'croptypes':   return <CropTypeCatalog />;
      case 'actuators':   return <ActuatorsScreen />;
      case 'simulator':   return <SimulatorScreen />;
      case 'settings':    return <SettingsScreen />;
      default:            return <DashboardScreen zone={zone} />;
    }
  }

  return (
    <Shell
      screen={screen} setScreen={handleScreenChange}
      zone={zone}     setZone={setZone}
      role={currentRole}
      onLogout={doLogout}
    >
      {renderScreen()}
    </Shell>
  );
}
