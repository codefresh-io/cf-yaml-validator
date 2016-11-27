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
    static validate(objectModel) {
        const defaultVersion = '1.0';

        let modelVersion = objectModel.version;
        if (!modelVersion) {
            modelVersion = defaultVersion;
        }

        const validatorPath = path.join(__dirname, 'schema', modelVersion, 'validator');
        if (!fs.existsSync(`${validatorPath}.js`)) {
            throw new Error(`Unable to find a validator for schema version ${modelVersion}`);
        }
        const VersionedValidator = require(validatorPath);
        if (!VersionedValidator) {
            throw new Error(`Unable to find a validator for schema version ${modelVersion}`);
        }

        return VersionedValidator(objectModel);
    }
}
// Exported objects/methods
module.exports = Validator.validate;
