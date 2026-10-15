using System.Threading;
using System.Windows;

namespace CoreGuard
{
    public partial class App : Application
    {
        private static Mutex? _singleInstanceMutex;

        protected override void OnStartup(StartupEventArgs e)
        {
            const string mutexName = "CoreGuard_SingleInstance_Mutex";
            _singleInstanceMutex = new Mutex(true, mutexName, out bool createdNew);

            if (!createdNew)
            {
                MessageBox.Show("CoreGuard is already running in the background or system tray.", "Already Running");
                Shutdown();
                return;
            }

            base.OnStartup(e);
        }
    }
}
