const crypto = require("crypto");
const { getPool } = require("./pool");
const { getPath, matchesFilter, sortDocuments, comparable } = require("./matcher");

const registry = new Map();

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      output[key] = stripUndefined(item);
    }
    return output;
  }
  return value;
}

function normalizeError(error) {
  if (error?.code === "23505") {
    error.code = 11000;
    error.name = "MongoServerError";
    error.message = "A record with the same unique value already exists";
  }
  if (error?.code === "22P02") {
    error.name = "CastError";
  }
  return error;
}

function applyDefaults(input, defaults = {}) {
  const data = { ...input };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (data[key] !== undefined) continue;
    data[key] = typeof defaultValue === "function" ? defaultValue() : clone(defaultValue);
  }
  return data;
}

function applyUpdate(document, update = {}, options = {}) {
  if (!update || typeof update !== "object") return document;

  const hasOperators = Object.keys(update).some((key) => key.startsWith("$"));
  if (!hasOperators) {
    for (const [key, value] of Object.entries(update)) {
      if (value !== undefined) document[key] = value;
    }
    return document;
  }

  if (options.isInsert && update.$setOnInsert) {
    for (const [key, value] of Object.entries(update.$setOnInsert)) {
      if (value !== undefined) document[key] = value;
    }
  }

  if (update.$set) {
    for (const [key, value] of Object.entries(update.$set)) {
      if (value !== undefined) document[key] = value;
    }
  }

  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) {
      document[key] = Number(document[key] || 0) + Number(value || 0);
    }
  }

  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) delete document[key];
  }

  if (update.$push) {
    for (const [key, value] of Object.entries(update.$push)) {
      if (!Array.isArray(document[key])) document[key] = [];
      document[key].push(value);
    }
  }

  return document;
}

function selectFields(document, selection) {
  if (!selection || !document) return document;
  const fields = String(selection)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((field) => !field.startsWith("-"))
    .map((field) => field.replace(/^\+/, ""));

  if (!fields.length || String(selection).includes("+")) return document;

  const source = document.toObject ? document.toObject() : document;
  const output = { _id: source._id, id: source._id };
  for (const field of fields) output[field] = source[field];
  return output;
}

function groupDocuments(documents, definition) {
  const groups = new Map();

  function groupKey(document) {
    const expression = definition._id;
    if (expression === null) return null;
    if (typeof expression === "string" && expression.startsWith("$")) {
      return getPath(document, expression.slice(1));
    }
    if (expression && typeof expression === "object" && expression.$dateToString) {
      const dateValue = getPath(document, String(expression.$dateToString.date || "").replace(/^\$/, ""));
      const date = new Date(dateValue);
      if (!Number.isFinite(date.getTime())) return "";
      const format = expression.$dateToString.format || "%Y-%m-%d";
      if (format === "%Y-%m-%d") return date.toISOString().slice(0, 10);
      if (format === "%Y-%m") return date.toISOString().slice(0, 7);
      return date.toISOString();
    }
    if (expression && typeof expression === "object") {
      const value = {};
      for (const [key, item] of Object.entries(expression)) {
        if (typeof item === "string" && item.startsWith("$")) value[key] = getPath(document, item.slice(1));
        else value[key] = item;
      }
      return value;
    }
    return expression;
  }

  for (const document of documents) {
    const id = groupKey(document);
    const mapKey = JSON.stringify(id);
    if (!groups.has(mapKey)) groups.set(mapKey, { _id: id });
    const result = groups.get(mapKey);

    for (const [field, accumulator] of Object.entries(definition)) {
      if (field === "_id") continue;
      if (accumulator && typeof accumulator === "object" && accumulator.$sum !== undefined) {
        let amount = accumulator.$sum;
        if (typeof amount === "string" && amount.startsWith("$")) {
          amount = getPath(document, amount.slice(1));
        } else if (amount && typeof amount === "object" && Array.isArray(amount.$multiply)) {
          amount = amount.$multiply.reduce((product, expression) => {
            const value = typeof expression === "string" && expression.startsWith("$")
              ? getPath(document, expression.slice(1))
              : expression;
            return product * Number(value || 0);
          }, 1);
        }
        result[field] = Number(result[field] || 0) + Number(amount || 0);
      }
    }
  }

  return [...groups.values()];
}

