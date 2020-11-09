'use strict';

const _ = require('lodash');
const levenshtein = require('js-levenshtein');


class SuggestArgumentValidation {

    static get lengthThreshold() {
        return 3;
    }


    static get distanceThreshold() {
        return 5;
    }


    static suggest(schema, argument, path) {
        if (!schema) return null;

        const stepSchemeProperties = this._getStepSchemeProperties(schema, path);

        return this._getNearestMatchingProperty(stepSchemeProperties, argument);
    }


    static _getStepSchemeProperties(stepSchema, path) {
        const { children } = stepSchema.describe();

        if (path.length) {
            const pathString = `${path.join('.children.')}.children`;

            return _.keys(_.get(children, pathString, []));
        }

        return _.keys(children);
    }


    static _getNearestMatchingProperty(stepProperties, wrongKey) {
        const propertiesStartedFromKey = stepProperties.filter(prop => prop.startsWith(wrongKey));
        if (propertiesStartedFromKey.length) {
            return _.first(propertiesStartedFromKey.sort((a, b) => a.length - b.length));
        }

        const possibleProperties = this._getPossibleProperties(stepProperties, wrongKey);

        return _.first(this._sortByDistances(this._filterByDistanceThreshold(this._getDistancesMap(wrongKey, possibleProperties))));
    }


    static _getPossibleProperties(stepProperties, wrongKey) {
        return stepProperties.filter(property => Math.abs(property.length - wrongKey.length) < this.lengthThreshold);
    }


    static _filterByDistanceThreshold(propNameDistance) {
        return _.pickBy(propNameDistance, value => value < this.distanceThreshold);
    }


    static _getDistancesMap(typoPropertyName, properties) {
        return properties.reduce((acc, prop) => {
            acc[prop] = levenshtein(prop, typoPropertyName);

            return acc;
        }, {});
    }


    static _sortByDistances(propNameDistance) {
        return _.keys(propNameDistance).sort((a, b) => propNameDistance[a] - propNameDistance[b]);
    }
}


module.exports = SuggestArgumentValidation;
