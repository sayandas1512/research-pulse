export interface DomainConfig {
  id: string;
  name: string;
  description: string;
  arxivCategories: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  significanceNote: string;
  weightOverrides?: Partial<SignalWeights>;
  active: boolean;
  sortOrder: number;
}

export interface Paper {
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  categories: string[];
  primaryCategory: string;
  comment: string | null;
  publishedAt: string;
  updatedAt: string;
  absUrl: string;
  pdfUrl: string;
  codeUrl: string | null;
}

export interface SignalWeights {
  keywordFit: number;
  hfUpvotes: number;
  venueHint: number;
  codeLink: number;
  repoStars: number;
  authorSignal: number;
  crossDomainHits: number;
}

export interface RawSignals {
  keywordFit: number;
  hfUpvotes: number | null;
  venueHint: boolean;
  codeLink: boolean;
  repoStars: number | null;
  authorSignal: number | null;
  crossDomainHits: number;
  /**
   * Context-only, not a ranking weight: only populated for the already-shortlisted top-12
   * (checking all fetched papers against OpenReview would be hundreds of lookups per domain).
   * Fed to the Judge as extra context; never part of the deterministic score.
   */
  openReviewVenue?: string | null;
}

export interface Candidate {
  paper: Paper;
  signals: RawSignals;
  rankScore: number;
  rank: number;
}

export type PaperType =
  | "new_benchmark"
  | "surprising_result"
  | "new_method"
  | "system_or_framework"
  | "survey"
  | "negative_result"
  | "theory"
  | "incremental"
  | "other";

export type EvidenceStrength = "strong" | "moderate" | "weak" | "unclear";

export type Action = "read" | "skim" | "flag_for_client" | "skip";

export interface JudgeVerdict {
  arxivId: string;
  significance: number;
  paperType: PaperType;
  evidenceStrength: EvidenceStrength;
  soWhat: string;
  caveat: string;
  action: Action;
}

export interface JudgedCandidate extends Candidate {
  verdict: JudgeVerdict | null;
}

export interface DomainFunnel {
  fetched: number;
  afterExcludes: number;
  shortlisted: number;
  picked: number;
}

export interface SelectedPick extends JudgedCandidate {
  verdict: JudgeVerdict;
  alsoInDomains: string[];
}

export interface DomainResult {
  domain: DomainConfig;
  funnel: DomainFunnel;
  allFetchedPapers: Paper[];
  candidates: Candidate[];
  judged: JudgedCandidate[];
  picks: SelectedPick[];
  closestMiss: JudgedCandidate | null;
  aiAvailable: boolean;
  error?: string;
}
