/**
 * The common step schema. Provides the mandatory definitions every step must contain and a few
 * helper methods for other common parts of the schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi = require('joi');

class BaseSchema {

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static _getWhenSchema() {
        return Joi.object({
            branch:    Joi.object({
                ignore: Joi.array().items(Joi.string()),
                only:   Joi.array().items(Joi.string())
            }),
            condition: Joi.object({
                all: Joi.object().pattern(/^[a-zA-Z0-9_]+$/, Joi.string()),
                any: Joi.object().pattern(/^[a-zA-Z0-9_]+$/, Joi.string())
            })
        });
    }

    _applyCommonSchemaProperties(schemaProperties) {
        return Object.assign(schemaProperties, {
            'description': Joi.string(),
            'title':       Joi.string(),
            'fail_fast':   Joi.boolean(),
            'when':        BaseSchema._getWhenSchema()
        });
    }

    _applyCommonCompatibility(schema) {
        return schema.rename('fail-fast', 'fail_fast', { ignoreUndefined: true });
    }

    _applyStepCompatibility(schema) {
        return schema;
    }

    _createSchema(stepProperties) {
        stepProperties = this._applyCommonSchemaProperties(stepProperties);
        let stepSchema = Joi.object(stepProperties);
        stepSchema     = this._applyCommonCompatibility(stepSchema);
        return this._applyStepCompatibility(stepSchema);
    }

    static _getCredentialsSchema() {
        return Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required()
        });
    }

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        throw new Error('Implement this');
    }

    getSchema() {
        throw new Error('Implement this');
    }
}
// Exported objects/methods
module.exports = BaseSchema;