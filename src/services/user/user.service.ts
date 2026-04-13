import { UserModel } from "../../db/models/user";
import userLogs, { IUserLogs, userLogger } from "./user.logs";
import { HttpCodes } from "../../config/Errors";
import {
  ErrorResponseC,
  SuccessResponseC,
} from "../../services/services.response";
import { formatString } from "../../utils/Strings";

export class UserServices {

    static executeGetAllUsers = async (): Promise<ResponseT> => {
  try {
    const users = await UserModel.find().sort({ createdAt: -1 });

    const msg = userLogs.GET_ALL_USERS_SUCCESS.message;
    userLogger.info(msg, { type: userLogs.GET_ALL_USERS_SUCCESS.type });

    return new SuccessResponseC(
      userLogs.GET_ALL_USERS_SUCCESS.type,
      users.map((u) => u.Optimize()),
      msg,
      HttpCodes.OK.code
    );
  } catch (err) {
    const msg = formatString(userLogs.GET_ALL_USERS_ERROR_GENERIC.message, {
      error: (err as Error)?.message || "",
    });
    userLogger.error(msg, err as Error);
    return new ErrorResponseC(
      userLogs.GET_ALL_USERS_ERROR_GENERIC.type,
      HttpCodes.InternalServerError.code,
      msg
    );
  }
};

  static executeGetPublicKey = async (email: string): Promise<ResponseT> => {
    try {
      const user = await UserModel.findOne({ email });
      if (!user) {
        const msg = formatString(
          userLogs.GET_PUBLIC_KEY_ERROR_NOT_FOUND.message,
          { email },
        );
        userLogger.error(msg);
        return new ErrorResponseC(
          userLogs.GET_PUBLIC_KEY_ERROR_NOT_FOUND.type,
          HttpCodes.NotFound.code,
          msg,
        );
      }

      const resp: ICode<IUserLogs> = userLogs.GET_PUBLIC_KEY_SUCCESS;
      const msg = formatString(resp.message, { email });
      userLogger.info(msg, { type: resp.type });

      return new SuccessResponseC(
        resp.type,
        { publicKey: user.publicKey },
        msg,
        HttpCodes.OK.code,
      );
    } catch (err) {
      const msg = formatString(userLogs.GET_PUBLIC_KEY_ERROR_GENERIC.message, {
        error: (err as Error)?.message || "",
        email,
      });
      userLogger.error(msg, err as Error);
      return new ErrorResponseC(
        userLogs.GET_PUBLIC_KEY_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg,
      );
    }
  };
}
