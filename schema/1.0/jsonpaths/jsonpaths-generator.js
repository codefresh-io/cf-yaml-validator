const Validator = require('../validator');
const { CommonJSONPathsGenerator } = require('./common.jsonpaths-generator');

class JSONPathsGenerator {
    constructor(fieldTypes, stepsJoiSchemas, isCamelCase) {
        this._fieldTypes = fieldTypes;
        this._stepsJoiSchemas = stepsJoiSchemas;
        this._isCamelCase = isCamelCase;
    }

    getJSONPaths = (isCamelCase) => this._fieldTypes.reduce((acc, fieldType) => {
        acc[fieldType] = this._getJSONPathsForType(fieldType);
        return acc;
    }, {});

    _getJSONPathsForType = (fieldType) => ({
        steps: this._getJSONPathsForAllSteps(fieldType),
    });

    _getJSONPathsForAllSteps = (fieldType) => Object.fromEntries(
        Object.entries(this._stepsJoiSchemas)
            .map(([stepName, joiSchema]) => [stepName, joiSchema.describe()])
            .map(([stepName, joiSchemaDescription]) => [
                stepName,
                new CommonJSONPathsGenerator( {
                    fieldType,
                    joiSchemaDescription,
                    isCamelCase: this._isCamelCase,
                }).getJSONPaths()
            ])
    );
}

module.exports = {
    JSONPathsGenerator,
}
