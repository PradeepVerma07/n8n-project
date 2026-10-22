/**
 * Express middleware to validate request payload against a Zod schema.
 * Supports validating body, query, or params.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} [source='body'] - Request property to validate
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed; // Replace with sanitized & transformed data
      next();
    } catch (error) {
      next(error);
    }
  };
}
