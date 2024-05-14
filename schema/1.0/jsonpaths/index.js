'use strict';

const { JSONPathsGenerator } = require('./jsonpaths-generator');
const { CONVERTED_FIELD_TYPES } = require('../constants/converted-field-types');

class JSONPaths {
    static getJSONPaths = (stepsJoiSchemas) => {
        if(!this._jsonPaths) {
            this._jsonPaths = {
                JSONPaths: new JSONPathsGenerator(CONVERTED_FIELD_TYPES, stepsJoiSchemas, false).getJSONPaths(),
                JSONPathsCamelCased: new JSONPathsGenerator(CONVERTED_FIELD_TYPES, stepsJoiSchemas, true).getJSONPaths(),
            }
        }

        return this._jsonPaths;
    }
}

module.exports = {
    getJSONPaths: JSONPaths.getJSONPaths,
};
