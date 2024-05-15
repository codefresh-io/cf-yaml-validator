'use strict';

const { JSONPath } = require('jsonpath-plus');
const { VARIABLE_EXACT_REGEX } = require('../constants/variable-regex');

class Interpolator {
    constructor(JSONPaths) {
        this._JSONPaths = JSONPaths;
    }

    getFieldType() {
        throw new Error('Implement this');
    }

    convertValue(str) {
        throw new Error('Implement this');
    }

    _isCodefreshVariable(str) {
        return VARIABLE_EXACT_REGEX.test(str);
    }

    _getCodefreshVariableName(str) {
        return VARIABLE_EXACT_REGEX.exec(str)?.[1];
    }

    _updateField(searchResult, newValue) {
        searchResult.parent[searchResult.parentProperty] = newValue;
    }

    _substituteCodefreshVariable(searchResult, variables) {
        const varName = this._getCodefreshVariableName(searchResult.value);
        const varValue = variables[varName];

        if (varValue !== undefined) {
            let convertedValue;
            try {
                convertedValue = this.convertValue(varValue);
            } catch (e) {
                throw new Error(`Invalid value was provided for field '${searchResult.pointer}' from variable ${varName}='${varValue}'.`
                    + ` Expected value is ${this.getFieldType()}.`);
            }

            this._updateField(searchResult, convertedValue);
        }
    }

    _convertFieldInPlace(searchResult) {
        const { value } = searchResult;

        let convertedValue;
        try {
            convertedValue = this.convertValue(value);
        } catch (e) {
            throw new Error(`Invalid value '${value}' was set to field '${searchResult.pointer}'.`
                + ` Expected value is ${this.getFieldType()}.`);
        }

        this._updateField(searchResult, convertedValue);
    }

    _interpolate(yaml, JSONPathList, variables, isExclusive) {
        const clonedYaml = structuredClone(yaml);

        JSONPathList.forEach((path) => {
            const searchResults = JSONPath({ path, json: clonedYaml, resultType: 'all' });

            searchResults.forEach((searchResult) => {
                const { value } = searchResult;

                // eslint-disable-next-line valid-typeof
                if (typeof value === this.getFieldType() || value === undefined) {
                    return;
                }

                try {
                    if (typeof value === 'string' && this._isCodefreshVariable(value)) {
                        this._substituteCodefreshVariable(searchResult, variables);
                    } else {
                        this._convertFieldInPlace(searchResult);
                    }
                } catch (e) {
                    if (isExclusive) {
                        e.type = 'InterpolationError';
                        throw e;
                    }
                }
            });
        });

        return clonedYaml;
    }

    handleAllSteps(pipelineYaml, variables) {
        const clone = structuredClone(pipelineYaml);
        Object.entries(clone.steps).forEach(([stepName, stepValue]) => {
            clone.steps[stepName] = this.handleSingleStep(stepValue, variables);
        });
        return clone;
    }

    handleSingleStep(stepYaml, variables) {
        const type = stepYaml.type ?? 'freestyle';
        const stepJSONPaths = this._JSONPaths?.steps[type];
        if (!stepJSONPaths) {
            return stepYaml;
        }

        const { exclusiveFields, mixedFields } = stepJSONPaths;

        let resultant = this._interpolate(stepYaml, exclusiveFields, variables, true);
        resultant = this._interpolate(resultant, mixedFields, variables, false);

        return resultant;
    }
}

module.exports = { Interpolator };
