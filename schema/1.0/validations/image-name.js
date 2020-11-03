'use strict';

const _ = require('lodash');


const BaseSchema = require('./../base-schema');
const BaseArgument = require('./base-argument');
const { ErrorType, ErrorBuilder } = require('./../error-builder');
const { docBaseUrl, DocumentationLinks } = require('./../documentation-links');


class ImageNameValidation extends BaseArgument {
    static getName() {
        return 'image_name';
    }

    static validate(step, yaml, name) {
        const warnings = [];
        const errors = [];

        if (this._isMissingAccountName(step)) {
            const error = new Error();
            error.name = 'ValidationError';
            error.isJoi = true;
            error.details = [
                {
                    message: `"${this.getName()}" format should be [account_name]/[image_name] on step: ${name}`,
                    name,
                    yaml,
                    type: ErrorType.Warning,
                    docsLink: _.get(DocumentationLinks, step.type, docBaseUrl),
                    errorPath: this.getName(),
                    lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName: this.getName() })
                }
            ];
            warnings.push(error);
        }

        return {
            errors,
            warnings
        };
    }


    static _isMissingAccountName(step) {
        const imageName = BaseSchema._getFieldFromStep(step, 'image_name');
        const pattern = /^[^/\s]+\/[^/\s]\S*$/gi;

        return _.isString(imageName) && !pattern.test(imageName);
    }
}


module.exports = ImageNameValidation;
