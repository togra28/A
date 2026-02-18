
export enum ShiftType {
  ABW = 'ABW',
  WUNSCH_NACHT = 'WUNSCH_NACHT',
  WUNSCH_TAG = 'WUNSCH_TAG'
}

export interface ExtractedPreference {
  type: ShiftType;
  employeeId: string;
  days: number[];
}

export interface InputItem {
  id: string;
  content?: string; // For text files or manual input
  name: string;
  mimeType: string;
  base64?: string; // For images and PDFs
}

export interface ProcessingResult {
  fileName?: string;
  employeeId: string;
  preferences: ExtractedPreference[];
  rawText?: string;
  formattedOutput: string[];
}

export interface ProcessingError {
  fileName?: string;
  message: string;
}
