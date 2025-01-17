
import { ISegment } from './SegmentTypes';

export type SearchMethod =
  | 'keyword_search'
  | 'semantic_search'
  | 'full_text_search'
  | 'hybrid_search';

export interface IRerankingMode {
  reranking_provider_name: string;
  reranking_model_name: string;
}

export interface IRetrievalModel {
  search_method: SearchMethod;
  reranking_enable?: boolean;
  reranking_mode?: IRerankingMode | null;
  weights?: number | null;
  top_k?: number;
  score_threshold_enabled?: boolean;
  score_threshold?: number | null;
}

export interface IRetrieveRequest {
  query: string;
  retrieval_model?: IRetrievalModel;
  external_retrieval_model?: any;
}

export interface IRetrieveResponse {
  query: { content: string };
  records: Array<{
    segment: ISegment;
    score: number;
    tsne_position?: any;
  }>;
}