export type FormActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const IDLE_STATE: FormActionState = { status: "idle" };
