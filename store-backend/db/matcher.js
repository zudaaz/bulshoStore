function getPath(object, path) {
  if (!path) return object;
  const cleanPath = String(path).replace(/^\$/, "");
  return cleanPath.split(".").reduce((value, key) => {
    if (value === null || value === undefined) return undefined;
    return value[key];
  }, object);
}

function comparable(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(timestamp)) return timestamp;
  }
  if (value && typeof value === "object" && typeof value.toString === "function") {
    if (value.constructor?.name === "ObjectId") return value.toString();
  }
  return value;
}

function valuesEqual(left, right) {
  const a = comparable(left);
  const b = comparable(right);

  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return String(a) === String(b);
}

function resolveExpressionValue(document, expression) {
  if (typeof expression === "string" && expression.startsWith("$")) {
    return getPath(document, expression.slice(1));
  }
  return expression;
}

function compareOperator(document, operator, args) {
  const [leftExpression, rightExpression] = args;
  const left = comparable(resolveExpressionValue(document, leftExpression));
  const right = comparable(resolveExpressionValue(document, rightExpression));

  switch (operator) {
    case "$lte":
      return left <= right;
    case "$lt":
      return left < right;
    case "$gte":
      return left >= right;
    case "$gt":
      return left > right;
    case "$eq":
      return valuesEqual(left, right);
    case "$ne":
      return !valuesEqual(left, right);
    default:
      return false;
  }
}

function matchesCondition(value, condition) {
  if (condition instanceof RegExp) return condition.test(String(value ?? ""));

  if (!condition || typeof condition !== "object" || condition instanceof Date || Array.isArray(condition)) {
    return valuesEqual(value, condition);
  }

  const regexValue = condition.$regex;
  if (regexValue !== undefined) {
    const regex = regexValue instanceof RegExp
      ? regexValue
      : new RegExp(String(regexValue), String(condition.$options || ""));
    if (!regex.test(String(value ?? ""))) return false;
  }

  for (const [operator, expected] of Object.entries(condition)) {
    if (operator === "$regex" || operator === "$options") continue;

    const actual = comparable(value);
    const target = comparable(expected);

    switch (operator) {
      case "$ne":
        if (valuesEqual(value, expected)) return false;
        break;
      case "$gt":
        if (!(actual > target)) return false;
        break;
      case "$gte":
        if (!(actual >= target)) return false;
        break;
      case "$lt":
        if (!(actual < target)) return false;
        break;
      case "$lte":
        if (!(actual <= target)) return false;
        break;
      case "$in":
        if (!Array.isArray(expected) || !expected.some((item) => valuesEqual(value, item))) return false;
        break;
      case "$nin":
        if (Array.isArray(expected) && expected.some((item) => valuesEqual(value, item))) return false;
        break;
      case "$exists":
        if (Boolean(value !== undefined && value !== null) !== Boolean(expected)) return false;
        break;
      default:
        if (!operator.startsWith("$") && !valuesEqual(value?.[operator], expected)) return false;
        break;
    }
  }

  return true;
}

function matchesFilter(document, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, condition] of Object.entries(filter)) {
    if (key === "$or") {
      if (!Array.isArray(condition) || !condition.some((item) => matchesFilter(document, item))) return false;
      continue;
    }

    if (key === "$and") {
      if (!Array.isArray(condition) || !condition.every((item) => matchesFilter(document, item))) return false;
      continue;
    }

    if (key === "$expr") {
      const entries = Object.entries(condition || {});
      if (!entries.every(([operator, args]) => compareOperator(document, operator, args))) return false;
      continue;
    }

    const value = key === "_id" || key === "id" ? document._id : getPath(document, key);
    if (!matchesCondition(value, condition)) return false;
  }

  return true;
}

function sortDocuments(documents, sortSpec) {
  if (!sortSpec) return documents;

  let entries = [];
  if (typeof sortSpec === "string") {
    entries = sortSpec
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((field) => [field.replace(/^-/, ""), field.startsWith("-") ? -1 : 1]);
  } else {
    entries = Object.entries(sortSpec);
  }

  return [...documents].sort((left, right) => {
    for (const [field, directionValue] of entries) {
      const direction = Number(directionValue) < 0 ? -1 : 1;
      const a = comparable(getPath(left, field));
      const b = comparable(getPath(right, field));

      if (valuesEqual(a, b)) continue;
      if (a === undefined || a === null) return -1 * direction;
      if (b === undefined || b === null) return 1 * direction;
      return (a > b ? 1 : -1) * direction;
    }
    return 0;
  });
}

module.exports = {
  getPath,
  valuesEqual,
  matchesFilter,
  sortDocuments,
  comparable
};
