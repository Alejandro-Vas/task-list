export const THROTTLE_GLOBAL_TTL = Number(process.env.THROTTLE_TTL ?? 60_000);
export const THROTTLE_GLOBAL_LIMIT = Number(process.env.THROTTLE_LIMIT ?? 100);

export const THROTTLE_AUTH_TTL = Number(process.env.THROTTLE_AUTH_TTL ?? 60_000);
export const THROTTLE_AUTH_LIMIT = Number(process.env.THROTTLE_AUTH_LIMIT ?? 5);
