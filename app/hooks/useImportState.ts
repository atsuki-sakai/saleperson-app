// app/hooks/useImportStates.ts
import { useState } from "react";
import { DATASET_TYPE_TO_STATE_KEY } from "../lib/constants";
import { DatasetType } from "../lib/types";

interface ImportState {
  isLoading: boolean;
  progress: number;
  status: "idle" | "processing" | "completed" | "error";
  errorMessage?: string; // ← 追加
}

type UseImportStatesReturn = {
  importStates: Record<keyof typeof DATASET_TYPE_TO_STATE_KEY, ImportState>;
  setProcessing: (type: DatasetType) => void;
  setCompleted: (type: DatasetType) => void;
  // ↓ エラーメッセージも渡せるよう変更
  setError: (type: DatasetType, errorMessage?: string) => void;
};

export function useImportStates(): UseImportStatesReturn {
  const [importStates, setImportStates] = useState<
    Record<keyof typeof DATASET_TYPE_TO_STATE_KEY, ImportState>
  >({
    products:            { isLoading: false, progress: 0, status: "idle" },
    orders:              { isLoading: false, progress: 0, status: "idle" },
    policy:              { isLoading: false, progress: 0, status: "idle" },
    faq:                 { isLoading: false, progress: 0, status: "idle" },
    product_meta_fields: { isLoading: false, progress: 0, status: "idle" },
    system_prompt:       { isLoading: false, progress: 0, status: "idle" },
    task_sync:           { isLoading: false, progress: 0, status: "idle" },
  });

  function setProcessing(type: DatasetType) {
    const key = DATASET_TYPE_TO_STATE_KEY[type];
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
  
  function setCompleted(type: DatasetType) {
    const key = DATASET_TYPE_TO_STATE_KEY[type];
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
  function setError(type: DatasetType, errorMessage?: string) {
    const key = DATASET_TYPE_TO_STATE_KEY[type];
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