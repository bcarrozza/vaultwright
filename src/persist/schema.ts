export type JsonSchema = {
  type?: string;
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  exclusiveMinimum?: number;
  minimum?: number;
  minItems?: number;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
};

function resolveRef(ref: string, root: JsonSchema): JsonSchema {
  if (!ref.startsWith("#/")) {
    throw new Error(`Unsupported $ref: ${ref}`);
  }
  let node: unknown = root;
  for (const part of ref.slice(2).split("/")) {
    if (node === null || typeof node !== "object") {
      throw new Error(`Unresolved $ref: ${ref}`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  return node as JsonSchema;
}

function checkType(data: unknown, type: string): boolean {
  switch (type) {
    case "object":
      return data !== null && typeof data === "object" && !Array.isArray(data);
    case "array":
      return Array.isArray(data);
    case "string":
      return typeof data === "string";
    case "number":
      return typeof data === "number" && Number.isFinite(data);
    case "integer":
      return typeof data === "number" && Number.isInteger(data);
    case "boolean":
      return typeof data === "boolean";
    case "null":
      return data === null;
    default:
      return true;
  }
}

export function validateAgainstSchema(
  data: unknown,
  schema: JsonSchema,
  root: JsonSchema = schema,
  path = "$",
): string[] {
  if (schema.$ref) {
    return validateAgainstSchema(data, resolveRef(schema.$ref, root), root, path);
  }

  const errors: string[] = [];

  if (schema.type && !checkType(data, schema.type)) {
    errors.push(`${path}: expected ${schema.type}`);
    return errors;
  }

  if (schema.const !== undefined && data !== schema.const) {
    errors.push(`${path}: must be ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path}: must be one of ${schema.enum.join(", ")}`);
  }

  if (typeof data === "number") {
    if (
      schema.exclusiveMinimum !== undefined &&
      !(data > schema.exclusiveMinimum)
    ) {
      errors.push(`${path}: must be > ${schema.exclusiveMinimum}`);
    }
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path}: must be >= ${schema.minimum}`);
    }
  }

  if (
    schema.type === "object" &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    const obj = data as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        errors.push(`${path}.${key}: required`);
      }
    }
    const properties = schema.properties ?? {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          errors.push(`${path}.${key}: additional property not allowed`);
        }
      }
    }
    for (const [key, propSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        errors.push(
          ...validateAgainstSchema(obj[key], propSchema, root, `${path}.${key}`),
        );
      }
    }
  }

  if (schema.type === "array" && Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: minItems ${schema.minItems}`);
    }
    if (schema.items) {
      data.forEach((item, i) => {
        errors.push(
          ...validateAgainstSchema(item, schema.items!, root, `${path}[${i}]`),
        );
      });
    }
  }

  return errors;
}
