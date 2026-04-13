import { UserModel, createUserFactory } from "../models/user";
export const seedUsers = async () => {
  try {
    const user = await createUserFactory({
      firstName: process.env.USER_firstName || "test",
      lastName: process.env.USER_lastName || "yyy",
      email: process.env.USER_email || "test@gmail.com",

      password: process.env.USER_password || "password",
      role: "admin",
    });
    if (user) {
      console.log("🌱 seeding => users : user :", user);
      return user;
    }
  } catch (err) {
    console.error(`🔥seeding failed  err : ${err}`);
  }
};
