'use strict';

const Joi = require('joi');
const BaseSchema = require('./base-schema');

class RootSchema {
    static getSchema() {
        return Joi.object({
            version: Joi.number().positive().required(),
            steps: Joi.object().pattern(/^.+$/, Joi.object()).required(),
            stages: Joi.array().items(Joi.string()),
            mode: Joi.string().valid('sequential', 'parallel'),
            hooks: BaseSchema._getBaseHooksSchema(),
            fail_fast: [Joi.object(), Joi.string(), BaseSchema.getBooleanSchema()],
            strict_fail_fast: BaseSchema.getBooleanSchema({ strictBoolean: true }).optional(),
            success_criteria: BaseSchema.getSuccessCriteriaSchema(),
            indicators: Joi.array(),
            services: Joi.object(),
            build_version: Joi.string().valid('v1', 'v2'),
        });
    }
}

module.exports = { RootSchema };
