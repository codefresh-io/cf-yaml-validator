'use strict';

const { BooleanInterpolator } = require('./boolean.interpolator');

class InterpolatorFactory {
    static getInstance(fieldType, isCamelCase, allJSONPaths) {
        const JSONPathsWithCase = !isCamelCase ? allJSONPaths.JSONPaths : allJSONPaths.JSONPathsCamelCased;
        const JSONPaths = JSONPathsWithCase?.[fieldType];

        if (!JSONPaths) {
            throw new Error(`'${fieldType}' field type is not supported by interpolator.`);
        }

        if (fieldType === 'boolean') {
            return new BooleanInterpolator(JSONPaths);
        } else {
            throw new Error(`'${fieldType}' field type is not supported by interpolator.`);
        }
    }
}

module.exports = { InterpolatorFactory };
