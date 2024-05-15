'use strict';

const { Interpolator } = require('./interpolator');

class BooleanInterpolator extends Interpolator {
    getFieldType() {
        return 'boolean';
    }

    convertValue(str) {
        if (typeof str !== 'string') {
            throw new Error(`'${str}' is not a string.`);
        }

        if (str.toLowerCase() === 'true') {
            return true;
        }

        if (str.toLowerCase() === 'false') {
            return false;
        }

        throw new Error(`the provided string '${str}' cannot be converted to boolean.`);
    }
}

module.exports = {
    BooleanInterpolator,
};
