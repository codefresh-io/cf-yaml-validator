'use strict';

const _ = require('lodash');
const { VARIABLE_EXACT_REGEX } = require('../constants/variable-regex');

/**
 * Traverse JOI schema and detect all the fields of the specific type (e.g. boolean, number, etc)
 * AND which may contain Codefresh variable.
 */
class JSONPathsGenerator {
    constructor({ fieldType, joiSchema, isConvertResultToCamelCase = false } = {}) {
        this._fieldType = fieldType;
        this._joiSchemaDescription = joiSchema.describe();
        this._isConvertResultToCamelCase = isConvertResultToCamelCase;

        this._singleTypeFields = [];
        this._multipleTypesFields = [];
    }

    getJSONPaths() {
        this._traverseSchema(this._joiSchemaDescription);
        return {
            singleTypeFields: this._singleTypeFields,
            multipleTypesFields: this._multipleTypesFields
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
                this._singleTypeFields.push(path);
            } else {
                const { alternatives } = joiSchemaPart;
                if (Array.isArray(alternatives)) {
                    const singleTypeFields = [];
                    const otherFields = [];

                    alternatives.forEach((option) => {
                        if (this._isExclusiveField(option)) {
                            singleTypeFields.push(option);
                        } else {
                            otherFields.push(option);
                        }
                    });

                    if (singleTypeFields.length && !otherFields.length) {
                        singleTypeFields.some(() => this._singleTypeFields.push(path));
                    } else {
                        singleTypeFields.some(() => this._multipleTypesFields.push(path));
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

        return (this._isTargetType(option1) && this._isCodefreshVariable(option2))
            || (this._isTargetType(option2) && this._isCodefreshVariable(option1));
    }

    _isTargetType(option) {
        return option.type === this._fieldType;
    }

    _isCodefreshVariable(option) {
        if (option.type !== 'string') {
            return false;
        }
        const rule = option.rules?.[0];
        return rule?.name === 'regex' && rule?.arg?.source === VARIABLE_EXACT_REGEX.source;
    }

    _adjustCase(str) {
        return this._isConvertResultToCamelCase ? _.camelCase(str) : str;
    }
}

module.exports = {
    JSONPathsGenerator,
};
