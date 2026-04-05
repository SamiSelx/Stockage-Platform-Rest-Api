
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
    encryptedPrivateKey:string;
    privateKey_iv:string;
    publicKey:string;
}


type OptimizedUser = Omit<UserI, "password"> & { _id: string };


interface ResetI {
	email: string;
	user: Types.ObjectId;
	createdAt: Date;
	expiresAt: Date;
}



