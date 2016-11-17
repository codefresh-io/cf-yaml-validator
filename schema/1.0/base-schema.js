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

    static _commonSchema() {
        return {
            'description': Joi.string(),
            'fail-fast':   Joi.boolean(),
            'when':        BaseSchema._getWhenSchema()
        };
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

    static getSchema() {
        throw new Error('Implement this');
    }
}
// Exported objects/methods
module.exports = BaseSchema;