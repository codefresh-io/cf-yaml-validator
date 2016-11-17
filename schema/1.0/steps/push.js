/**
 * Defines the push step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class Push extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'push';
    }

    static getSchema() {
        const pushSchema = {
            type:        Joi.string().valid(Push.getType()),
            candidate:   Joi.string().required(),
            registry:    Joi.string(),
            credentials: BaseSchema._getCredentialsSchema(),
            tag:         Joi.string()
        };
        return Object.assign(pushSchema, BaseSchema._commonSchema());
    }
}
// Exported objects/methods
module.exports = Push;