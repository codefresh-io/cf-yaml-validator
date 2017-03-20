/**
 * Defines the "Travis step" schema, which is a step that is basic a facade for a simplified
 * composition step.
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class Travis extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'travis';
    }

    getSchema() {

        const serviceObject = Joi.object({
            image: Joi.string().required(),
            ports: Joi.array(
                Joi.number()
            ),
            environment: Joi.object({}).pattern(/[_a-zA-Z][_a-zA-Z0-9]{0,30}/, Joi.string())
        });

        let compositionProperties = {
            type: Joi.string().valid(Travis.getType()),
            services:
                Joi.object({}).pattern(/.*/, serviceObject).required(),
            test: Joi.object({
                image: Joi.string().required(),
                command: Joi.string().required(),
            }).required(),
        };
        return this._createSchema(compositionProperties).unknown();
    }

}
// Exported objects/methods
module.exports = Travis;