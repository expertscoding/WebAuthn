import Swal, { SweetAlertOptions } from 'sweetalert2';
import { helper } from 'helpers';

class Register {
    constructor() {
        //$("#register").on("submit", this.handleRegistration);
        document.getElementById('register').addEventListener('submit', this.handleRegistration);
    }

    async handleRegistration(event): Promise<void> {
        event.preventDefault();

        let username = $("#registerUsername").val() as string;
        let displayName = $("#registerDisplayName").val() as string;

        // possible values: none, direct, indirect
        let attestationType = "none";
        // possible values: <empty>, platform, cross-platform
        let authenticatorAttachment = "";
        // possible values: preferred, required, discouraged
        let userVerification = "preferred";
        // possible values: true,false
        let requireResidentKey = "false";


        // prepare form post data
        var data = new FormData();
        data.append('username', username);
        data.append('displayName', displayName);
        data.append('attType', attestationType);
        data.append('authType', authenticatorAttachment);
        data.append('userVerification', userVerification);
        data.append('requireResidentKey', requireResidentKey);

        // send to server for registering
        let makeCredentialOptions: any;
        try {
            makeCredentialOptions = await Register.fetchMakeCredentialOptions(data);
        } catch (e) {
            console.error(e);
            let msg = "Something went really wrong";
            helper.showErrorAlert(msg);
        }


        console.log("Credential Options Object", makeCredentialOptions);

        if (makeCredentialOptions.status !== "ok") {
            console.log("Error creating credential options");
            console.log(makeCredentialOptions.errorMessage);
            helper.showErrorAlert(makeCredentialOptions.errorMessage);
            return;
        }

        // Turn the challenge back into the accepted format of padded base64
        makeCredentialOptions.challenge = helper.coerceToArrayBuffer(makeCredentialOptions.challenge);
        // Turn ID into a UInt8Array Buffer for some reason
        makeCredentialOptions.user.id = helper.coerceToArrayBuffer(makeCredentialOptions.user.id);

        makeCredentialOptions.excludeCredentials = makeCredentialOptions.excludeCredentials.map((c) => {
            c.id = helper.coerceToArrayBuffer(c.id);
            return c;
        });

        if (makeCredentialOptions.authenticatorSelection.authenticatorAttachment === null)
            makeCredentialOptions.authenticatorSelection.authenticatorAttachment = undefined;

        console.log("Credential Options Formatted", makeCredentialOptions);

        var modalOptions = <SweetAlertOptions>{
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

        let newCredential;
        try {
            newCredential = await navigator.credentials.create({
                publicKey: makeCredentialOptions
            });
        } catch (e) {
            var msg = "Could not create credentials in browser. Probably because the username is already registered with your authenticator. Please change username or authenticator.";
            console.error(msg, e);
            helper.showErrorAlert(msg, e);
        }


        console.log("PublicKeyCredential Created", newCredential);

        try {
            Register.registerNewCredential(newCredential);

        } catch (err) {
            helper.showErrorAlert(err.message ? err.message : err);
        }
    }

    private static async fetchMakeCredentialOptions(formData) : Promise<CredentialCreateOptions> {
        let response = await fetch('fido/makeCredentialOptions', {
            method: 'POST', // or 'PUT'
            body: formData, // data can be `string` or {object}!
            headers: {
                'Accept': 'application/json'
            }
        });

        let data = await response.json();

        return data;
    }


    // This should be used to verify the auth data with the server
    private static async registerNewCredential(newCredential) {
        // Move data into Arrays in case it is super long
        let attestationObject = new Uint8Array(newCredential.response.attestationObject);
        let clientDataJSON = new Uint8Array(newCredential.response.clientDataJSON);
        let rawId = new Uint8Array(newCredential.rawId);

        const data = {
            id: newCredential.id,
            rawId: helper.coerceToBase64Url(rawId),
            type: newCredential.type,
            extensions: newCredential.getClientExtensionResults(),
            response: {
                AttestationObject: helper.coerceToBase64Url(attestationObject),
                clientDataJson: helper.coerceToBase64Url(clientDataJSON)
            }
        };

        let response;
        try {
            response = await Register.registerCredentialWithServer(data);
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
        Swal.fire(modalOptions);

        // redirect to dashboard?
        //window.location.href = "/dashboard/" + state.user.displayName;
    }

    private static async registerCredentialWithServer(formData) {
        let response = await fetch('fido/makeCredential', {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formData), // data can be `string` or {object}!
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        let data = await response.json();

        return data;
    }
}

export let register = new Register();