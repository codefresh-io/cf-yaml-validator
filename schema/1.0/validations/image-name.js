'use strict';

const _ = require('lodash');

const BaseSchema = require('../base-schema');
const BaseArgument = require('./base-argument');
const { ErrorType, ErrorBuilder } = require('../error-builder');
const { docBaseUrl, DocumentationLinks } = require('../documentation-links');

class ImageNameValidation extends BaseArgument {
    static getName() {
        return 'image_name';
    }

    static validate(step, yaml, name) {
        const imageName = BaseSchema._getFieldFromStep(step, this.getName());
        const warnings = [];
        const errors = [];

        if (imageName && !this._isLoweCaseValue(imageName)) {
            const error = new Error();
            error.name = 'ValidationError';
            error.isJoi = true;
            error.details = [{
                message: `"${this.getName()}" should be in lowercase.`,
                name,
                yaml,
                type: ErrorType.Warning,
                docsLink: _.get(DocumentationLinks, step.type, docBaseUrl),
                path: this.getName(),
                lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName: this.getName() }),
                suggestion: {
                    from: imageName,
                    to: imageName.toLowerCase(),
                },
            }];
            warnings.push(error);
        }

        return {
            errors,
            warnings
        };
    }

    static _isLoweCaseValue(str) {
        const withoutVars = str.replace(/\${{.*}}/, '');  //  remove CF vars
        return withoutVars.toLowerCase() === withoutVars;
    }

    static _isMissingAccountName(step) {
        const imageName = BaseSchema._getFieldFromStep(step, 'image_name');
        const pattern = /^[^/\s]+\/[^/\s]\S*$/gi;

        return _.isString(imageName) && !pattern.test(imageName);
    }
}

module.exports = ImageNameValidation;
