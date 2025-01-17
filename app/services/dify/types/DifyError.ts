
export class DifyError extends Error {
    public code?: string;
    public status?: number;
  
    constructor(message: string, code?: string, status?: number) {
      super(message);
      this.name = 'DifyError';
      this.code = code;
      this.status = status;
      Object.setPrototypeOf(this, DifyError.prototype);
    }
  }