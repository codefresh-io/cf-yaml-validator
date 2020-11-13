'use strict';

class BaseArgument {
    static getName() {
        throw new Error('Implement this');
    }

    static validate() {
        throw new Error('Implement this');
    }
}

module.exports = BaseArgument;
