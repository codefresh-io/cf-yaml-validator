/**
 * Defines the "Travis step" schema, which is a step that is basic a facade for a simplified
 * composition step.
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('../base-schema');

class Travis extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'travis';
    }

    getSchema() {

        const environmentAsObject = Joi.object({})
            .pattern(/[_a-zA-Z][_a-zA-Z0-9]{1,30}/, Joi.string());
        const environmentAsArray = Joi.array().items(
            Joi.string().regex(/^[_a-zA-Z][_a-zA-Z0-9]{1,256}=.*/)
        );

        const serviceObject = Joi.object({
            image: Joi.string().required(),
            ports: Joi.array().items(Joi.number()),
            environment: Joi.alternatives(
                environmentAsArray,
                environmentAsObject
            ),
        });

        const testObject = Joi.object({
            image: Joi.string().required(),
            command: Joi.string().required(),
            working_directory: Joi.string(),
        }).required();

        const servicesObject = Joi.object({}).pattern(/.*/, serviceObject).required();

        const compositionProperties = {
            type: Joi.string().valid(Travis.getType()),
            services: servicesObject,
            test: testObject
        };
        return this._createSchema(compositionProperties).unknown();
    }

}
// Exported objects/methods
module.exports = Travis;
