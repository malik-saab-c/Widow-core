export interface CpuCoreData {
  id: number;
  name: string;
  type: 'P-Core' | 'E-Core' | 'Core';
  currentTemp: number;
  minTemp: number;
  maxTemp: number;
  loadPercent: number;
  status: 'nominal' | 'warning' | 'harm';
}

export interface ThermalSettings {
  warningThreshold: number; // e.g. 80 C
  harmThreshold: number; // e.g. 90 C
  pollingIntervalMs: number;
  soundAlarmEnabled: boolean;
  toastNotificationEnabled: boolean;
  autoThrottleWarning: boolean;
}

export interface ThermalIncident {
  id: string;
  timestamp: string;
  coreName: string;
  temperature: number;
  level: 'warning' | 'harm';
  message: string;
}

export interface ProjectSourceFile {
  path: string;
  filename: string;
  language: string;
  description: string;
  content: string;
}
