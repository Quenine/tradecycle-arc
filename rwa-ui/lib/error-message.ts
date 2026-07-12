export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error !== null) {
    const value = error as { shortMessage?: unknown; message?: unknown }
    if (typeof value.shortMessage === "string" && value.shortMessage) return value.shortMessage
    if (typeof value.message === "string" && value.message) return value.message
  }
  return fallback
}
