//##############################################
//## DifyナレッジAPI　ドキュメント
//## https://cloud.dify.ai/datasets?category=api
//##############################################

export const DIFY_ERROR_CODES = {
  no_file_uploaded: "ファイルをアップロードしてください。",
  too_many_files: "許可されるファイルは1つだけです。",
  file_too_large: "ファイルサイズを超えました。",
  unsupported_file_type: "許可されていないファイルタイプです。",
  high_quality_dataset_only: "現在の操作では、「高品質」データセットのみがサポートされています。",
  dataset_not_initialized: "データセットはまだ初期化中またはインデックス作成中です。しばらくお待ちください。",
  archived_document_immutable: "アーカイブされたドキュメントは編集できません。",
  dataset_name_duplicate: "データセット名はすでに存在します。データセット名を変更してください。",
  invalid_action: "無効なアクションです。",
  document_already_finished: "ドキュメントは処理されました。ページを更新するか、ドキュメントの詳細に移動してください。",
  document_indexing: "ドキュメントは処理中なので編集できません。",
  invalid_metadata: "メタデータの内容が正しくありません。確認して検証してください。"
} as const;

export type DifyErrorCode = keyof typeof DIFY_ERROR_CODES;

export class DifyError extends Error {
  code: DifyErrorCode | string;
  status: number;

  constructor(code: DifyErrorCode | string, status: number = 400) {
    const message = code in DIFY_ERROR_CODES 
      ? DIFY_ERROR_CODES[code as DifyErrorCode]
      : "不明なエラーが発生しました。";
    super(message);
    this.name = "DifyError";
    this.code = (code in DIFY_ERROR_CODES ? code : "invalid_action") as DifyErrorCode;
    this.status = status;
  }
}