/** Plans and seat allowances. Billing is handled by sales; plan changes are audited. */
export const PLANS = {
  starter: { name: "Starter", seats: 3, priceLabel: "Contact sales", features: ["1 workspace", "3 seats", "CSV + 2 connectors"] },
  growth: { name: "Growth", seats: 10, priceLabel: "Contact sales", features: ["10 seats", "All connectors", "Agent approvals"] },
  scale: { name: "Scale", seats: 25, priceLabel: "Contact sales", features: ["25 seats", "SSO (planned)", "Priority replay"] },
} as const;
export type PlanId = keyof typeof PLANS;
