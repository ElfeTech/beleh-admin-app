/**
 * Build window.open feature string with the popup centered on the
 * current browser window (works better than screen.width on multi-monitor).
 */
export function centeredPopupFeatures(
  width: number,
  height: number,
  extras = 'menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes',
): string {
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
  const viewportWidth = window.outerWidth || document.documentElement.clientWidth || screen.width;
  const viewportHeight =
    window.outerHeight || document.documentElement.clientHeight || screen.height;

  const left = Math.max(0, Math.round(dualScreenLeft + (viewportWidth - width) / 2));
  const top = Math.max(0, Math.round(dualScreenTop + (viewportHeight - height) / 2));

  return `width=${width},height=${height},left=${left},top=${top},${extras}`;
}

/**
 * Temporarily wrap window.open so the next popup(s) open centered.
 * Useful for Firebase signInWithPopup which does not accept window features.
 * Always call the returned restore function (e.g. in finally).
 */
export function patchWindowOpenCentered(width: number, height: number): () => void {
  const originalOpen = window.open.bind(window);

  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const nextFeatures = mergeOrReplaceCenteredFeatures(features, width, height);
    return originalOpen(url, target, nextFeatures);
  }) as typeof window.open;

  return () => {
    window.open = originalOpen;
  };
}

function mergeOrReplaceCenteredFeatures(
  existing: string | undefined,
  width: number,
  height: number,
): string {
  const centered = centeredPopupFeatures(width, height);
  if (!existing || !existing.trim()) return centered;

  const withoutGeometry = existing
    .split(',')
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.split('=')[0]?.toLowerCase();
      return (
        key !== 'width' &&
        key !== 'height' &&
        key !== 'left' &&
        key !== 'top' &&
        key !== 'screenx' &&
        key !== 'screeny'
      );
    })
    .join(',');

  return withoutGeometry ? `${centered},${withoutGeometry}` : centered;
}
