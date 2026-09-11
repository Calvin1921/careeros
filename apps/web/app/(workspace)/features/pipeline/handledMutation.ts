export async function handledMutation<T>(
  run: () => Promise<T>,
  onSuccess?: (value: T) => void | Promise<void>,
) {
  try {
    const value = await run();
    await onSuccess?.(value);
    return true;
  } catch {
    return false;
  }
}
