export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 font-mono text-xl font-bold text-zinc-100">
        $ git remote -v
      </h1>
      <p className="mb-8 text-sm text-zinc-500">
        Wearable &amp; app integrations
      </p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-5 w-5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.15-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-sm font-semibold text-zinc-100">
                Apple Health
              </h2>
              <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                coming soon
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              HRV, resting heart rate, and sleep data from Apple Watch via
              Health Auto Export. Native HealthKit sync will be available when
              the iOS app ships.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 font-mono text-xs text-zinc-700">
        More integrations (Oura, Strava, Garmin) are on the roadmap.
      </p>
    </div>
  );
}
