// Server-only Strava feature flag.
// Strava sync is DISABLED by default. Set env STRAVA_SYNC_ENABLED=true to enable.
// Do NOT import this file from client code.

export function isStravaSyncEnabled(): boolean {
  return (process.env.STRAVA_SYNC_ENABLED ?? "false").toLowerCase() === "true";
}

export class StravaDisabledError extends Error {
  constructor() {
    super("Strava sync is disabled");
    this.name = "StravaDisabledError";
  }
}

/** Throw if Strava sync is disabled. Use to gate server fns + webhook handlers. */
export function assertStravaEnabled(): void {
  if (!isStravaSyncEnabled()) throw new StravaDisabledError();
}
