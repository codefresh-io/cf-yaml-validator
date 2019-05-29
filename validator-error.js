'use strict';

class ValidatorError extends Error {

    constructor(error) {
        super(error.message);
        this.details = error.details;
    }
}

module.exports = ValidatorError;
