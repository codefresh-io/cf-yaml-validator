/**
 * Defines the "IntegrationTest step" schema, which is a step that is basic a simplified facade
 * for a composition step.
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class IntegrationTest extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'integration-test';
    }

    getSchema() {

        const preconfiguredServicesArray = Joi.array().items(
            Joi.string().valid([
                'mysql',
                'postgresql',
                'mariadb',
                'mongodb',
                'couchdb',
                'rabbitmq',
                // 'riak', // complex as fuck: https://hub.docker.com/r/basho/riak-kv/
                'memcached',
                'redis',
                'cassandra',
                'neo4j',
                'elasticsearch',
                'rethinkdb'
            ])
        );

        const environmentAsObject = Joi.object({})
            .pattern(/[_a-zA-Z][_a-zA-Z0-9]{1,30}/, Joi.string());
        const environmentAsArray = Joi.array().items(
            Joi.string().regex(/^[_a-zA-Z][_a-zA-Z0-9]{1,256}=.*/)
        );

        const serviceObject = Joi.object({
            image: Joi.string().required(),
            ports: Joi.array(
                Joi.number()
            ),
            environment: Joi.alternatives(
                environmentAsArray,
                environmentAsObject
            ),
        });

        const servicesObject = Joi.object({}).pattern(/.*/, serviceObject);

        const testObject = Joi.object({
            image: Joi.string().required(),
            commands: Joi.array().items(Joi.string().trim().min(1).required()).required(),
            working_directory: Joi.string(),
        }).required();

        const compositionProperties = {
            type: Joi.string().valid(IntegrationTest.getType()),
            services: servicesObject,
            preconfigured_services: preconfiguredServicesArray,
            test: testObject
        };
        return this._createSchema(compositionProperties).unknown();
    }

}
// Exported objects/methods
module.exports = IntegrationTest;
