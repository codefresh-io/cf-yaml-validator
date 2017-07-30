/**
 * Defines the deploy step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class Deploy extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'deploy';
    }

    getSchema() {
        let deployProperties = {
            type: Joi.string().valid(Deploy.getType()),
            kind: Joi.string().required(),
            cluster: Joi.string().required(),
            namespace: Joi.string().required(),
            service: Joi.string().required(),
            candidate: Joi.object({
                image: Joi.string().required(),
                registry: Joi.string().required()
            })
        };
        return this._createSchema(deployProperties).unknown();
    }

}
// Exported objects/methods
module.exports = Deploy;
