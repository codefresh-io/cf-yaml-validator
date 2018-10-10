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

    constructor(objectModel = {}){
        this._objectModel = objectModel;
    }

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static getConditionSchema(){
        return Joi.object({
            all: Joi.object().pattern(/^[a-zA-Z0-9_]+$/, Joi.string()),
            any: Joi.object().pattern(/^[a-zA-Z0-9_]+$/, Joi.string())
        });
    }

    static _getWhenSchema() {


        const stepSchema = Joi.object().keys({
            name: Joi.string().required(),
            on: Joi.array().items(
                    Joi.string()
                    .valid([
                        'success',
                        'running',
                        'failure',
                        'skipped',
                        'pending',
                        'terminating',
                        'terminated',
                        'finished'
                    ]))
                .min(1)
        });
        
        return Joi.object({
            branch:    Joi.object({
                ignore: Joi.array().items(Joi.string()),
                only:   Joi.array().items(Joi.string())
            }),
            condition: BaseSchema.getConditionSchema(),
            steps: [
                Joi.object().keys({
                    all: Joi.array().items(stepSchema).min(1),
                    any: Joi.array().items(stepSchema).min(1)
                })
                .xor('all', 'any'), 
                Joi.array().min(1).items(stepSchema)
            ]
        });
    }

    _applyCommonSchemaProperties(schemaProperties) {
        return Object.assign(schemaProperties, {
            'description':    Joi.string(),
            'title':          Joi.string(),
            'fail_fast':      Joi.boolean(),
            'docker_machine': Joi.alternatives().try(
                [
                    Joi.object({
                        create: Joi.object({
                            provider: Joi.string()
                        })
                    }),
                    Joi.object({
                        use: Joi.object({
                            node: Joi.string()
                        })
                    })
                ]
            ),
            'when':           BaseSchema._getWhenSchema(),
            stage:            Joi.string().valid(...(this._objectModel.stages || [])).optional(),
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
        stepProperties = this._applyMetadataAnnotationSchemaProperties(stepProperties);
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

    static _getMetadataAnnotationSetSchema() {
        return Joi.array().items(
            Joi.alternatives().try(
                Joi.object().pattern(/^[A-Za-z0-9_]+$/, Joi.alternatives().try(
                    [
                        Joi.string(),
                        Joi.boolean(),
                        Joi.number(),
                        Joi.object({ evaluate: Joi.string().required() })
                    ]
                )), Joi.string().regex(/^[A-Za-z0-9_]+$/)
            )
        );
    }

    _applyMetadataAnnotationSchemaProperties(schemaProperties) {
        const metadataAnnotationSchema = Joi.object({
            metadata: Joi.object({
                set: Joi.array().items(
                    Joi.object().pattern(/^.+$/, BaseSchema._getMetadataAnnotationSetSchema())
                )
            })
        });
        return Object.assign(schemaProperties, {
            'on_success': metadataAnnotationSchema,
            'on_fail':    metadataAnnotationSchema,
            'on_finish':  metadataAnnotationSchema,
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
    
    static getSuccessCriteriaSchema(){

        const stepsSchema = Joi.array().items(Joi.string()).min(1);

        return Joi.object({
            steps: [
                Joi.object().keys({
                    ignore: stepsSchema,
                    only: stepsSchema
                }),
                Joi.array().items(Joi.string())
            ],
            condition: BaseSchema.getConditionSchema(),
        });
    }
}
// Exported objects/methods
module.exports = BaseSchema;