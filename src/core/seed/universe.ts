/**
 * The synthetic demo universe. Every company, person, post and dollar here is fictional.
 * Domains use the reserved `.example` TLD so nothing can be mistaken for a real organization.
 */
import type { PersonaRole, Seniority } from "../contracts";

export type SeedCompany = {
  key: string;
  name: string;
  domain: string;
  industry: string;
  sizeBand: string;
  isTarget: boolean;
  isHome?: boolean;
};

export type SeedPerson = {
  key: string;
  name: string;
  title: string;
  company: string;
  seniority: Seniority;
  personaRole?: PersonaRole;
  /** Optional override: some people share a display name on purpose (identity ambiguity fixture). */
  handle?: string;
};

export const HOME = "northstar";
export const ADVISOR_COMPANY = "fischer";

export const COMPANIES: SeedCompany[] = [
  { key: "northstar", name: "Northstar Cloud", domain: "northstar-cloud.example", industry: "Cloud infrastructure", sizeBand: "50-200", isTarget: false, isHome: true },
  { key: "fischer", name: "Fischer Advisory", domain: "fischer-advisory.example", industry: "Advisory", sizeBand: "1-10", isTarget: false },
  { key: "acme", name: "Acme Robotics", domain: "acme-robotics.example", industry: "Industrial robotics", sizeBand: "1k-5k", isTarget: true },
  { key: "helios", name: "Helios Freight", domain: "helios-freight.example", industry: "Logistics", sizeBand: "500-1k", isTarget: true },
  { key: "quillstone", name: "Quillstone Bank", domain: "quillstone-bank.example", industry: "Financial services", sizeBand: "5k+", isTarget: true },
  { key: "brightwater", name: "Brightwater Health", domain: "brightwater-health.example", industry: "Healthtech", sizeBand: "1k-5k", isTarget: true },
  { key: "corvid", name: "Corvid Security", domain: "corvid-security.example", industry: "Cybersecurity", sizeBand: "200-500", isTarget: true },
  { key: "tundra", name: "Tundra Analytics", domain: "tundra-analytics.example", industry: "Data platforms", sizeBand: "200-500", isTarget: true },
  { key: "marlowe", name: "Marlowe Retail", domain: "marlowe-retail.example", industry: "Retail", sizeBand: "5k+", isTarget: true },
  { key: "pinecrest", name: "Pinecrest Energy", domain: "pinecrest-energy.example", industry: "Energy", sizeBand: "1k-5k", isTarget: true },
  { key: "orbital", name: "Orbital Labs", domain: "orbital-labs.example", industry: "Aerospace", sizeBand: "200-500", isTarget: true },
  { key: "saffron", name: "Saffron Foods", domain: "saffron-foods.example", industry: "Food & beverage", sizeBand: "500-1k", isTarget: true },
  { key: "vantage", name: "Vantage Mobility", domain: "vantage-mobility.example", industry: "Mobility", sizeBand: "500-1k", isTarget: true },
  { key: "kestrel", name: "Kestrel Games", domain: "kestrel-games.example", industry: "Gaming", sizeBand: "200-500", isTarget: true },
];

export const TEAM: SeedPerson[] = [
  { key: "maya", name: "Maya Okafor", title: "CEO", company: HOME, seniority: "c_level", personaRole: "ceo" },
  { key: "daniel", name: "Daniel Reyes", title: "VP Sales", company: HOME, seniority: "vp", personaRole: "vp_sales" },
  { key: "priya", name: "Priya Shah", title: "Head of Marketing", company: HOME, seniority: "director", personaRole: "head_marketing" },
];

export const ADVISOR: SeedPerson = {
  key: "lena", name: "Lena Fischer", title: "Independent Advisor", company: ADVISOR_COMPANY, seniority: "c_level",
};

