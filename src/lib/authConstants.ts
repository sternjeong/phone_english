/**
 * This app has exactly one user (passcode login, see src/lib/auth.ts) — the
 * fixed id every DB row is scoped by. Kept as a named constant in its own
 * module (rather than a literal inside auth.ts) so if a second user/passcode
 * is ever added, this is the one place that assumption lives.
 */
export const OWNER_USER_ID = "owner";
