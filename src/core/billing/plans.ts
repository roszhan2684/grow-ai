/** Plan state. Stripe test-mode checkout is not wired in this build; plan changes are local and audited. */
export const PLANS = {
  starter: { name: "Starter", seats: 3, priceLabel: "$0 (demo)", features: ["1 workspace", "3 seats", "CSV + 2 connectors"] },
  growth: { name: "Growth", seats: 10, priceLabel: "test mode", features: ["10 seats", "All connectors", "Agent approvals"] },
  scale: { name: "Scale", seats: 25, priceLabel: "test mode", features: ["25 seats", "SSO (planned)", "Priority replay"] },
} as const;
export type PlanId = keyof typeof PLANS;