export const PROSPECTS: SeedPerson[] = [
  // Acme Robotics — the hero account
  { key: "grace", name: "Grace Wu", title: "CTO", company: "acme", seniority: "c_level" },
  { key: "tomas", name: "Tomas Lindqvist", title: "VP Engineering", company: "acme", seniority: "vp" },
  { key: "sam", name: "Sam Patel", title: "Director, Platform", company: "acme", seniority: "director" },
  { key: "noor", name: "Noor Haddad", title: "Staff Engineer", company: "acme", seniority: "ic" },
  { key: "ines", name: "Ines Moreau", title: "IT Procurement Manager", company: "acme", seniority: "manager" },
  // Helios Freight
  { key: "marcus", name: "Marcus Bell", title: "COO", company: "helios", seniority: "c_level" },
  { key: "ana", name: "Ana Ruiz", title: "VP Operations", company: "helios", seniority: "vp" },
  { key: "kofi", name: "Kofi Mensah", title: "Director, Infrastructure", company: "helios", seniority: "director" },
  { key: "lily", name: "Lily Chen", title: "SRE Manager", company: "helios", seniority: "manager" },
  // Quillstone Bank
  { key: "henrik", name: "Henrik Sorensen", title: "CIO", company: "quillstone", seniority: "c_level" },
  { key: "rachel", name: "Rachel Adeyemi", title: "VP Platform", company: "quillstone", seniority: "vp" },
  { key: "omar", name: "Omar Siddiqui", title: "Director, Cloud", company: "quillstone", seniority: "director" },
  { key: "beth", name: "Beth Novak", title: "Platform Engineer", company: "quillstone", seniority: "ic" },
  // Brightwater Health
  { key: "ellen", name: "Ellen Park", title: "CTO", company: "brightwater", seniority: "c_level" },
  { key: "jordan", name: "Jordan Blake", title: "VP Engineering", company: "brightwater", seniority: "vp" },
  { key: "mei", name: "Mei Tanaka", title: "Director, Data", company: "brightwater", seniority: "director" },
  // Corvid Security
  { key: "victor", name: "Victor Hale", title: "CEO", company: "corvid", seniority: "c_level" },
  { key: "zara", name: "Zara Qureshi", title: "VP Engineering", company: "corvid", seniority: "vp" },
  { key: "tom", name: "Tom Becker", title: "Director, SecOps", company: "corvid", seniority: "director" },
  // Tundra Analytics
  { key: "alexk_t", name: "Alex Kim", title: "Head of Data", company: "tundra", seniority: "director", handle: "alex-kim-data" },
  { key: "nina", name: "Nina Petrova", title: "CTO", company: "tundra", seniority: "c_level" },
  { key: "raj", name: "Raj Iyer", title: "VP Engineering", company: "tundra", seniority: "vp" },
  { key: "paula", name: "Paula Gomez", title: "Engineering Manager", company: "tundra", seniority: "manager" },
  // Marlowe Retail
  { key: "diane", name: "Diane Fox", title: "CIO", company: "marlowe", seniority: "c_level" },
  { key: "leo", name: "Leo Martins", title: "VP Digital", company: "marlowe", seniority: "vp" },
  { key: "ruth", name: "Ruth Akande", title: "Director, Engineering", company: "marlowe", seniority: "director" },
  // Pinecrest Energy
  { key: "sean", name: "Sean Doyle", title: "CTO", company: "pinecrest", seniority: "c_level" },
  { key: "fatima", name: "Fatima Noor", title: "VP Infrastructure", company: "pinecrest", seniority: "vp" },
  { key: "ivan", name: "Ivan Petrov", title: "Cloud Manager", company: "pinecrest", seniority: "manager" },
  // Orbital Labs
  { key: "alexk_o", name: "Alex Kim", title: "Platform Lead", company: "orbital", seniority: "manager", handle: "alexkim-orbital" },
  { key: "hana", name: "Hana Sato", title: "CEO", company: "orbital", seniority: "c_level" },
  { key: "ben", name: "Ben Carter", title: "VP Engineering", company: "orbital", seniority: "vp" },
  { key: "yusuf", name: "Yusuf Demir", title: "Software Engineer", company: "orbital", seniority: "ic" },
  // Saffron Foods
  { key: "clara", name: "Clara Jensen", title: "CIO", company: "saffron", seniority: "c_level" },
  { key: "mateo", name: "Mateo Rossi", title: "VP Technology", company: "saffron", seniority: "vp" },
  { key: "aisha", name: "Aisha Bello", title: "Director, IT", company: "saffron", seniority: "director" },
  // Vantage Mobility
  { key: "peter", name: "Peter Novak", title: "CTO", company: "vantage", seniority: "c_level" },
  { key: "sofia", name: "Sofia Lind", title: "VP Engineering", company: "vantage", seniority: "vp" },
  { key: "kenji", name: "Kenji Mori", title: "Director, Platform", company: "vantage", seniority: "director" },
  // Kestrel Games
  { key: "mila", name: "Mila Horvat", title: "CTO", company: "kestrel", seniority: "c_level" },
  { key: "dev", name: "Dev Raman", title: "VP Engineering", company: "kestrel", seniority: "vp" },
];

export const ALL_PEOPLE: SeedPerson[] = [...TEAM, ADVISOR, ...PROSPECTS];

export const TOPICS = [
  "Platform reliability",
  "Cloud cost control",
  "AI infrastructure",
  "Developer experience",
  "Security & compliance",
] as const;
export type Topic = (typeof TOPICS)[number];

export const POST_TITLES: Record<Topic, string[]> = {
  "Platform reliability": [
    "Reliability is a board-level metric now",
    "What 99.95% actually costs your team",
    "Incident reviews that change roadmaps",
    "The on-call tax nobody budgets for",
    "Error budgets as a sales conversation",
    "Why SLOs beat uptime dashboards",
  ],
  "Cloud cost control": [
    "Cost per request is the only cloud metric that matters",
    "FinOps without the spreadsheet theater",
    "Three bills we cut without touching latency",
    "Reserved capacity is a bet; price it like one",
    "When egress becomes your biggest vendor",
    "Unit economics for platform teams",
  ],
  "AI infrastructure": [
    "GPU scheduling is a reliability problem",
    "Inference costs are the new egress",
    "What we learned serving models at the edge",
    "Your eval pipeline is infrastructure",
    "The quiet migration to batch inference",
    "Capacity planning for agent workloads",
  ],
  "Developer experience": [
    "Golden paths beat golden handcuffs",
    "Preview environments changed our review culture",
    "The 15-minute onboarding benchmark",
    "Internal platforms need product managers",
    "Measuring toil without surveillance",
    "Deploy frequency is a lagging indicator",
  ],
  "Security & compliance": [
    "SOC 2 as a product feature",
    "Least privilege for machines, not just humans",
    "Audit logs your customers will actually read",
    "Secrets rotation without downtime",
    "Compliance automation that engineers tolerate",
    "Threat models for multi-tenant platforms",
  ],
};

export const handleFor = (p: SeedPerson) => p.handle ?? p.name.toLowerCase().replace(/[^a-z]+/g, "-");
export const emailFor = (p: SeedPerson) => {
  const domain = COMPANIES.find((c) => c.key === p.company)!.domain;
  const [first, ...rest] = p.name.toLowerCase().split(" ");
  return `${first}.${rest.join("")}@${domain}`;
};
export const companyByKey = (key: string) => COMPANIES.find((c) => c.key === key)!;
export const personByKey = (key: string) => ALL_PEOPLE.find((p) => p.key === key)!;
