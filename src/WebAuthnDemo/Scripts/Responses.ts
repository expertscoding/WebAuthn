interface Fido2ResponseBase {
    status: string;

    errorMessage: string;
}

interface PublicKeyCredentialRpEntity {

}

interface Fido2User {

}

interface PubKeyCredParam {

}

interface AuthenticatorSelection {

}

interface PublicKeyCredentialDescriptor {

}

interface CredentialCreateOptions extends Fido2ResponseBase {
    rp: PublicKeyCredentialRpEntity;

    user: Fido2User;

    challenge: ArrayBuffer;

    pubKeyCredParams: Array<PubKeyCredParam>;

    timeout: number;

    attestation: AttestationConveyancePreference;

    authenticatorSelection: AuthenticatorSelection;

    excludeCredentials: Array<PublicKeyCredentialDescriptor>;
}