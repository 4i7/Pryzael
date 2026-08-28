export function parseCanonicalScalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

export function parseCanonicalSkillMarkdown(markdown) {
  if (typeof markdown !== "string") {
    throw new TypeError("canonical Skill markdown must be a string");
  }

  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return {
      normalized,
      body: "",
      entries: {},
      metadataEntries: {},
      semanticFields: {},
      errors: ["missing opening YAML frontmatter delimiter"],
    };
  }

  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return {
      normalized,
      body: "",
      entries: {},
      metadataEntries: {},
      semanticFields: {},
      errors: ["missing closing YAML frontmatter delimiter"],
    };
  }

  const entries = {};
  const metadataEntries = {};
  const semanticFields = {};
  const errors = [];
  let currentParent = null;

  for (const raw of normalized.slice(4, end).split("\n")) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;

    if (!/^\s/.test(raw)) {
      const separator = raw.indexOf(":");
      if (separator === -1) {
        errors.push(`invalid top-level YAML line: ${JSON.stringify(raw)}`);
        currentParent = null;
        continue;
      }

      const key = raw.slice(0, separator).trim();
      const rawValue = raw.slice(separator + 1).trim();
      entries[key] = rawValue;
      currentParent = rawValue.length === 0 ? key : null;

      if (key === "name" || key === "description") {
        try {
          semanticFields[key] = parseCanonicalScalar(raw.slice(separator + 1));
        } catch (error) {
          errors.push(`invalid ${key} scalar: ${error.message}`);
        }
      }
      continue;
    }

    if (currentParent !== "metadata") {
      errors.push(`unsupported nested YAML under ${JSON.stringify(currentParent)}: ${JSON.stringify(raw)}`);
      continue;
    }

    const nested = raw.trim();
    const separator = nested.indexOf(":");
    if (separator === -1) {
      errors.push(`invalid metadata YAML line: ${JSON.stringify(raw)}`);
      continue;
    }

    const key = nested.slice(0, separator).trim();
    metadataEntries[key] = nested.slice(separator + 1).trim();
  }

  return {
    normalized,
    body: normalized.slice(end + 5).trim(),
    entries,
    metadataEntries,
    semanticFields,
    errors,
  };
}

export function projectCanonicalSkill(parsed, directoryName) {
  if (parsed.errors.length > 0) {
    throw new Error(`${directoryName}: ${parsed.errors.join("; ")}`);
  }

  const name = parsed.semanticFields.name;
  const description = parsed.semanticFields.description;

  if (name !== directoryName) {
    throw new Error(`${directoryName}: frontmatter name must match directory`);
  }
  if (typeof description !== "string" || description.length === 0) {
    throw new Error(`${directoryName}: missing description`);
  }

  return {
    name,
    description,
    body: parsed.body,
  };
}
