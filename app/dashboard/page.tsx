import ResponsiveDashboardContent from '@/components/ResponsiveDashboardContent';
import PerformanceStatsWidget from '@/components/PerformanceStatsWidget';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: '#FAFBFE' }}>
      {/* Scrollable Content Area */}
      <div className="flex flex-1 min-h-0 overflow-y-auto">
        {/* Main Content Area */}
        <main className="flex-1 min-w-0" style={{ maxWidth: '900px' }}>
          <ResponsiveDashboardContent />
        </main>

        {/* Right Sidebar — visible on lg+ screens */}
        <aside
          className="hidden lg:block flex-shrink-0"
          style={{
            width: 'clamp(320px,22vw,420px)',
            background: '#FAFBFE',
            borderLeft: '1px solid #E5E7EB',
            padding: 'clamp(1rem,1.25vw,1.5rem)',
            paddingRight: '0',
          }}
        >
          <PerformanceStatsWidget />
        </aside>
      </div>
    </div>
  );
}
