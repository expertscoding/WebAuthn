import Swal, { SweetAlertOptions } from 'sweetalert2';
import { helper } from 'helpers';
import { Fido2 } from 'Fido2';

class Register {
    private static client: Fido2.FidoClient;

    constructor() {
        document.getElementById('register').addEventListener('submit', this.handleRegistration);
        Register.client = new Fido2.FidoClient(`https://${window.location.host}`);
    }

    async handleRegistration(event): Promise<void> {
        event.preventDefault();

        let username = (<HTMLInputElement>document.getElementById('registerUsername')).value;
        let displayName = (<HTMLInputElement>document.getElementById('registerDisplayName')).value;

        let options: Fido2.ICredentialCreateOptions = new Fido2.CredentialCreateOptions();

        try {
            // attestationType: possible values: none, direct, indirect
            // authenticatorAttachment: possible values: <empty>, platform, cross-platform
            // userVerification: possible values: preferred, required, discouraged
            // requireResidentKey: possible values: true,false
            options = await Register.client.makeCredentialOptions(username, displayName, "none", "", false, "preferred");
        } catch (e) {
            helper.showErrorAlert("Request to server failed", e);
        }

        if (options.status !== "ok") {
            helper.showErrorAlert(`Error creating credential options: ${options.errorMessage}`);
            return;
        }

        let modalOptions = <SweetAlertOptions>{
            title: 'Registrando...',
            text: 'Toca el botón de la llave de seguridad para finalizar el registro.',
            imageUrl: "/images/securitykey.min.svg",
            allowOutsideClick: false,
            showCancelButton: true,
            showConfirmButton: false,
            focusConfirm: false,
            focusCancel: false
        };
        Swal.fire(modalOptions);

        console.log("Creating PublicKeyCredential...");

        const creationOptions = Register.parseServerOptions(options);
        let newCredential: Credential = { id: "", type: "" };
        try {
            newCredential = await navigator.credentials.create(creationOptions);
        } catch (e) {
            var msg = "Could not create credentials in browser. Probably because the username is already registered with your authenticator. Please change username or authenticator.";
            console.error(msg, e);
            helper.showErrorAlert(msg, e);
        }


        try {
            Register.registerNewCredential(<PublicKeyCredential>newCredential);
        } catch (err) {
            helper.showErrorAlert(err.message ? err.message : err);
        }
        console.log("PublicKeyCredential Created", newCredential);
    }

    private static parseServerOptions(options: Fido2.ICredentialCreateOptions): CredentialCreationOptions {
        console.log("Credential Options Object", options);

        let creationOptions: any = { publicKey: {} };
        creationOptions.publicKey = Object.assign(creationOptions.publicKey, options);

        // Turn the challenge back into the accepted format of padded base64
        creationOptions.publicKey.challenge = helper.coerceToArrayBuffer(options.challenge);
        // Turn ID into a UInt8Array Buffer for some reason
        creationOptions.publicKey.user.id = helper.coerceToArrayBuffer(options.user.id);
        
        creationOptions.publicKey.excludeCredentials = options.excludeCredentials.map((c) => {
            var desc = <PublicKeyCredentialDescriptor><any>c;
            desc.id = helper.coerceToArrayBuffer(c.id);
            return desc;
        });

        if (options.authenticatorSelection.authenticatorAttachment === null)
            options.authenticatorSelection.authenticatorAttachment = undefined;

        console.log("Credential Options Formatted", options);

        return <CredentialCreationOptions>creationOptions;
    }

    // This should be used to verify the auth data with the server
    private static async registerNewCredential(newCredential:PublicKeyCredential) {
        // Move data into Arrays in case it is super long
        const authenticatorResponse = <AuthenticatorAttestationResponse>newCredential.response;
        const attestationObject = new Uint8Array(authenticatorResponse.attestationObject);
        const clientDataJson = new Uint8Array(authenticatorResponse.clientDataJSON);
        const rawId = new Uint8Array(newCredential.rawId);

        const rawResponse = new Fido2.AuthenticatorAttestationRawResponse();
        rawResponse.id = newCredential.id;
        rawResponse.rawId = helper.coerceToBase64Url(rawId);
        rawResponse.type = <any>newCredential.type;
        rawResponse.extensions = new Fido2.AuthenticationExtensionsClientOutputs();
        rawResponse.response = new Fido2.ResponseData({
            attestationObject: helper.coerceToBase64Url(attestationObject),
            clientDataJson: helper.coerceToBase64Url(clientDataJson)
        });

        let response = new Fido2.CredentialMakeResult;
        try {
            response = await Register.client.makeCredential(rawResponse);
        } catch (e) {
            helper.showErrorAlert(e);
        }

        console.log("Credential Object", response);

        // show error
        if (response.status !== "ok") {
            console.log("Error creating credential");
            console.log(response.errorMessage);
            helper.showErrorAlert(response.errorMessage);
            return;
        }

        // show success 
        var modalOptions = <SweetAlertOptions>{
            title: 'Registro correcto!',
            text: 'Su registro ha sido satisfactorio.',
            icon: 'success',
            timer: 5000, 
            allowOutsideClick: true,
            showCancelButton: false,
            showConfirmButton: true,
            focusConfirm: true,
        };
        await Swal.fire(modalOptions);

        (<HTMLInputElement>document.getElementById('registerUsername')).value = "";
        (<HTMLInputElement>document.getElementById('registerDisplayName')).value = "";
        document.getElementById('loginUsername').focus();
    }
}

export let register = new Register();