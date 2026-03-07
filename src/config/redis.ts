import { REDIS_HOST, REDIS_PORT, REDIST_PASSWORD } from "./CheckableEnv";

export const redisConfig = {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    password: REDIST_PASSWORD
}