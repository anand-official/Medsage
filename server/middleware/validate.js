'use strict';

const { validationResult } = require('express-validator');

/**
 * Express middleware that reads express-validator results and short-circuits
 * with a 400 if any validation rule failed. Place after your validator chain.
 */
function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error:   'Validation failed',
            errors:  errors.array({ onlyFirstError: true }),
            ...(req.id && { requestId: req.id }),
        });
    }
    next();
}

module.exports = validate;
