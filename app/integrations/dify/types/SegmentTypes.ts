export interface IPreProcessingRule {
    id: 'remove_extra_spaces' | 'remove_urls_emails' | string;
    enabled: boolean;
  }
  
  export interface ISegmentation {
    separator?: string;   // デフォルト "\n"
    max_tokens?: number;  // デフォルト 1000
    chunk_overlap?: number; // デフォルト 0
  }
  
  export interface IRules {
    pre_processing_rules?: IPreProcessingRule[];
    segmentation?: ISegmentation;
    parent_mode?: 'full-doc' | 'paragraph';
    subchunk_segmentation?: ISegmentation;
  }
  
  export interface IProcessRule {
    mode: 'automatic' | 'custom' | 'hierarchical';
    rules?: IRules;
  }
  
  
  /**
   * DocumentのSegment(Chunk)関連
   */
  export interface ISegment {
    id: string;
    position: number;
    document_id: string;
    content: string;
    answer?: string;
    word_count?: number;
    tokens?: number;
    keywords?: string[];
    index_node_id?: string;
    index_node_hash?: string;
    hit_count?: number;
    enabled: boolean;
    disabled_at?: number | null;
    disabled_by?: string | null;
    status?: string;
    created_by?: string;
    created_at?: number;
    indexing_at?: number;
    completed_at?: number;
    error?: string | null;
    stopped_at?: number | null;
    document?: {
      id: string;
      data_source_type: string;
      name: string;
      doc_type?: string | null;
    };
  }
  
  export interface IAddSegmentsRequest {
    segments: Array<{
      content: string;
      answer?: string;
      keywords?: string[];
    }>;
  }
  
  export interface IAddSegmentsResponse {
    data: ISegment[];
    doc_form: string;
  }
  
  export interface IGetSegmentsResponse {
    data: ISegment[];
    doc_form: string;
  }
  

  export interface IDeleteSegmentResponse {
    data: ISegment;
  }
  
  export interface IUpdateSegmentRequest {
    segment: {
      content: string;
      answer: string;
      keywords: string[];
      enabled: boolean;
    };
  }
  
  export interface IUpdateSegmentResponse {
    data: ISegment[];
    doc_form: string;
  }