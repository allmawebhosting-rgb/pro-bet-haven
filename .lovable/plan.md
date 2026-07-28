## Fix profile provisioning

1. Move profile retrieval/self-healing into an authenticated server function so it runs with a verified user identity and handles missing rows consistently.
2. Fetch the current profile with `maybeSingle()`; if absent, create it from registration metadata with a random Channel A/B assignment and ensure the standard user role exists.
3. Update the dashboard query to use that function, show a retryable error state for genuine failures, and remove the indefinite “still being provisioned” dead end.
4. Preserve the existing signup trigger as the primary provisioning path and keep the server function as an idempotent repair path.
5. Verify the authenticated dashboard loads the existing profile and that the fallback works without exposing or switching channels.

**Current-state check:** the database currently has 1 auth user, 1 matching profile, and the signup trigger exists. This means the displayed message is caused by the client fetch/repair path returning no usable profile rather than an actually missing current database row.