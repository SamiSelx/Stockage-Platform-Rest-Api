import Bull from "bull";
import { redisConfig } from "../config/redis";

export const emailQueue = new Bull("email", {redis: redisConfig})