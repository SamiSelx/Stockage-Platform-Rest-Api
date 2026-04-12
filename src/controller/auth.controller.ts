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

export const GetCryptoMaterial = async (req: MyRequest<UserD>, res: Response) => {
	const result = await AuthServices.executeGetCryptoMaterial(req.user!);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};

export const ChangePassword = async (req: MyRequest<UserD>, res: Response) => {
	const { oldPassword, newPassword, salt, encryptedRMK, rmk_iv } = req.body;
	const result = await AuthServices.executeChangePassword(
		req.user!,
		oldPassword,
		newPassword,
		salt,
		encryptedRMK,
		rmk_iv
	);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};

export const EnrollCertificate = async (req: MyRequest<UserD>, res: Response) => {
	const { signPublicKeySpkiB64 } = req.body;
	const result = await AuthServices.executeEnrollCertificate(req.user!, signPublicKeySpkiB64);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};

export const StartIdentityChallenge = async (req: MyRequest<UserD>, res: Response) => {
	const result = await AuthServices.executeStartIdentityChallenge(req.user!);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};

export const VerifyIdentityChallenge = async (req: MyRequest<UserD>, res: Response) => {
	const { challengeId, certificate, caSignatureB64, clientTimestamp, signedPayloadB64, signatureB64 } = req.body;
	const result = await AuthServices.executeVerifyIdentityChallenge(
		req.user!,
		challengeId,
		certificate,
		caSignatureB64,
		clientTimestamp,
		signedPayloadB64,
		signatureB64,
		res,
	);
	if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
	if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};
