"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConstructor = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const traverse_1 = __importDefault(require("traverse"));
const clone_1 = __importDefault(require("clone"));
function IdValidator() {
    this.enabled = true;
}
IdValidator.prototype.enable = function () {
    this.enabled = true;
};
IdValidator.prototype.disable = function () {
    this.enabled = false;
};
IdValidator.prototype.validate = function (schema, options) {
    const self = this;
    options = options || {};
    const message = options.message || "{PATH} references a non existing ID";
    const connection = options.connection || mongoose_1.default;
    const allowDuplicates = options.allowDuplicates || false;
    const caller = self instanceof IdValidator ? self : IdValidator.prototype;
    return caller.validateSchema(schema, message, connection, allowDuplicates);
};
IdValidator.prototype.validateSchema = function (schema, message, connection, allowDuplicates) {
    const self = this;
    const caller = self instanceof IdValidator ? self : IdValidator.prototype;
    schema.eachPath(function (path, schemaType) {
        // Apply validation recursively to sub-schemas (but not ourself if we
        // are referenced recursively)
        if (schemaType.schema && schemaType.schema !== schema) {
            return caller.validateSchema(schemaType.schema, message, connection);
        }
        let validateFunction = null;
        let refModelName = null;
        let refModelPath = null;
        let conditions = {};
        if (schemaType.options && schemaType.options.ref) {
            refModelName = schemaType.options.ref;
            if (schemaType.options.refConditions) {
                conditions = schemaType.options.refConditions;
            }
        }
        else if (schemaType.options && schemaType.options.refPath) {
            refModelPath = schemaType.options.refPath;
            if (schemaType.options.refConditions) {
                conditions = schemaType.options.refConditions;
            }
        }
        else if (schemaType.caster &&
            schemaType.caster.instance &&
            schemaType.caster.options &&
            schemaType.caster.options.ref) {
            refModelName = schemaType.caster.options.ref;
            if (schemaType.caster.options.refConditions) {
                conditions = schemaType.caster.options.refConditions;
            }
        }
        const isArraySchemaType = (schemaType.caster && schemaType.caster.instance) ||
            schemaType.instance === "Array" ||
            schemaType["$isMongooseArray"] === true;
        validateFunction = isArraySchemaType ? validateIdArray : validateId;
        if (refModelName || refModelPath) {
            schema.path(path).validate({
                validator: function (value) {
                    return new Promise(function (resolve, reject) {
                        let conditionsCopy = conditions;
                        //A query may not implement an isModified function.
                        if (this && !!this.isModified && !this.isModified(path)) {
                            resolve(true);
                            return;
                        }
                        if (!(self instanceof IdValidator) || self.enabled) {
                            if (Object.keys(conditionsCopy).length > 0) {
                                const instance = this;
                                conditionsCopy = (0, clone_1.default)(conditions);
                                (0, traverse_1.default)(conditionsCopy).forEach(function (value) {
                                    if (typeof value === "function") {
                                        this.update(value.call(instance));
                                    }
                                });
                            }
                            let localRefModelName = refModelName;
                            if (refModelPath) {
                                localRefModelName = this[refModelPath];
                            }
                            return validateFunction(this, connection, localRefModelName, value, conditionsCopy, resolve, reject, allowDuplicates);
                        }
                        resolve(true);
                        return;
                    }.bind(this));
                },
                message: message,
            });
        }
    });
};
function executeQuery(query, conditions, validateValue, resolve, reject) {
    for (const fieldName in conditions) {
        query.where(fieldName, conditions[fieldName]);
    }
    query.exec(function (err, count) {
        if (err) {
            reject(err);
            return;
        }
        return count === validateValue ? resolve(true) : resolve(false);
    });
}
function validateId(doc, connection, refModelName, value, conditions, resolve, reject) {
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
function validateIdArray(doc, connection, refModelName, values, conditions, resolve, reject, allowDuplicates) {
    if (values == null || values.length == 0) {
        resolve(true);
        return;
    }
    let checkValues = values;
    if (allowDuplicates) {
        //Extract unique values only
        checkValues = values.filter(function (v, i) {
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
exports.getConstructor = IdValidator;
exports.default = IdValidator.prototype.validate;
