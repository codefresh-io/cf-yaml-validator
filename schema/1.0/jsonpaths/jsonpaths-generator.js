'use strict';

const { CommonJSONPathsGenerator } = require('./common.jsonpaths-generator');
const { CONVERTED_FIELD_TYPES } = require('../constants/converted-field-types');

class JSONPathsGenerator {
    constructor(fieldTypes, stepsJoiSchemas, isCamelCase) {
        this._fieldTypes = fieldTypes;
        this._stepsJoiSchemas = stepsJoiSchemas;
        this._isCamelCase = isCamelCase;
    }

    _getJSONPaths() {
        return this._fieldTypes.reduce((acc, fieldType) => {
            acc[fieldType] = this._getJSONPathsForType(fieldType);
            return acc;
        }, {});
    }

    _getJSONPathsForType(fieldType) {
        return {
            steps: this._getJSONPathsForAllSteps(fieldType),
        };
    }

    _getJSONPathsForAllSteps(fieldType) {
        return Object.fromEntries(
            Object.entries(this._stepsJoiSchemas)
                .map(([stepName, joiSchema]) => [stepName, joiSchema.describe()])
                .map(([stepName, joiSchemaDescription]) => [
                    stepName,
                    new CommonJSONPathsGenerator({
                        fieldType,
                        joiSchemaDescription,
                        isCamelCase: this._isCamelCase,
                    }).getJSONPaths()
                ])
        );
    }

    static getJSONPaths(stepsJoiSchemas)  {
        if (!this._jsonPaths) {
            this._jsonPaths = {
                JSONPaths: new JSONPathsGenerator(CONVERTED_FIELD_TYPES, stepsJoiSchemas, false)._getJSONPaths(),
                JSONPathsCamelCased: new JSONPathsGenerator(CONVERTED_FIELD_TYPES, stepsJoiSchemas, true)._getJSONPaths(),
            };
        }

        return this._jsonPaths;
    }
}

module.exports = {
    JSONPathsGenerator,
};
