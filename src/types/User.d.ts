
declare interface UserAuthI {
    email: string;
    password: string;

}

declare interface UserI  extends UserAuthI{
	firstName: string;
	lastName: string;
    role: "admin" | "user" ;
    enable: boolean;
    storageUsed: number;
    storageLimit: number;
    salt: string;
    encryptedRMK: string;
    rmk_iv: string;
    encryptedRMK_recovery: string;
    rmk_recovery_iv: string;
    encryptedPrivateKey_recovery: string;
    privateKey_recovery_iv: string;
    encryptedPrivateKey:string;
    privateKey_iv:string;
    publicKey:string;
    identityCertificate?: string;
    identityCertSignature?: string;
}


type OptimizedUser = Omit<UserI, "password"> & { _id: string };


interface ResetI {
	email: string;
	user: Types.ObjectId;
	createdAt: Date;
	expiresAt: Date;
}



