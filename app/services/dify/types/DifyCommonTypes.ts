export interface IDifyError {
    code?: string;    // 例: "no_file_uploaded"
    status?: number;  // 例: 400
    message: string;  // 例: "Please upload your file."
  }