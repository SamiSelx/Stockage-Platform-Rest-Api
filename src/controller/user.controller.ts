import { Response } from "express";
import { UserD } from "../db/models/user";
import { ErrorResponseC, SuccessResponseC } from "../services/services.response";
import { UserServices } from "../services/user/user.service";
import { MyRequest } from "../types/Express";
import { ErrorResponse, SuccessResponse } from "../utils/Response";


export const GetPublicKey = async (req: MyRequest<UserD>, res: Response) => {
  const { email } = req.params;
  const result = await UserServices.executeGetPublicKey(email);
  if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
  if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};

export const GetAllUsers = async (req: MyRequest<UserD>, res: Response) => {
  const result = await UserServices.executeGetAllUsers();
  if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
  if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};