import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Header - matches NotificationsHeader */}
      <div className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/50 z-50 px-4 lg:px-6">
        <div className="py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left side - back button, title, badge */}
            <div className="flex items-center gap-4">
              {/* Back button */}
              <Skeleton className="h-6 w-6 rounded" />
              <div className="flex items-center gap-3">
                {/* Title "Notifications" */}
                <Skeleton className="h-8 w-[140px]" />
                {/* Unread badge */}
                <Skeleton className="h-6 w-[80px] rounded-full" />
              </div>
            </div>
            {/* Right side - action buttons */}
            <div className="flex items-center gap-2">
              {/* Sound toggle */}
              <Skeleton className="h-10 w-10 rounded-md" />
              {/* Settings button */}
              <Skeleton className="h-10 w-10 rounded-md" />
              {/* Theme toggle - hidden on mobile */}
              <Skeleton className="h-10 w-10 rounded-full hidden md:block" />
              {/* Profile avatar */}
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full flex">
          {/* Left Sidebar - Desktop only, matches NotificationsFilters */}
          <aside className="hidden lg:flex lg:flex-col w-72 xl:w-80 shrink-0 overflow-y-auto border-r border-border/50 bg-background/50">
            <div className="p-4 lg:p-6 space-y-4">
              {/* Filter Header with expand/settings buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-[50px]" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>

              {/* Search Input */}
              <Skeleton className="h-10 w-full rounded-md" />

              {/* Filter Items - 5 categories */}
              <div className="space-y-2">
                {[
                  { width: "w-[90px]" },
                  { width: "w-[75px]" },
                  { width: "w-[50px]" },
                  { width: "w-[40px]" },
                  { width: "w-[60px]" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-3 rounded-lg border p-3"
                  >
                    {/* Checkbox */}
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Icon circle */}
                        <Skeleton className="h-8 w-8 rounded-full" />
                        {/* Label */}
                        <Skeleton className={`h-4 ${item.width}`} />
                      </div>
                      {/* Count badge */}
                      <Skeleton className="h-5 w-6 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Tabs Container */}
            <div className="shrink-0 z-40">
              <div className="bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 lg:px-6 py-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Mobile Filter Button */}
                  <Skeleton className="lg:hidden shrink-0 h-10 w-10 rounded-xl" />

                  {/* Tabs - All, Unread, Read */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50">
                    {[
                      { label: "w-[32px]", count: "w-5" },
                      { label: "w-[52px] hidden sm:block", mobileLabel: "w-[32px] sm:hidden", count: "w-5" },
                      { label: "w-[40px]", count: "w-5" },
                    ].map((tab, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${i === 0 ? "bg-background shadow-sm border border-border/50" : ""}`}
                      >
                        {tab.mobileLabel ? (
                          <>
                            <Skeleton className={`h-4 ${tab.label}`} />
                            <Skeleton className={`h-4 ${tab.mobileLabel}`} />
                          </>
                        ) : (
                          <Skeleton className={`h-4 ${tab.label}`} />
                        )}
                        <Skeleton className={`h-5 ${tab.count} rounded-full`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Notifications Content */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-6">
              {/* Fade effect placeholder */}
              <div className="h-4" />

              <div className="py-4 space-y-6">
                {/* Time Group 1 - "This Week" */}
                <div className="space-y-3">
                  {/* Sticky Group Header */}
                  <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg sm:rounded-xl shadow-md">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-4 w-[70px]" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>

                  {/* Notification Item */}
                  <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-4">
                      {/* Icon */}
                      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg sm:rounded-xl" />
                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Badge and time row */}
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-[60px] rounded-full" />
                          <Skeleton className="h-3 w-[50px]" />
                        </div>
                        {/* Title */}
                        <Skeleton className="h-5 w-full max-w-[280px]" />
                        {/* Message preview */}
                        <Skeleton className="h-4 w-full max-w-[400px]" />
                      </div>
                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-md" />
                      </div>
                      {/* Unread indicator */}
                      <Skeleton className="absolute right-3 top-3 h-2 w-2 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Time Group 2 - "This Month" */}
                <div className="space-y-3">
                  {/* Sticky Group Header */}
                  <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg sm:rounded-xl shadow-md">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-4 w-[85px]" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>

                  {/* Notification Items */}
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="rounded-xl border bg-card p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-4">
                          {/* Icon */}
                          <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg sm:rounded-xl" />
                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Badge and time row */}
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-5 w-[60px] rounded-full" />
                              <Skeleton className="h-3 w-[50px]" />
                            </div>
                            {/* Title */}
                            <Skeleton className="h-5 w-full max-w-[280px]" />
                            {/* Message preview */}
                            <Skeleton className="h-4 w-full max-w-[400px]" />
                          </div>
                          {/* Actions */}
                          <div className="flex shrink-0 items-center gap-1">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-md" />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Time Group 3 - "Earlier" */}
                <div className="space-y-3">
                  {/* Sticky Group Header */}
                  <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg sm:rounded-xl shadow-md">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-4 w-[50px]" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>

                  {/* Notification Item */}
                  <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-4">
                      {/* Icon */}
                      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg sm:rounded-xl" />
                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Badge and time row */}
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-[60px] rounded-full" />
                          <Skeleton className="h-3 w-[70px]" />
                        </div>
                        {/* Title */}
                        <Skeleton className="h-5 w-full max-w-[250px]" />
                        {/* Message preview */}
                        <Skeleton className="h-4 w-full max-w-[350px]" />
                      </div>
                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
