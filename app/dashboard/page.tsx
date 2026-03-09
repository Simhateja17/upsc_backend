import ResponsiveDashboardContent from '@/components/ResponsiveDashboardContent';
import PerformanceStatsWidget from '@/components/PerformanceStatsWidget';

export default function DashboardPage() {
  return (
    <div className="flex overflow-hidden" style={{ background: '#FAFBFE', height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>
      {/* Scrollable Content Area */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Main Content Area */}
        <main className="flex-1">
          <ResponsiveDashboardContent />
        </main>

        {/* Right Sidebar */}
        <aside
          className="hidden xl:block"
          style={{
            width: 'clamp(320px,18.6vw,358px)',
            minWidth: '320px',
            maxWidth: '358px',
            background: '#FAFBFE',
          }}
        >
          <div className="p-[clamp(1rem,1.25vw,1.5rem)]">
            <PerformanceStatsWidget />
          </div>
        </aside>
      </div>
    </div>
  );
}
