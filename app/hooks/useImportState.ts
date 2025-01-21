// app/hooks/useImportStates.ts
import { useState } from "react";
import { KNOWLEDGE_TYPE_TO_STATE_KEY } from "../integrations/dify/types";
import { KnowledgeType } from "../integrations/dify/types";

interface ImportState {
  isLoading: boolean;
  progress: number;
  status: "idle" | "processing" | "completed" | "error";
  errorMessage?: string; // ← 追加
}

type UseImportStatesReturn = {
  importStates: Record<keyof typeof KNOWLEDGE_TYPE_TO_STATE_KEY, ImportState>;
  setProcessing: (type: KnowledgeType) => void;
  setCompleted: (type: KnowledgeType) => void;
  // ↓ エラーメッセージも渡せるよう変更
  setError: (type: KnowledgeType, errorMessage?: string) => void;
};

export function useImportStates(): UseImportStatesReturn {
  const [importStates, setImportStates] = useState<
    Record<keyof typeof KNOWLEDGE_TYPE_TO_STATE_KEY, ImportState>
  >({
    products:            { isLoading: false, progress: 0, status: "idle" },
    orders:              { isLoading: false, progress: 0, status: "idle" },
    policy:              { isLoading: false, progress: 0, status: "idle" },
    faq:                 { isLoading: false, progress: 0, status: "idle" },
    product_meta_fields: { isLoading: false, progress: 0, status: "idle" },
    system_prompt:       { isLoading: false, progress: 0, status: "idle" },
    task_sync:           { isLoading: false, progress: 0, status: "idle" },
  });

  function setProcessing(type: KnowledgeType) {
    const key = KNOWLEDGE_TYPE_TO_STATE_KEY[type];
    setImportStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: true,
        status: "processing",
        progress: 50,
        errorMessage: undefined, // エラーはクリア
      },
    }));
  }
  
  function setCompleted(type: KnowledgeType) {
    const key = KNOWLEDGE_TYPE_TO_STATE_KEY[type];
    setImportStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        status: "completed",
        progress: 100,
        errorMessage: undefined, // エラーはクリア
      },
    }));
  }
  
  // ↓ errorMessageを受け取るように
  function setError(type: KnowledgeType, errorMessage?: string) {
    const key = KNOWLEDGE_TYPE_TO_STATE_KEY[type];
    setImportStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        status: "error",
        progress: 0,
        errorMessage: errorMessage ?? "不明なエラーが発生しました",
      },
    }));
  }

  return {
    importStates,
    setProcessing,
    setCompleted,
    setError,
  };
}