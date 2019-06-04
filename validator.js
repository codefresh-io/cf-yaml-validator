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
    static validate(objectModel, outputFormat, yaml) {
        const defaultVersion = '1.0';
        let modelVersion = (objectModel.version === '1' || objectModel.version === 1) ? '1.0' : objectModel.version.toString();
        if (!modelVersion) {
            modelVersion = defaultVersion;
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

        return VersionedValidator(objectModel, outputFormat, yaml);
    }
}
// Exported objects/methods
module.exports = Validator.validate;
