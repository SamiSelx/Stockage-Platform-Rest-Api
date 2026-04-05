import {Response } from "express";
import  { UserD } from "../db/models/user";
import { MyRequest } from "../types/Express";
import { ErrorResponse, SuccessResponse } from "../utils/Response";
import { AuthServices } from "../services/auth/auth.service";
import { ErrorResponseC, SuccessResponseC } from "../services/services.response";
export const SignIn = async (req: MyRequest<UserD>, res: Response,) => {
	const { email, password, stay = false  } = req.body;
	const result  = await AuthServices.executeLogin(email, password , stay , res);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message , result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error );
};
export const SignUp = async (req: MyRequest<UserD>, res: Response,) => {
	const { email, password, firstName, lastName, salt, encryptedRMK, rmk_iv, encryptedPrivateKey, privateKey_iv, publicKey, stay = false } = req.body;
	console.log("salt ",salt, " encryptedRMK ", encryptedRMK, " rmk_iv ", rmk_iv);
	const  result  = await AuthServices.executeRegister(email, password, firstName, lastName, salt, encryptedRMK, rmk_iv, encryptedPrivateKey, privateKey_iv, publicKey, stay , res);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message , result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error );
}


export const AuthBack = async (req:MyRequest<UserD>,res:Response) => {
	const { stay = false } = req.body;
	const result = await AuthServices.executeAuthBack(req.user! , stay , res);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message , result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error );
}

export const Logout = async (req:MyRequest<UserD>,res:Response) => {
	const result = await AuthServices.executeLogout(req.user! , res);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message , result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error );
}
