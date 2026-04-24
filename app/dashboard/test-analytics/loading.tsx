const summaryCards = ['Overall Percentile', 'Tests Attempted', 'Questions Attempted', 'Overall Accuracy', 'Best Rank'];

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[12px] bg-[#EEF1F5] ${className}`} />;
}

export default function TestAnalyticsLoading() {
  return (
    <div
      className="flex overflow-hidden"
      style={{ background: '#FFFFFF', minHeight: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[1180px] mx-auto px-6 py-8">
          <div
            className="w-full rounded-[16px] px-10 pt-8 pb-6 mb-6"
            style={{ background: 'linear-gradient(135deg, #0F172B 0%, #1E2939 100%)' }}
          >
            <SkeletonBlock className="h-6 w-[220px] mb-5 bg-[#7DDDD2]" />
            <SkeletonBlock className="h-12 w-[360px] mb-4 bg-[#374151]" />
            <SkeletonBlock className="h-5 w-[620px] mb-8 bg-[#374151]" />
            <div className="grid grid-cols-5 overflow-hidden rounded-[14px] border border-[#364153]">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="px-6 py-5 border-r border-[#364153] last:border-r-0">
                  <SkeletonBlock className="h-8 w-14 mx-auto mb-2 bg-[#4B5563]" />
                  <SkeletonBlock className="h-3 w-20 mx-auto bg-[#4B5563]" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {summaryCards.map((title) => (
              <div
                key={title}
                className="rounded-[14px] bg-white px-5 pt-6 pb-5"
                style={{ boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)' }}
              >
                <SkeletonBlock className="h-8 w-16 mb-4" />
                <SkeletonBlock className="h-3 w-28 mb-2" />
                <SkeletonBlock className="h-3 w-32" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {['MCQ Performance Trend', 'Subject Accuracy'].map((title) => (
              <div
                key={title}
                className="rounded-[14px] bg-white px-8 pt-8 pb-6"
                style={{ boxShadow: '0px 1px 2px -1px rgba(0,0,0,0.1), 0px 1px 3px rgba(0,0,0,0.1)' }}
              >
                <SkeletonBlock className="h-5 w-52 mb-8" />
                <SkeletonBlock className="h-[180px] w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
