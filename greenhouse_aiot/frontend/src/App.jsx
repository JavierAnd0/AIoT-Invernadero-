import { useState } from 'react';
import { useAuth }    from './hooks/useAuth';
import { usePolling } from './hooks/useApi';
import { getOpenAlerts } from './api';
import { Shell } from './layout';

import LoginScreen       from './screens/LoginScreen';
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

export default function App() {
  const { isAuthenticated, role, doLogout } = useAuth();
  const [screen, setScreen] = useState('dashboard');
  const [zone,   setZone]   = useState('za');

  const { data: openAlertsArr } = usePolling(getOpenAlerts, 30000);
  const openAlerts = Array.isArray(openAlertsArr) ? openAlertsArr.length : 0;

  function handleLogin(r) {
    setScreen(r === 'admin' ? 'devices' : 'dashboard');
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  function renderScreen() {
    switch (screen) {
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
      case 'simulator':   return <SimulatorScreen />;
      default:            return <DashboardScreen zone={zone} />;
    }
  }

  return (
    <Shell
      screen={screen} setScreen={setScreen}
      zone={zone}     setZone={setZone}
      role={role}     openAlerts={openAlerts}
      onLogout={doLogout}
    >
      {renderScreen()}
    </Shell>
  );
}
