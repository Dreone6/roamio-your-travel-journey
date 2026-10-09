# Architecture rules

- Keep SafePass and SOS out of application routes, navigation, and emergency simulations; those features have been retired.
- Never claim end-to-end, "military-grade", or zero-knowledge encryption in any UI copy or marketing screen; describe chats as "Private Chat" and state real protection ("encrypted in transit and at rest") instead.
- The pricing UI must never start a premium purchase. Premium tier CTAs stay disabled and labelled "Coming Soon" until store checkout and server-side receipt verification are live; keep the gate in `src/lib/billing/checkout.ts` and leave the free-tier CTA functional.
