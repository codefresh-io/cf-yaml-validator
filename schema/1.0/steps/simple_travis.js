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
        return 'simple_travis';
    }

    getSchema() {

        const testObject = Joi.object({
            image: Joi.string().required(),
            command: Joi.string().required(),
            working_directory: Joi.string(),
        }).required();

        const servicesArray = Joi.array().items(
            Joi.string().valid(
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
            )
        ).required();

        const compositionProperties = {
            type: Joi.string().valid(Travis.getType()),
            services: servicesArray,
            test: testObject
        };
        return this._createSchema(compositionProperties).unknown();
    }

}
// Exported objects/methods
module.exports = Travis;
