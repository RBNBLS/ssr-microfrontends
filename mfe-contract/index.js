// Bumped on any breaking change to the types in index.d.ts. Each side bundles
// the value it was built against, so comparing the two at runtime catches a
// shell and an MFE deployed against different majors.
export const CONTRACT_VERSION = 2;

/** Whether a version an MFE reports can be used by this build. */
export function isCompatible(version) {
  return version === CONTRACT_VERSION;
}
