/**
 * Wraps a zod schema as Express middleware. On success, the parsed
 * (and type-coerced) body is attached to req.validated — controllers
 * read from there, never from raw req.body directly.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = validateBody;
