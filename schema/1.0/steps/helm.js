'use strict';

const _ = require('lodash');
const Joi        = require('joi');
const BaseSchema = require('./../base-schema');
const { ErrorType, ErrorBuilder } = require('./../error-builder');
const { IntegrationLinks } = require('./../documentation-links');

class Helm extends BaseSchema {

    static getType() {
        return 'helm';
    }

    getSchema() {
        const HelmProperties = {
            'type': Joi.string().valid(Helm.getType()),
            'working_directory': Joi.string(),
        };
        return this._createSchema(HelmProperties)
            .unknown();
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true });
    }

    static validateStep(step, yaml, name, context, { ignoreValidation }) {
        const warnings = [];

        const helmVersion = _.get(step, 'arguments.helm_version', '2.0.0');
        if (!ignoreValidation && helmVersion.startsWith('2')) {
            warnings.push(ErrorBuilder.buildError({
                message: `You are using HELM version 2 which will be deprecated on July 16 2021 and will no longer be able to run.`,
                name,
                yaml,
                code: 601,
                type: ErrorType.Warning,
                docsLink: _.get(IntegrationLinks, 'helm'),
                errorPath: 'helm',
                key: 'helm_version',
                actionItems: 'Please view our documentation for more details.',
            }));
        }

        return { errors: [], warnings };
    }
}


module.exports = Helm;
