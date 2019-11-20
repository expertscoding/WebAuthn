import Swal, { SweetAlertOptions } from 'sweetalert2';
import { helper } from 'helpers';
import { Fido2 } from 'Fido2';

class Login {
    private static client:Fido2.FidoClient;

    constructor() {
        document.getElementById('login').addEventListener('submit', this.handleRegistration);
        Login.client = new Fido2.FidoClient(`https://${window.location.host}`);
    }

    async handleRegistration(event): Promise<void> {
        event.preventDefault();

        let username = (<HTMLInputElement>document.getElementById('loginUsername')).value;
        
        // send to server for login
        let makeAssertionOptions = new Fido2.AssertionOptions();
        try {
            makeAssertionOptions = await Login.client.assertionOptionsPost(username, "");
        } catch (e) {
            helper.showErrorAlert("Request to server failed", e);
        }


        // show options error to user
        if (makeAssertionOptions.status !== "ok") {
            console.error(`Error creating assertion options: ${makeAssertionOptions.errorMessage}`);
            helper.showErrorAlert(makeAssertionOptions.errorMessage);
            return;
        }


        var modalOptions = <SweetAlertOptions>{
            title: 'Login in...',
            text: 'Toca el botón de la llave de seguridad para acceder.',
            imageUrl: "/images/securitykey.min.svg",
            allowOutsideClick: false,
            showCancelButton: true,
            showConfirmButton: false,
            focusConfirm: false,
            focusCancel: false
        };
        Swal.fire(modalOptions);

        // ask browser for credentials (browser will ask connected authenticators)
        const requestOptions = Login.parseServerOptions(makeAssertionOptions);
        let credential: Credential = { id: "", type: "" };
        try {
            credential = await navigator.credentials.get(requestOptions);
        } catch (err) {
            helper.showErrorAlert(err.message ? err.message : err);
        }

        try {
            await Login.verifyAssertionWithServer(credential as PublicKeyCredential);
        } catch (e) {
            helper.showErrorAlert("Could not verify assertion", e);
        }
    }

    private static parseServerOptions(options: Fido2.IAssertionOptions): CredentialRequestOptions {
        console.log("Assertion Options Object", options);

        let requestOptions: any = { publicKey: {} };

        // todo: switch this to coercebase64
        const challenge = options.challenge.replace(/-/g, "+").replace(/_/g, "/");
        requestOptions.publicKey.challenge = Uint8Array.from(atob(challenge), c => (c as String).charCodeAt(0));

        // fix escaping. Change this to coerce
        requestOptions.publicKey.allowCredentials = options.allowCredentials.map(c => {
            var desc = <PublicKeyCredentialDescriptor><any>c;
            var fixedId = c.id.replace(/\_/g, "/").replace(/\-/g, "+");
            desc.id = Uint8Array.from(atob(fixedId), c => (c as String).charCodeAt(0));
            return c;
        });

        console.log("Assertion options", requestOptions);

        return <CredentialRequestOptions>requestOptions;
    }


    private static async verifyAssertionWithServer(assertedCredential: PublicKeyCredential) {
        // Move data into Arrays incase it is super long
        const authenticatorResponse = <AuthenticatorAssertionResponse>assertedCredential.response;
        const authData = new Uint8Array(authenticatorResponse.authenticatorData);
        const clientDataJson = new Uint8Array(authenticatorResponse.clientDataJSON);
        const rawId = new Uint8Array(assertedCredential.rawId);
        const sig = new Uint8Array(authenticatorResponse.signature);

        const rawResponse = new Fido2.AuthenticatorAssertionRawResponse();
        rawResponse.id = assertedCredential.id;
        rawResponse.rawId = helper.coerceToBase64Url(rawId);
        rawResponse.type = <any>assertedCredential.type;
        rawResponse.extensions = new Fido2.AuthenticationExtensionsClientOutputs();
        rawResponse.response = new Fido2.AssertionResponse({
            authenticatorData: helper.coerceToBase64Url(authData),
            clientDataJson: helper.coerceToBase64Url(clientDataJson),
            signature: helper.coerceToBase64Url(sig)
        });


        let response = new Fido2.AssertionVerificationResult();
        try {
            response = await Login.client.makeAssertion(rawResponse);
        } catch (e) {
            helper.showErrorAlert("Request to server failed", e);
            throw e;
        }

        console.log("Assertion Object", response);

        // show error
        if (response.status !== "ok") {
            console.log("Error doing assertion");
            console.log(response.errorMessage);
            helper.showErrorAlert(response.errorMessage);
            return;
        }

        // show success message
        var modalOptions = <SweetAlertOptions>{
            title: 'Logged In!',
            text: 'Log in correcto.',
            icon: "success",
            timer: 5000,
            allowOutsideClick: false,
            showCancelButton: false,
            showConfirmButton: true,
            focusConfirm: false,
            focusCancel: false
        };
        let username = (<HTMLInputElement>document.getElementById('loginUsername')).value;
        Swal.fire(modalOptions).then(_ => window.location.href = `home/registeredKeys/${username}`);
    }
}

export let login = new Login();