'use strict';

const _ = require('lodash');
const levenshtein = require('js-levenshtein');


const BaseSchema = require('./../base-schema');
const BaseArgument = require('./base-argument');
const { ErrorType, ErrorBuilder } = require('./../error-builder');
const { docBaseUrl, DocumentationLinks } = require('./../documentation-links');
const Validator = require('../validator');


class SuggestArgumentValidation extends BaseArgument {
    static getName() {
        return 'image_name';
    }

    static validate(step, yaml, name) {
        const warnings = [];
        const errors = [];

        const type = step.type || Freestyle.getType();
        const stepsSchemas = Validator.getJsonSchemas();
        const stepSchema = stepsSchemas[type];
        if (!stepSchema) {
            console.log(`Warning: no schema found for step type '${type}'. Skipping validation`);
            continue; // eslint-disable-line no-continue
        }

        const stepSchemeProperties = this._getStepSchemeProperties(stepSchema);

        _.forEach(_.keys(step), (key) => {
            if (!stepSchemeProperties.includes(key)) {
                const result = this._processStepPropertyError(yaml, name, key, type, stepSchemeProperties);
                warnings.push(...result.warnings);
                errors.push(...result.errors);
            }
        });

        return {
            errors,
            warnings
        };
    }





    static _getStepSchemeProperties(stepSchema) {
        const { children } = stepSchema.describe();
        const renames = _.get(stepSchema, '_inner.renames', []).map(({ from }) => from);

        return _.keys(children).concat(renames);
    }


    static _getNearestMatchingProperty(stepProperties, wrongKey) {
        const threshold = this._getThreshold(wrongKey);
        const possibleProperties = stepProperties.filter(property => Math.abs(property.length - wrongKey.length) < threshold);
        this._sortByDistances(wrongKey, possibleProperties);

        return possibleProperties[0];
    }


    static _getThreshold(propertyName) {
        return propertyName.length < 5 ? 3 : 5;
    }


    static _sortByDistances(typoPropertyName, properties) {
        const propNameDistance = {};

        properties.sort((a, b) => {
            if (!_.has(propNameDistance, a)) {
                propNameDistance[a] = levenshtein(a, typoPropertyName);
            }
            if (!_.has(propNameDistance, b)) {
                propNameDistance[b] = levenshtein(b, typoPropertyName);
            }

            return propNameDistance[a] - propNameDistance[b];
        });
    }


    static _processStepPropertyError(yaml, stepName, key, type, stepSchemeProperties, outputFormat) {
        const nearestValue = this._getNearestMatchingProperty(stepSchemeProperties, key);
        const errors = [];
        const warnings = [];

        if (nearestValue) {
            const error = new Error();
            error.name = 'ValidationError';
            error.isJoi = true;
            error.details = [
                {
                    message: `"${key}" is not allowed. Did you mean "${nearestValue}"?`,
                    type: 'Validation',
                    path: nearestValue,
                    context: {
                        key: nearestValue,
                    },
                    level: 'step',
                    stepName,
                    docsLink: _.get(DocumentationLinks, `${type}`, docBaseUrl),
                    actionItems: 'Please make sure you have all the valid values',
                    lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName, key }),
                },
            ];

            warnings.push(error);
        }

        // if (nearestValue === 'type') {
        //     // Throw an error because when type is not defined it should not pass other validation
        //     Validator._throwValidationErrorAccordingToFormatWithWarnings(outputFormat);
        // }

        return { errors, warnings };
    }
}


module.exports = SuggestArgumentValidation;
