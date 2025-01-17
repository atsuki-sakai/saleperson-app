
/**
 * Dataset (ナレッジベース)関連の型
 */

export interface ICreateDatasetRequest {
    name: string;
    description?: string;
    indexing_technique?: 'high_quality' | 'economy';
    permission?: 'only_me' | 'all_team_members' | 'partial_members';
    provider?: 'vendor' | 'external';
    external_knowledge_api_id?: string;
    external_knowledge_id?: string;
  }
  
  export interface ICreateDatasetResponse {
    id: string;
    name: string;
    description: string | null;
    provider: string;
    permission: string;
    data_source_type: string | null;
    indexing_technique: string | null;
    app_count: number;
    document_count: number;
    word_count: number;
    created_by: string;
    created_at: number;
    updated_by: string | null;
    updated_at: number | null;
    embedding_model: string | null;
    embedding_model_provider: string | null;
    embedding_available: boolean | null;
  }
  
  export interface IDataset {
    id: string;
    name: string;
    description?: string | null;
    permission?: string;
    data_source_type?: string | null;
    indexing_technique?: string | null;
    app_count?: number;
    document_count?: number;
    word_count?: number;
    created_by?: string;
    created_at?: number;
    updated_by?: string | null;
    updated_at?: number | null;
  }
  
  export interface IGetDatasetsResponse {
    data: IDataset[];
    has_more: boolean;
    limit: number;
    total: number;
    page: number;
  }
  