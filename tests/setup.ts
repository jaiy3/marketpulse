process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.DATABASE_URL = "postgresql://marketpulse:marketpulse@localhost:5432/marketpulse?schema=public";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = "ci-only-secret-that-is-long-enough-for-tests";
process.env.CORS_ORIGIN = "http://localhost:5173";
