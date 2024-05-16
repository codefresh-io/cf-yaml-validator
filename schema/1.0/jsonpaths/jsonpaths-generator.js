'use strict';

const _ = require('lodash');
const { VARIABLE_EXACT_REGEX } = require('../constants/variable-regex');

class JSONPathsGenerator {
    constructor({ fieldType, joiSchema, isCamelCase = false } = {}) {
        this._fieldType = fieldType;
        this._joiSchemaDescription = joiSchema.describe();
        this._isCamelCase = isCamelCase;

        this._exclusiveFields = [];
        this._mixedFields = [];
    }

    getJSONPaths() {
        this._traverseSchema(this._joiSchemaDescription);
        return {
            exclusiveFields: this._exclusiveFields,
            mixedFields: this._mixedFields
        };
    }

    _traverseSchema(joiSchemaPart, path = '$', opts = {}) {
        if (joiSchemaPart.type === 'object') {
            if (joiSchemaPart.children) {
                Object.entries(joiSchemaPart.children).forEach(([key, descriptionChild]) => {
                    this._traverseSchema(descriptionChild, `${path}.${this._adjustCase(key)}`);
                });
            }
            if (joiSchemaPart.patterns) {
                joiSchemaPart.patterns?.forEach((pattern) => {
                    if (pattern.rule?.type === 'array') {
                        this._traverseSchema(pattern.rule, `${path}.*`, { isRuleArray: true });
                    } else if (pattern.rule?.type === 'alternatives') {
                        this._traverseSchema(pattern.rule, `${path}.*`);
                    } else if (pattern.rule?.type === 'object') {
                        this._traverseSchema(pattern.rule, `${path}.*`);
                    }
                });
            }
        } else if (joiSchemaPart.type === 'array') {
            joiSchemaPart.items?.forEach((item) => {
                this._traverseSchema(
                    item,
                    !opts.isRuleArray ? `${path}[*]` : path
                );
            });
        } else if (joiSchemaPart.type === 'alternatives') {
            if (this._isExclusiveField(joiSchemaPart)) {
                this._exclusiveFields.push(path);
            } else {
                const { alternatives } = joiSchemaPart;
                if (Array.isArray(alternatives)) {
                    const exclusiveFields = [];
                    const otherFields = [];

                    alternatives.forEach((option) => {
                        if (this._isExclusiveField(option)) {
                            exclusiveFields.push(option);
                        } else {
                            otherFields.push(option);
                        }
                    });

                    if (exclusiveFields.length && !otherFields.length) {
                        exclusiveFields.some(() => this._exclusiveFields.push(path));
                    } else {
                        exclusiveFields.some(() => this._mixedFields.push(path));
                        otherFields.forEach(option => this._traverseSchema(option, path));
                    }
                }
            }
        }
    }

    _isExclusiveField(alternativesObj) {
        const { alternatives } = alternativesObj;

        if (!Array.isArray(alternatives) || alternatives.length !== 2) {
            return false;
        }

        const [option1, option2] = alternatives;

        const isTargetType = option => option.type === this._fieldType;
        const isCodefreshVariable = (option) => {
            if (option.type !== 'string') {
                return false;
            }
            const rule = option.rules?.[0];
            return rule?.name === 'regex' && rule?.arg?.source === VARIABLE_EXACT_REGEX.source;
        };

        return (isTargetType(option1) && isCodefreshVariable(option2))
            || (isCodefreshVariable(option1) && isTargetType(option2));
    }

    _adjustCase(str) {
        return this._isCamelCase ? _.camelCase(str) : str;
    }
}

module.exports = {
    JSONPathsGenerator,
};
