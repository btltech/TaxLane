const buckets = new Map();

function rateLimit(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 30,
    keyGenerator = (req) => req.ip,
    message = 'Too many requests, please try again later.',
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }
    if (bucket.count >= max) {
      return res.status(429).json({ error: message });
    }
    bucket.count += 1;
    return next();
  };
}

module.exports = rateLimit;
