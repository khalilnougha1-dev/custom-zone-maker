let activeNativeInteractions = 0;

export function isNativeInteractionActive() {
  return activeNativeInteractions > 0;
}

export async function withNativeInteraction<T>(operation: () => Promise<T>): Promise<T> {
  activeNativeInteractions += 1;
  try {
    return await operation();
  } finally {
    activeNativeInteractions = Math.max(0, activeNativeInteractions - 1);
  }
}