class Query {
  constructor(executor, { single = false } = {}) {
    this.executor = executor;
    this.single = single;
    this.populateSteps = [];
    this.sortSpec = null;
    this.skipCount = 0;
    this.limitCount = null;
    this.selection = null;
    this.useLean = false;
  }

  populate(path, fields) {
    this.populateSteps.push({ path, fields });
    return this;
  }

  sort(spec) {
    this.sortSpec = spec;
    return this;
  }

  skip(count) {
    this.skipCount = Math.max(0, Number(count || 0));
    return this;
  }

  limit(count) {
    this.limitCount = Math.max(0, Number(count || 0));
    return this;
  }

  select(selection) {
    this.selection = selection;
    return this;
  }

  lean() {
    this.useLean = true;
    return this;
  }

  async run() {
    let result = await this.executor();
    const isArray = Array.isArray(result);
    let items = isArray ? result : result ? [result] : [];

    if (this.sortSpec) items = sortDocuments(items, this.sortSpec);
    if (this.skipCount) items = items.slice(this.skipCount);
    if (this.limitCount !== null) items = items.slice(0, this.limitCount);

    for (const step of this.populateSteps) {
      items = await Promise.all(items.map((item) => populateDocument(item, step.path, step.fields)));
    }

    if (this.selection) items = items.map((item) => selectFields(item, this.selection));
    if (this.useLean) items = items.map((item) => (item?.toObject ? item.toObject() : clone(item)));

    if (this.single || !isArray) return items[0] || null;
    return items;
  }

  then(resolve, reject) {
    return this.run().then(resolve, reject);
  }

  catch(reject) {
    return this.run().catch(reject);
  }

  finally(handler) {
    return this.run().finally(handler);
  }
}

async function populateDocument(document, path, fields) {
  if (!document) return document;
  const model = document.constructor;
  const relationName = model.relations?.[path];
  if (!relationName) return document;
  const TargetModel = registry.get(relationName);
  if (!TargetModel) return document;

  const parts = String(path).split(".");

  async function populateAt(container, index) {
    if (!container) return;
    const key = parts[index];

    if (index < parts.length - 1) {
      const next = container[key];
      if (Array.isArray(next)) {
        await Promise.all(next.map((item) => populateAt(item, index + 1)));
      } else {
        await populateAt(next, index + 1);
      }
      return;
    }

    const reference = container[key];
    if (!reference) return;
    const referenceId = typeof reference === "object" ? reference._id || reference.id : reference;
    if (!referenceId) return;
    const related = await TargetModel.findById(referenceId);
    container[key] = related ? selectFields(related, fields) : null;
  }

  await populateAt(document, 0);
  return document;
}

