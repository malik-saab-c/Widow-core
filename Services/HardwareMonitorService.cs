using System;
using System.Collections.Generic;
using System.Linq;
using LibreHardwareMonitor.Hardware;

namespace CoreGuard.Services
{
    public class CoreTemperatureInfo
    {
        public string Name { get; set; } = string.Empty;
        public float Current { get; set; }
        public float Min { get; set; }
        public float Max { get; set; }
    }

    public class HardwareMonitorService : IDisposable
    {
        private readonly Computer _computer;
        private IHardware? _cpuHardware;

        public string CpuName { get; private set; } = "Detecting CPU...";
        public bool IsInitialized { get; private set; }

        public HardwareMonitorService()
        {
            _computer = new Computer
            {
                IsCpuEnabled = true,
                IsMotherboardEnabled = true,
                IsControllerEnabled = false,
                IsGpuEnabled = false,
                IsMemoryEnabled = false,
                IsNetworkEnabled = false,
                IsStorageEnabled = false
            };
        }

        public void Initialize()
        {
            try
            {
                _computer.Open();
                _cpuHardware = _computer.Hardware.FirstOrDefault(h => h.HardwareType == HardwareType.Cpu);
                if (_cpuHardware != null)
                {
                    CpuName = _cpuHardware.Name;
                    IsInitialized = true;
                }
            }
            catch (Exception ex)
            {
                CpuName = $"Access Error (Run as Admin): {ex.Message}";
            }
        }

        public List<CoreTemperatureInfo> ReadTemperatures()
        {
            var results = new List<CoreTemperatureInfo>();

            if (_cpuHardware == null)
            {
                return results;
            }

            _cpuHardware.Update();

            foreach (var sensor in _cpuHardware.Sensors)
            {
                if (sensor.SensorType == SensorType.Temperature)
                {
                    // Focus on Core # and Package temperatures
                    if (sensor.Name.Contains("Core", StringComparison.OrdinalIgnoreCase) ||
                        sensor.Name.Contains("Package", StringComparison.OrdinalIgnoreCase))
                    {
                        results.Add(new CoreTemperatureInfo
                        {
                            Name = sensor.Name,
                            Current = sensor.Value ?? 0f,
                            Min = sensor.Min ?? sensor.Value ?? 0f,
                            Max = sensor.Max ?? sensor.Value ?? 0f
                        });
                    }
                }
            }

            return results;
        }

        public void Dispose()
        {
            _computer.Close();
        }
    }
}
