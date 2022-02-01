import mongoose from "mongoose";
import traverse from "traverse";
import clone from "clone";

function IdValidator(this: any) {
  this.enabled = true;
}

IdValidator.prototype.enable = function () {
  this.enabled = true;
};

IdValidator.prototype.disable = function () {
  this.enabled = false;
};

IdValidator.prototype.validate = function (schema: any, options: any) {
  const self = this;
  options = options || {};
  const message = options.message || "{PATH} references a non existing ID";
  const connection = options.connection || mongoose;
  const allowDuplicates = options.allowDuplicates || false;

  const caller = self instanceof IdValidator ? self : IdValidator.prototype;

  return caller.validateSchema(schema, message, connection, allowDuplicates);
};

IdValidator.prototype.validateSchema = function (
  this: { enabled: boolean },
  schema: any,
  message: any,
  connection: any,
  allowDuplicates: any
) {
  const self = this;
  const caller = self instanceof IdValidator ? self : IdValidator.prototype;
  schema.eachPath(function (path: any, schemaType: any) {
    // Apply validation recursively to sub-schemas (but not ourself if we
    // are referenced recursively)
    if (schemaType.schema && schemaType.schema !== schema) {
      return caller.validateSchema(schemaType.schema, message, connection);
    }

    let validateFunction: any = null;
    let refModelName: any = null;
    let refModelPath: any = null;
    let conditions: any = {};

    if (schemaType.options && schemaType.options.ref) {
      refModelName = schemaType.options.ref;
      if (schemaType.options.refConditions) {
        conditions = schemaType.options.refConditions;
      }
    } else if (schemaType.options && schemaType.options.refPath) {
      refModelPath = schemaType.options.refPath;
      if (schemaType.options.refConditions) {
        conditions = schemaType.options.refConditions;
      }
    } else if (
      schemaType.caster &&
      schemaType.caster.instance &&
      schemaType.caster.options &&
      schemaType.caster.options.ref
    ) {
      refModelName = schemaType.caster.options.ref;
      if (schemaType.caster.options.refConditions) {
        conditions = schemaType.caster.options.refConditions;
      }
    }

    const isArraySchemaType =
      (schemaType.caster && schemaType.caster.instance) ||
      schemaType.instance === "Array" ||
      schemaType["$isMongooseArray"] === true;
    validateFunction = isArraySchemaType ? validateIdArray : validateId;

    if (refModelName || refModelPath) {
      schema.path(path).validate({
        validator: function (value: any) {
          return new Promise(
            function (this: any, resolve: any, reject: any) {
              let conditionsCopy = conditions;
              //A query may not implement an isModified function.
              if (this && !!this.isModified && !this.isModified(path)) {
                resolve(true);
                return;
              }
              if (!(self instanceof IdValidator) || self.enabled) {
                if (Object.keys(conditionsCopy).length > 0) {
                  const instance = this;

                  conditionsCopy = clone(conditions);
                  traverse(conditionsCopy).forEach(function (this: any, value: any) {
                    if (typeof value === "function") {
                      this.update(value.call(instance));
                    }
                  });
                }
                let localRefModelName = refModelName;
                if (refModelPath) {
                  localRefModelName = this[refModelPath];
                }

                return validateFunction(
                  this,
                  connection,
                  localRefModelName,
                  value,
                  conditionsCopy,
                  resolve,
                  reject,
                  allowDuplicates
                );
              }
              resolve(true);
              return;
            }.bind(this)
          );
        },
        message: message,
      });
    }
  });
};

function executeQuery(query: any, conditions: any, validateValue: any, resolve: any, reject: any) {
  for (const fieldName in conditions) {
    query.where(fieldName, conditions[fieldName]);
  }
  query.exec(function (err: any, count: any) {
    if (err) {
      reject(err);
      return;
    }
    return count === validateValue ? resolve(true) : resolve(false);
  });
}

function validateId(
  doc: any,
  connection: any,
  refModelName: any,
  value: any,
  conditions: any,
  resolve: any,
  reject: any
) {
  if (value == null) {
    resolve(true);
    return;
  }
  const refModel = connection.model(refModelName);
  const query = refModel.countDocuments({ _id: value });
  const session = doc.$session && doc.$session();
  if (session) {
    query.session(session);
  }
  executeQuery(query, conditions, 1, resolve, reject);
}

function validateIdArray(
  doc: any,
  connection: any,
  refModelName: any,
  values: any,
  conditions: any,
  resolve: any,
  reject: any,
  allowDuplicates: any
) {
  if (values == null || values.length == 0) {
    resolve(true);
    return;
  }

  let checkValues = values;
  if (allowDuplicates) {
    //Extract unique values only

    checkValues = values.filter(function (v: any, i: any) {
      return values.indexOf(v) === i;
    });
  }

  const refModel = connection.model(refModelName);
  const query = refModel.countDocuments().where("_id")["in"](checkValues);
  const session = doc.$session && doc.$session();
  if (session) {
    query.session(session);
  }

  executeQuery(query, conditions, checkValues.length, resolve, reject);
}

export const getConstructor = IdValidator;
export default IdValidator.prototype.validate;
