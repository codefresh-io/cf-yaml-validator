
class ValidatorError extends Error {

    constructor(message, {details}) {
        super(message);
        this.details = details;
    }
}

module.exports = ValidatorError;
