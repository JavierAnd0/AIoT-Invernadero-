import {
  LayoutDashboard,
  Droplets,
  Flower2,
  AlertTriangle,
  BrainCircuit,
  History,
  HardDrive,
  Layers,
  Users,
  Sprout,
  Play,
  Settings,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Check,
  X,
  Eye,
  EyeOff,
  Lock,
  Building2,
  Thermometer,
  Wind,
  CheckCircle,
  XCircle,
  AlertCircle,
  Leaf,
  Menu,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from 'lucide-react';

// eslint-disable-next-line react-refresh/only-export-components
export const ICONS = {
  dashboard: LayoutDashboard,
  sensors: Droplets,
  crops: Flower2,
  alerts: AlertTriangle,
  predict: BrainCircuit,
  predictions: History,
  devices: HardDrive,
  actuators: Cpu,
  zones: Layers,
  users: Users,
  croptypes: Sprout,
  simulator: Play,
  settings: Settings,
  logout: LogOut,

  sun: Sun,
  moon: Moon,
  system: Laptop,
  check: Check,
  x: X,
  eye: Eye,
  eyeOff: EyeOff,
  lock: Lock,
  building: Building2,
  temp: Thermometer,
  humidity: Droplets,
  light: Sun,
  co2: Wind,
  leaf: Leaf,

  checkCircle: CheckCircle,
  xCircle: XCircle,
  alertCircle: AlertCircle,
  menu: Menu,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
};

export function Icon({ name, size = 18, color, ...props }) {
  const Component = ICONS[name];
  if (!Component) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <Component size={size} color={color} {...props} />;
}