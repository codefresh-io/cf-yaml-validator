/**
 * Defines the freestyle step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class Freestyle extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'freestyle';
    }

    getSchema() {
        let freestyleProperties = {
            working_directory: Joi.string(),
            image:             Joi.string().required(),
            commands:          Joi.array().items(Joi.string()),
            cmd:               Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
            binds:             Joi.array().items(Joi.string().regex(/\:/)),
            environment:       Joi.array().items(Joi.string()),
            entry_point:       Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string()))
        };
        return this._createSchema(freestyleProperties).
            without('commands','cmd'). //make sure cmd and commands are mutually exclusive AND optional
            unknown();
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true });
    }
}
// Exported objects/methods
module.exports = Freestyle;
