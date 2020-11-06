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


    static suggest(schema, argument) {
        if (!schema) return;
        
        const stepSchemeProperties = this._getStepSchemeProperties(schema);

        return this._getNearestMatchingProperty(stepSchemeProperties, argument);
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
        return _.pickBy(propNameDistance, value => value <= this.distanceThreshold);
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
}


module.exports = SuggestArgumentValidation;
