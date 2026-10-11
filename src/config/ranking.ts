import type { SignalWeights } from "../lib/types";

export const DEFAULT_WEIGHTS: SignalWeights = {
  keywordFit: 25,
  hfUpvotes: 15,
  venueHint: 15,
  codeLink: 10,
  repoStars: 10,
  authorSignal: 15,
  crossDomainHits: 10,
};

export const SHORTLIST_SIZE = 12;

export const VENUE_PATTERN =
  /accepted (at|to|by)|to appear (in|at)|\b(NeurIPS|ICML|ICLR|CVPR|ICCV|ECCV|ACL|EMNLP|NAACL|AAAI|IJCAI|KDD|SIGIR|ICSE|FSE)\b/i;
