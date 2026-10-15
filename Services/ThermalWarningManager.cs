using System;
using System.Media;
using Microsoft.Toolkit.Uwp.Notifications;

namespace CoreGuard.Services
{
    public class ThermalWarningManager
    {
        public float WarningThreshold { get; set; } = 80.0f;
        public float HarmThreshold { get; set; } = 90.0f;

        private DateTime _lastNotificationTime = DateTime.MinValue;
        private readonly TimeSpan _notificationCooldown = TimeSpan.FromSeconds(15);

        public event Action<string, float, bool>? OnHazardDetected;

        public void EvaluateTemperatures(System.Collections.Generic.List<CoreTemperatureInfo> cores)
        {
            float maxTemp = 0f;
            string hottestCore = string.Empty;

            foreach (var core in cores)
            {
                if (core.Current > maxTemp)
                {
                    maxTemp = core.Current;
                    hottestCore = core.Name;
                }
            }

            if (maxTemp >= HarmThreshold)
            {
                TriggerHarmAlert(hottestCore, maxTemp);
            }
            else if (maxTemp >= WarningThreshold)
            {
                TriggerWarningAlert(hottestCore, maxTemp);
            }
        }

        private void TriggerHarmAlert(string coreName, float temperature)
        {
            OnHazardDetected?.Invoke(coreName, temperature, true);

            if (DateTime.Now - _lastNotificationTime > _notificationCooldown)
            {
                _lastNotificationTime = DateTime.Now;

                // Play Windows system critical stop sound
                SystemSounds.Hand.Play();

                // Trigger Windows 10/11 Native Toast
                new ToastContentBuilder()
                    .AddText("⚠️ CRITICAL THERMAL HARM WARNING!")
                    .AddText($"CPU core [{coreName}] reached {temperature:F1}°C (Exceeds critical harm limit of {HarmThreshold:F0}°C).")
                    .AddText("Immediate action: Check laptop fan, elevate base, or reduce workload!")
                    .SetToastScenario(ToastScenario.Alarm)
                    .Show();
            }
        }

        private void TriggerWarningAlert(string coreName, float temperature)
        {
            OnHazardDetected?.Invoke(coreName, temperature, false);

            if (DateTime.Now - _lastNotificationTime > _notificationCooldown)
            {
                _lastNotificationTime = DateTime.Now;

                SystemSounds.Exclamation.Play();

                new ToastContentBuilder()
                    .AddText("⚠️ CPU Temperature Warning")
                    .AddText($"[{coreName}] is currently {temperature:F1}°C (Above warning limit {WarningThreshold:F0}°C).")
                    .Show();
            }
        }
    }
}