function createModel(config) {
  const {
    name,
    table,
    tenantKey = "owner",
    defaults = {},
    hidden = [],
    relations = {},
    virtuals = {},
    methods = {},
    beforeSave,
    validate
  } = config;

  class Model {
    constructor(data = {}, options = {}) {
      const merged = options.applyDefaults === false ? { ...data } : applyDefaults(data, defaults);
      Object.assign(this, merged);
      this._id = String(data._id || data.id || merged._id || crypto.randomUUID());
      this.id = this._id;

      Object.defineProperty(this, "__isNew", {
        value: Boolean(options.isNew),
        writable: true,
        enumerable: false
      });
      Object.defineProperty(this, "__original", {
        value: clone(this._serializableData()),
        writable: true,
        enumerable: false
      });
    }

    _serializableData() {
      const data = {};
      for (const [key, value] of Object.entries(this)) {
        if (["_id", "id", "createdAt", "updatedAt"].includes(key)) continue;
        if (key.startsWith("__")) continue;
        data[key] = value;
      }
      return stripUndefined(data);
    }

    isModified(field) {
      if (this.__isNew) return true;
      return JSON.stringify(this[field]) !== JSON.stringify(this.__original?.[field]);
    }

    set(values = {}) {
      for (const [key, value] of Object.entries(values || {})) {
        if (["_id", "id", "createdAt", "updatedAt"].includes(key)) continue;
        this[key] = value;
      }
      return this;
    }

    toObject(options = {}) {
      const output = {
        ...clone(this._serializableData()),
        _id: this._id,
        id: this._id,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
      if (!options.includeHidden) {
        for (const field of hidden) delete output[field];
      }
      for (const [field, getter] of Object.entries(virtuals)) {
        output[field] = getter.call(this);
      }
      return output;
    }

    toJSON() {
      return this.toObject();
    }

    async save(options = {}) {
      if (beforeSave) await beforeSave.call(this, options);
      if (validate && options.validateBeforeSave !== false) await validate.call(this);

      const db = getPool();
      const now = new Date();
      const payload = this._serializableData();
      const tenantValue = tenantKey ? payload[tenantKey] ?? null : null;
      const createdAt = this.createdAt ? new Date(this.createdAt) : now;

      try {
        const result = await db.query(
          `insert into ${table} (id, owner_id, data, created_at, updated_at)
           values ($1, $2, $3::jsonb, $4, $5)
           on conflict (id) do update set
             owner_id = excluded.owner_id,
             data = excluded.data,
             updated_at = excluded.updated_at
           returning id, owner_id, data, created_at, updated_at`,
          [this._id, tenantValue ? String(tenantValue) : null, JSON.stringify(payload), createdAt, now]
        );

        const hydrated = Model._fromRow(result.rows[0]);
        Object.assign(this, hydrated._serializableData());
        this.createdAt = hydrated.createdAt;
        this.updatedAt = hydrated.updatedAt;
        this.__isNew = false;
        this.__original = clone(this._serializableData());
        return this;
      } catch (error) {
        throw normalizeError(error);
      }
    }

    async deleteOne() {
      return Model.deleteOne({ _id: this._id });
    }
  }

  Object.defineProperty(Model, "modelName", { value: name });
  Object.defineProperty(Model, "tableName", { value: table });
  Object.defineProperty(Model, "relations", { value: relations });
  Object.defineProperty(Model.prototype, "constructor", { value: Model });

  for (const [field, getter] of Object.entries(virtuals)) {
    Object.defineProperty(Model.prototype, field, {
      get() {
        return getter.call(this);
      },
      enumerable: false
    });
  }

  for (const [methodName, method] of Object.entries(methods)) {
    Object.defineProperty(Model.prototype, methodName, {
      value: method,
      enumerable: false
    });
  }

  Model._fromRow = function fromRow(row) {
    if (!row) return null;
    return new Model(
      {
        ...(row.data || {}),
        _id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      },
      { applyDefaults: true, isNew: false }
    );
  };

  Model._fetchRows = async function fetchRows(filter = {}) {
    const db = getPool();
    const conditions = [];
    const values = [];

    const idFilter = filter?._id ?? filter?.id;
    if (idFilter !== undefined && (typeof idFilter !== "object" || idFilter === null)) {
      values.push(String(idFilter));
      conditions.push(`id = $${values.length}`);
    }

    if (tenantKey && filter?.[tenantKey] !== undefined) {
      const tenantFilter = filter[tenantKey];
      if (typeof tenantFilter !== "object" || tenantFilter === null) {
        values.push(String(tenantFilter));
        conditions.push(`owner_id = $${values.length}`);
      }
    }

    const where = conditions.length ? ` where ${conditions.join(" and ")}` : "";
    const result = await db.query(
      `select id, owner_id, data, created_at, updated_at from ${table}${where}`,
      values
    );
    return result.rows;
  };

  Model.find = function find(filter = {}) {
    return new Query(async () => {
      const rows = await Model._fetchRows(filter);
      return rows.map(Model._fromRow).filter((document) => matchesFilter(document, filter));
    });
  };

  Model.findOne = function findOne(filter = {}) {
    return new Query(
      async () => {
        const rows = await Model._fetchRows(filter);
        return rows.map(Model._fromRow).find((document) => matchesFilter(document, filter)) || null;
      },
      { single: true }
    );
  };

  Model.findById = function findById(id) {
    return Model.findOne({ _id: id });
  };

  Model.create = async function create(data = {}) {
    const document = new Model(data, { isNew: true });
    return document.save();
  };

  Model.countDocuments = async function countDocuments(filter = {}) {
    const documents = await Model.find(filter);
    return documents.length;
  };

  Model.estimatedDocumentCount = async function estimatedDocumentCount() {
    const db = getPool();
    const result = await db.query(`select count(*)::int as count from ${table}`);
    return Number(result.rows[0]?.count || 0);
  };

  Model.findOneAndUpdate = function findOneAndUpdate(filter, update, options = {}) {
    return new Query(
      async () => {
        let document = await Model.findOne(filter);
        let inserted = false;
        if (!document && options.upsert) {
          const seed = {};
          for (const [key, value] of Object.entries(filter || {})) {
            if (!key.startsWith("$") && (typeof value !== "object" || value === null)) seed[key] = value;
          }
          document = new Model(seed, { isNew: true });
          inserted = true;
        }
        if (!document) return null;
        const original = document.toObject({ includeHidden: true });
        applyUpdate(document, update, { isInsert: inserted });
        await document.save({ validateBeforeSave: options.runValidators !== false });
        return options.new === false ? new Model(original, { applyDefaults: false }) : document;
      },
      { single: true }
    );
  };

  Model.findByIdAndUpdate = function findByIdAndUpdate(id, update, options = {}) {
    return Model.findOneAndUpdate({ _id: id }, update, options);
  };

  Model.findOneAndDelete = function findOneAndDelete(filter = {}) {
    return new Query(
      async () => {
        const document = await Model.findOne(filter);
        if (!document) return null;
        await Model.deleteOne({ _id: document._id });
        return document;
      },
      { single: true }
    );
  };

  Model.findByIdAndDelete = function findByIdAndDelete(id) {
    return Model.findOneAndDelete({ _id: id });
  };

  Model.updateOne = async function updateOne(filter = {}, update = {}) {
    const document = await Model.findOne(filter);
    if (!document) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    applyUpdate(document, update);
    await document.save();
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };

  Model.updateMany = async function updateMany(filter = {}, update = {}) {
    const documents = await Model.find(filter);
    for (const document of documents) {
      applyUpdate(document, update);
      await document.save();
    }
    return { acknowledged: true, matchedCount: documents.length, modifiedCount: documents.length };
  };

  Model.exists = async function exists(filter = {}) {
    const document = await Model.findOne(filter);
    return document ? { _id: document._id } : null;
  };

  Model.deleteOne = async function deleteOne(filter = {}) {
    const document = await Model.findOne(filter);
    if (!document) return { acknowledged: true, deletedCount: 0 };
    const db = getPool();
    await db.query(`delete from ${table} where id = $1`, [document._id]);
    return { acknowledged: true, deletedCount: 1 };
  };

  Model.deleteMany = async function deleteMany(filter = {}) {
    const documents = await Model.find(filter);
    const db = getPool();
    for (const document of documents) await db.query(`delete from ${table} where id = $1`, [document._id]);
    return { acknowledged: true, deletedCount: documents.length };
  };

  Model.aggregate = async function aggregate(pipeline = []) {
    let documents = await Model.find({});
    let output = documents.map((document) => document.toObject({ includeHidden: true }));

    for (const stage of pipeline) {
      if (stage.$match) output = output.filter((document) => matchesFilter(document, stage.$match));
      else if (stage.$unwind) {
        const path = String(stage.$unwind).replace(/^\$/, "");
        output = output.flatMap((document) => {
          const list = getPath(document, path);
          if (!Array.isArray(list)) return [];
          return list.map((item) => ({ ...document, [path]: item }));
        });
      } else if (stage.$group) output = groupDocuments(output, stage.$group);
      else if (stage.$sort) output = sortDocuments(output, stage.$sort);
      else if (stage.$limit !== undefined) output = output.slice(0, Number(stage.$limit));
    }

    return output;
  };

  Model.syncIndexes = async function syncIndexes() {
    const db = getPool();
    await db.query(`select 1 from ${table} limit 1`);
    return [];
  };

  Model.rawUpsert = async function rawUpsert(data, metadata = {}) {
    const db = getPool();
    const id = String(metadata.id || data._id || data.id || crypto.randomUUID());
    const payload = { ...data };
    delete payload._id;
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    const tenantValue = tenantKey ? payload[tenantKey] ?? null : null;
    const createdAt = metadata.createdAt || data.createdAt || new Date();
    const updatedAt = metadata.updatedAt || data.updatedAt || createdAt;
    await db.query(
      `insert into ${table} (id, owner_id, data, created_at, updated_at)
       values ($1, $2, $3::jsonb, $4, $5)
       on conflict (id) do update set owner_id = excluded.owner_id, data = excluded.data,
       created_at = excluded.created_at, updated_at = excluded.updated_at`,
      [id, tenantValue ? String(tenantValue) : null, JSON.stringify(stripUndefined(payload)), createdAt, updatedAt]
    );
  };

  registry.set(name, Model);
  return Model;
}

function getRegisteredModels() {
  return Object.fromEntries(registry.entries());
}

module.exports = {
  createModel,
  getRegisteredModels,
  Query,
  matchesFilter,
  applyUpdate
};
