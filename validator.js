/**
 * The actual Validation module.
 * Creates a Joi schema and tests the deserialized YAML descriptor
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi = require('joi');

const GIT_CLONE   = 'git-clone';
const BUILD       = 'build';
const PUSH        = 'push';
const COMPOSITION = 'composition';
const ALL_STEPS   = [GIT_CLONE, BUILD, PUSH, COMPOSITION];

class Validator {

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static _getCredentialsSchema() {
        return Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required()
        });
    }

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

    static _getCommonStepSchema() {
        return {
            'type':              Joi.string().valid(ALL_STEPS),
            'working-directory': Joi.string().when('type', { is: PUSH, then: Joi.forbidden() }),
            'description':       Joi.string(),
            'fail-fast':         Joi.boolean(),
            'credentials':       Validator._getCredentialsSchema()
                                     .when('type',
                                         { is: [GIT_CLONE, PUSH], otherwise: Joi.forbidden() }),
            'tag':               Joi.string()
                                     .when('type',
                                         { is: [BUILD, PUSH], otherwise: Joi.forbidden() }),
            'when':              Validator._getWhenSchema()
        };
    }

    static _stepExclusive(schema, stepTypes) {
        return schema.when('type', { is: stepTypes, otherwise: Joi.forbidden() });
    }

    static _getFreestyleStepSchema() {
        return {
            'image':       Validator._freestyleExclusive(Joi.string().required()),
            'commands':    Validator._freestyleExclusive(Joi.array().items(Joi.string())),
            'environment': Validator._freestyleExclusive(Joi.array().items(Joi.string())),
        };
    }

    static _freestyleExclusive(schema) {
        return schema.when('type', {
            is:   ALL_STEPS,
            then: Joi.forbidden()
        });
    }

    static _getGitCloneStepSchema() {
        return {
            'repo':     Validator._gitCloneExclusive(Joi.string().required()),
            'revision': Validator._gitCloneExclusive(Joi.string()),
        };
    }

    static _gitCloneExclusive(schema) {
        return Validator._stepExclusive(schema, GIT_CLONE);
    }

    static _getBuildStepSchema() {
        return {
            'dockerfile':      Validator._buildExclusive(Joi.string()),
            'image-name':      Validator._buildExclusive(Joi.string().required()),
            'build-arguments': Validator._buildExclusive(Joi.array().items(Joi.string())),
        };
    }

    static _buildExclusive(schema) {
        return Validator._stepExclusive(schema, BUILD);
    }

    static _getPushStepSchema() {
        return {
            'candidate': Validator._gitPushExclusive(Joi.string().required()),
            'registry':  Validator._gitPushExclusive(Joi.string()),
        };
    }

    static _gitPushExclusive(schema) {
        return Validator._stepExclusive(schema, PUSH);
    }

    static _getCompositionStepSchema() {
        return {
            'composition':            Validator._compositionExclusive(Joi.object().required()),
            'composition-candidates': Validator._compositionExclusive(Joi.object()),
            'composition-variables':  Validator._compositionExclusive(Joi.array()
                .items(Joi.string())),
        };
    }

    static _compositionExclusive(schema) {
        return Validator._stepExclusive(schema, COMPOSITION);
    }

    static _getStepSchema() {
        let stepSchema = Validator._getCommonStepSchema();

        const schemaExtensions = [Validator._getFreestyleStepSchema(),
            Validator._getGitCloneStepSchema(),
            Validator._getBuildStepSchema(),
            Validator._getPushStepSchema(),
            Validator._getCompositionStepSchema()
        ];

        schemaExtensions.forEach((schemaExtension) => {
            stepSchema = Object.assign(stepSchema, schemaExtension);
        });

        return Joi.object(stepSchema).required();
    }

    static _getRootSchema() {
        return Joi.object({
            version: Joi.number().positive().required(),
            steps:   Joi.object()
                         .pattern(/^[a-zA-Z0-9_]+$/, Validator._getStepSchema())
                         .required()
        });
    }

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    /**
     * Validates a model of the deserialized YAML
     *
     * @param objectModel Deserialized YAML
     * @throws An error containing the details of the validation failure
     */
    static validate(objectModel) {
        const schema           = Validator._getRootSchema();
        const schemaValidation = Joi.validate(objectModel, schema);

        if (schemaValidation.error) {
            throw schemaValidation.error;
        }
    }
}
// Exported objects/methods
module.exports = Validator;
