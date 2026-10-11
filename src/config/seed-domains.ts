import type { DomainConfig } from "../lib/types";

export const SEED_DOMAINS: Omit<DomainConfig, "id">[] = [
  {
    name: "AI agents",
    description: "Agentic systems, tool use, multi-agent, computer-use agents.",
    arxivCategories: ["cs.AI", "cs.CL", "cs.MA", "cs.LG"],
    includeKeywords: ["agent", "agentic", "tool use", "multi-agent", "computer use", "web agent"],
    excludeKeywords: [],
    significanceNote:
      "New agent benchmarks, honest reliability evaluations, evidence on what works in production. Discount toy-environment demos.",
    active: true,
    sortOrder: 0,
  },
  {
    name: "Retrieval-augmented generation",
    description: "RAG, dense retrieval, reranking, grounded generation.",
    arxivCategories: ["cs.IR", "cs.CL", "cs.AI"],
    includeKeywords: ["retrieval-augmented", "RAG", "dense retrieval", "reranking", "grounded generation"],
    excludeKeywords: [],
    significanceNote:
      "Realistic corpora, failure analysis, cost and latency trade-offs. Discount chunking tricks without strong baselines.",
    active: true,
    sortOrder: 1,
  },
  {
    name: "LLMs for code",
    description: "Code generation, program repair, repository-level coding models.",
    arxivCategories: ["cs.SE", "cs.CL", "cs.AI", "cs.LG"],
    includeKeywords: ["code generation", "code LLM", "SWE-bench", "program repair", "repository-level"],
    excludeKeywords: [],
    significanceNote:
      "Real-repository evaluations, contamination awareness, productivity evidence.",
    active: true,
    sortOrder: 2,
  },
  {
    name: "Computer vision for industrial applications",
    description: "Defect detection, visual inspection, manufacturing CV.",
    arxivCategories: ["cs.CV", "eess.IV"],
    includeKeywords: ["industrial", "defect detection", "anomaly detection", "visual inspection", "manufacturing"],
    excludeKeywords: [],
    significanceNote:
      "Real production-line deployment, small-data regimes, real-defect datasets. Discount marginal gains on saturated benchmarks.",
    active: true,
    sortOrder: 3,
  },
  {
    name: "LLM evaluation and benchmarks",
    description: "New benchmarks, contamination, LLM-as-a-judge.",
    arxivCategories: ["cs.CL", "cs.AI", "cs.LG"],
    includeKeywords: ["benchmark", "evaluation", "contamination", "LLM-as-a-judge"],
    excludeKeywords: [],
    significanceNote:
      "New benchmarks with validation, evidence that popular metrics mislead.",
    active: true,
    sortOrder: 4,
  },
  {
    name: "Multimodal and vision-language models",
    description: "VLMs, multimodal LLMs.",
    arxivCategories: ["cs.CV", "cs.CL"],
    includeKeywords: ["vision-language", "multimodal LLM", "VLM"],
    excludeKeywords: [],
    significanceNote: "Capability gaps, evaluation rigor, cost-to-serve.",
    active: true,
    sortOrder: 5,
  },
  {
    name: "Efficient inference and small models",
    description: "Quantization, distillation, speculative decoding, small LMs.",
    arxivCategories: ["cs.LG", "cs.CL"],
    includeKeywords: ["quantization", "distillation", "speculative decoding", "small language model"],
    excludeKeywords: [],
    significanceNote: "Measured speed/cost/quality trade-offs on realistic workloads.",
    active: true,
    sortOrder: 6,
  },
  {
    name: "AI safety, security and governance",
    description: "Prompt injection, jailbreaks, red teaming, safety evaluation.",
    arxivCategories: ["cs.CR", "cs.CL", "cs.CY", "cs.AI"],
    includeKeywords: ["prompt injection", "jailbreak", "red teaming", "safety evaluation"],
    excludeKeywords: [],
    significanceNote: "Reproducible attacks and defenses relevant to enterprise deployment.",
    active: true,
    sortOrder: 7,
  },
];
