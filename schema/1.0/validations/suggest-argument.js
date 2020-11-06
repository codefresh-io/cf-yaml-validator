'use strict';

const _ = require('lodash');
const levenshtein = require('js-levenshtein');


const BaseArgument = require('./base-argument');
const { ErrorBuilder } = require('../error-builder');
const { docBaseUrl, DocumentationLinks } = require('../documentation-links');
const Validator = require('../../../validator');
const Freestyle = require('../steps/freestyle');


class SuggestArgumentValidation extends BaseArgument {

    static get lengthThreshold() {
        return 3;
    }
    static get distanceThreshold() {
        return 5;
    }


    static getName() {
        return 'image_name';
    }

    static validate(step, yaml, name, config = {}) {
        const warnings = [];
        const errors = [];

        const type = step.type || Freestyle.getType();
        const stepsSchemas = Validator.getJoiSchemas(config.version, config.options);
        const stepSchema = stepsSchemas[type];
        // if (!stepSchema) {
        //     console.log(`Warning: no schema found for step type '${type}'. Skipping validation`);
        //     continue; // eslint-disable-line no-continue
        // }

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
        const possibleProperties = this._getPossibleProperties(stepProperties, wrongKey);

        return _.first(this._sortByDistances(this._filterByDistanceThreshold(this._getDistancesMap(wrongKey, possibleProperties))));
    }


    static _getPossibleProperties(stepProperties, wrongKey) {
        return stepProperties.filter(property => Math.abs(property.length - wrongKey.length) < this.lengthThreshold);
    }


    static _filterByDistanceThreshold(propNameDistance) {
        return _.pickBy(propNameDistance, (value) => value <= this.distanceThreshold)
    }


    static _getDistancesMap(typoPropertyName, properties) {
        return properties.reduce((acc, prop) => {
            acc[prop] = levenshtein(prop, typoPropertyName);

            return acc;
        }, {});
    }


    static _sortByDistances(propNameDistance) {
        const props = _.keys(propNameDistance);
        props.sort((a, b) => propNameDistance[a] - propNameDistance[b]);

        return props;
    }


    static _processStepPropertyError(yaml, stepName, key, type, stepSchemeProperties) {
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
