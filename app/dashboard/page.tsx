import ResponsiveDashboardContent from '@/components/ResponsiveDashboardContent';
import PerformanceStatsWidget from '@/components/PerformanceStatsWidget';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: '#FAFBFE' }}>
      {/* Scrollable Content Area */}
      <div className="flex flex-1 min-h-0 overflow-y-auto">
        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <ResponsiveDashboardContent />
        </main>

        {/* Right Sidebar — visible on lg+ screens */}
        <aside
          className="hidden lg:block flex-shrink-0"
          style={{
            width: 'clamp(300px,18.6vw,358px)',
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
