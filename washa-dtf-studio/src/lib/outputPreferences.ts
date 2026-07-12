export type OutputPreferenceState = {
  removeBackground?: boolean;
  avoidHardEdges?: boolean;
};

export function isCleanOutputEnabled(preferences: OutputPreferenceState = {}) {
  return preferences.removeBackground !== false || preferences.avoidHardEdges !== false;
}

export function normalizeOutputPreferences(preferences: OutputPreferenceState = {}) {
  const enabled = isCleanOutputEnabled(preferences);
  return {
    removeBackground: enabled,
    avoidHardEdges: enabled,
  };
}
