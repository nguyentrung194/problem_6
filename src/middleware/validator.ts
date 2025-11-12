import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { ErrorResponse } from '../types/index.ts';

/**
 * Validation middleware
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array(),
      },
    };
    res.status(400).json(errorResponse);
    return;
  }
  next();
};

/**
 * Score update validation rules
 */
export const validateScoreUpdate: (
  | ValidationChain
  | ((req: Request, res: Response, next: NextFunction) => void)
)[] = [
  body('score_increment')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Score increment must be between 1 and 1000'),
  body('action_id')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Action ID must be a valid string'),
  body('timestamp').optional().isInt().withMessage('Timestamp must be a valid integer'),
  validate,
];

/**
 * Validate timestamp to prevent replay attacks
 */
export function validateTimestamp(timestamp: number | undefined): boolean {
  if (!timestamp) return true; // Optional field

  const now = Date.now();
  const requestTime = parseInt(timestamp.toString(), 10);
  const timeDiff = Math.abs(now - requestTime);
  const maxTimeDiff = 5 * 60 * 1000; // 5 minutes

  return timeDiff <= maxTimeDiff;
}
