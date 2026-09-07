export const formatListValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === 'string' ? entry : JSON.stringify(entry),
      )
      .filter((entry) => entry.length > 0)
      .join(', ');
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

export const formatReasonList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return typeof value === 'string' && value.length > 0 ? [value] : [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (
        entry &&
        typeof entry === 'object' &&
        'text' in entry &&
        typeof (entry as { text?: unknown }).text === 'string'
      ) {
        return (entry as { text: string }).text;
      }

      if (
        entry &&
        typeof entry === 'object' &&
        'label' in entry &&
        typeof (entry as { label?: unknown }).label === 'string'
      ) {
        return (entry as { label: string }).label;
      }

      return null;
    })
    .filter(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0,
    );
};

export const formatBuyerRoles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (entry && typeof entry === 'object') {
        const role =
          ('role' in entry && typeof entry.role === 'string' && entry.role) ||
          ('name' in entry && typeof entry.name === 'string' && entry.name) ||
          ('title' in entry && typeof entry.title === 'string' && entry.title);

        return role || null;
      }

      return null;
    })
    .filter(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0,
    );
};

export const parseCommaSeparated = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
