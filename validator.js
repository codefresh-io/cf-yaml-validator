/**
 * The Validation entry point.
 * Determines which version of the schema is being validated and chooses an implementation accordingly
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const fs   = require('fs');
const path = require('path');
const _ = require('lodash');
const ValidatorError = require('./validator-error');

class Validator {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    /**
     * Validates a model of the deserialized YAML
     *
     * @param objectModel Deserialized YAML
     * @throws An error containing the details of the validation failure
     */
    static validate(objectModel, outputFormat, yaml, opts) {
        const version = _.get(objectModel, 'version');
        return Validator._getValidator(version).validate(objectModel, outputFormat, yaml, opts);
    }

    static validateWithContext(objectModel, outputFormat, yaml, context, opts) {
        const version = _.get(objectModel, 'version');
        return Validator._getValidator(version).validateWithContext(objectModel, outputFormat, yaml, context, opts);
    }

    static getJsonSchemas(version) {
        return Validator._getValidator(version).getJsonSchemas();
    }

    static getRootJoiSchema(version) {
        return Validator._getValidator(version).getRootJoiSchema();
    }

    static getStepsJoiSchemas(version) {
        return Validator._getValidator(version).getStepsJoiSchemas();
    }

    static generateJSONPaths(version, { fieldType, joiSchema, convertToCamelCase }) {
        return Validator._getValidator(version).generateJSONPaths({ fieldType, joiSchema, convertToCamelCase });
    }


    /**
     * Get a regex for Codefresh variable such as: '${{VARIABLE_NAME}}'
     *
     * @param {string} version validator's version
     * @param {object} opts options
     * @param {boolean} [opts.isExact] return a regex which matches not only part of the string but mathes the whole string entirely
     */
    static getVariableRegex(version, opts) {
        return Validator._getValidator(version).getVariableRegex(opts);
    }

    static _getValidator(version) {
        const defaultVersion = '1.0';
        let modelVersion = (version === '1' || version === 1) ? '1.0' : version;
        if (!modelVersion) {
            modelVersion = defaultVersion;
        } else {
            modelVersion = modelVersion.toString();
        }

        const validatorPath = path.join(__dirname, 'schema', modelVersion, 'validator');
        if (!fs.existsSync(`${validatorPath}.js`)) {
            const message = `Current version: ${modelVersion} is invalid. please change version to 1.0`;
            const error = new Error(message);
            error.name = 'ValidationError';
            error.isJoi = true;
            error.details = [
                {
                    message,
                    type: 'Validation',
                    context: {
                        key: 'version',
                    },
                    level: 'workflow',
                    docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                    actionItems: `Please change the version to valid one`,
                    lines: 0,
                },
            ];
            throw new ValidatorError(error);
        }
        const VersionedValidator = require(validatorPath); // eslint-disable-line
        if (!VersionedValidator) {
            throw new Error(`Unable to find a validator for schema version ${modelVersion}`);
        }

        return VersionedValidator;
    }
}
// Exported objects/methods
module.exports = Validator;
