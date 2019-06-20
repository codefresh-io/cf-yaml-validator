/**
 * The common step schema. Provides the mandatory definitions every step must contain and a few
 * helper methods for other common parts of the schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi = require('joi');
const convert = require('joi-to-json-schema');

class BaseSchema {

    constructor(objectModel = {}) {
        this._objectModel = objectModel;
    }

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static getConditionSchema() {
        return Joi.object({
            all: Joi.object().pattern(/^[a-zA-Z0-9_]+$/, Joi.string()),
            any: Joi.object().pattern(/^[a-zA-Z0-9_]+$/, Joi.string())
        });
    }

    static _getRetrySchema() {
        return Joi.object({
            exponentialFactor: Joi.number().default(1).positive().not(0),
            delay: Joi.number().default(5).positive().not(0),
            maxAttempts: Joi.number().default(1).positive().not(0),
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
                        'finished',
                        'approved',
                        'denied',
                    ])
            )
                .min(1)
        });

        return Joi.object({
            branch: Joi.object({
                ignore: Joi.array().items(Joi.string()),
                only: Joi.array().items(Joi.string())
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
            'description': Joi.string(),
            'title': Joi.string(),
            'fail_fast': Joi.boolean(),
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
            'arguments': Joi.object(),
            'when': BaseSchema._getWhenSchema(),
            'stage': Joi.string().valid(...(this._objectModel.stages || [])).optional(),
            'retry': BaseSchema._getRetrySchema(),
            'timeout': Joi.number().positive(),
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

    static _getAnnotationObjAlternative() {
        return Joi.object().pattern(/^[A-Za-z0-9_]+$/, Joi.alternatives().try(
            [
                Joi.string(),
                Joi.boolean(),
                Joi.number(),
                Joi.object({ evaluate: Joi.string().required() })
            ]
        ));
    }

    static _getAnnotationStrAlternative() {
        return Joi.string().regex(/^[A-Za-z0-9_]+$/);
    }

    static _getAnnotationExtObjSetAlternative() {
        return Joi.object({
            entity_id: Joi.string(),
            entity_type: Joi.string(),
            annotations: BaseSchema._getAnnotationSetSchema(),
        });
    }

    static _getAnnotationSetSchema() {
        return Joi.array().items(
            Joi.alternatives().try(
                BaseSchema._getAnnotationObjAlternative(),
                BaseSchema._getAnnotationStrAlternative(),
            )
        ).required();
    }

    static _getAnnotationExtObjUnsetAlternative() {
        return Joi.object({
            entity_id: Joi.string(),
            entity_type: Joi.string(),
            annotations: BaseSchema._getMetadataAnnotationUnsetSchema(),
        });
    }

    static _getMetadataAnnotationUnsetSchema() {
        return Joi.array().items(
            BaseSchema._getAnnotationStrAlternative()
        ).required();
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

    static _getAnnotationsSchema() {
        return Joi.object({
            set: Joi.array().items(
                BaseSchema._getAnnotationExtObjSetAlternative(),
            ),
            unset: Joi.array().items(
                BaseSchema._getAnnotationExtObjUnsetAlternative(),
            ),
        });
    }

    static _getSecretsSchema() {
        return Joi.alternatives()
            .try(
                Joi.array()
                    .items(BaseSchema._getSecretsObjectSchema())
                    .min(1),
                Joi.array()
                    .items(Joi.string())
                    .min(1),
            );
    }

    static _getSecretsObjectSchema() {
        return Joi.object({
            id: Joi.string()
                .when('target', {
                    is: Joi.exist(),
                    otherwise: Joi.required(),
                }),
            src: Joi.string().required(),
            target: Joi.string(),
        });
    }

    static _getSshSchema() {
        return Joi.alternatives()
            .try(
                Joi.string()
                    .valid('default'),
                Joi.array()
                    .items(Joi.string())
                    .min(1),
                Joi.object()
                    .min(1)
                    .pattern(/.+/, Joi.string()),
            );
    }

    _applyMetadataAnnotationSchemaProperties(schemaProperties) {
        const metadataAnnotationSchema = Joi.object({
            metadata: Joi.object({
                set: Joi.array().items(
                    Joi.object().pattern(/^.+$/, BaseSchema._getMetadataAnnotationSetSchema())
                )
            }),
            annotations: BaseSchema._getAnnotationsSchema(),
        });
        return Object.assign(schemaProperties, {
            'on_success': metadataAnnotationSchema,
            'on_fail': metadataAnnotationSchema,
            'on_finish': metadataAnnotationSchema,
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

    getJsonSchema() {
        return convert(this.getSchema());
    }

    static getSuccessCriteriaSchema() {

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
