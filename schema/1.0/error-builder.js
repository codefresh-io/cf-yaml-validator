'use strict';

const _ = require('lodash');

const ErrorType = {
    Warning: 'Warning',
    Error: 'Error'
};

class ErrorBuilder {

    static getErrorLineNumber({ yaml, stepName, key }) {
        if (!yaml) {
            return;
        }
        const requireStepValidation = !!stepName;
        const requireKeyValidation = !!key;
        let errorLine = 0;
        if (!requireStepValidation && !requireStepValidation) {
            return errorLine; // eslint-disable-line
        }
        let stepFound = false;
        const stepNameRegex = new RegExp(`${stepName}:`, 'g');
        const keyRegex = new RegExp(`${key}:`, 'g');
        const yamlArray = yaml.split('\n');

        _.forEach(yamlArray, (line, number) => { // eslint-disable-line
            if (requireStepValidation && stepNameRegex.exec(line)) {
                errorLine = number + 1;
                if (!requireKeyValidation) {
                    return false;
                }
                stepFound = true;
            }
            if ((!requireStepValidation || stepFound) && keyRegex.exec(line)) {
                errorLine = number + 1;
                return false;
            }
        });
        return errorLine; // eslint-disable-line
    }

    static buildError({
        message, name, yaml, type, code, docsLink, errorPath,  key, actionItems
    }) {
        const error = new Error();
        error.name = 'ValidationError';
        error.isJoi = true;
        error.details = [
            {
                message,
                type,
                path: errorPath,
                context: {
                    key,
                },
                level: 'workflow',
                code,
                stepName: name,
                docsLink,
                lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName: name, key }),
                actionItems
            },
        ];
        return error;
    }

    static buildJoiError({ message, path }) {
        const error = new Error();
        error.name = 'ValidationError';
        error.details = [
            {
                message,
                path
            },
        ];
        return error;
    }
}

module.exports = { ErrorType, ErrorBuilder };
