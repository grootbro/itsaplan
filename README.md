# Registration error review fixtures

Actual AuthRegisterForm with its real providers, CSS and fonts. Before: upstream 88e0c059ad60f904d6fbc44acea75f016c5411e7. After: fix 4b0c81e45c62fc044c39862216f334ca9de9ad6c.

An isolated browser intercepts the actual OIDC client POST to /api/auth/sign-in/social and returns a synthetic HTTP 429. Each fresh context makes exactly one provider request, reenables the provider button and has no page errors. No real identity provider or user data is used.

These are component fixtures, not full Next/SSR or real SSO acceptance. The password-enabled before/after PNGs are byte-identical. Files are review assets only, outside the upstream source PR.
