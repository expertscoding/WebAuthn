import Swal, { SweetAlertOptions } from 'sweetalert2';
import { helper } from 'helpers';

class Login {
    constructor() {
        document.getElementById('login').addEventListener('submit', this.handleRegistration);
    }

    async handleRegistration(event): Promise<void> {
        event.preventDefault();

        let username = $("#loginUsername").val() as string;;

        // prepare form post data
        var formData = new FormData();
        formData.append('username', username);

        // send to server for registering
        let makeAssertionOptions;
        try {
            var res = await fetch('/assertionOptions', {
                method: 'POST', // or 'PUT'
                body: formData, // data can be `string` or {object}!
                headers: {
                    'Accept': 'application/json'
                }
            });

            makeAssertionOptions = await res.json();
        } catch (e) {
            helper.showErrorAlert("Request to server failed", e);
        }

        console.log("Assertion Options Object", makeAssertionOptions);

        // show options error to user
        if (makeAssertionOptions.status !== "ok") {
            console.log("Error creating assertion options");
            console.log(makeAssertionOptions.errorMessage);
            helper.showErrorAlert(makeAssertionOptions.errorMessage);
            return;
        }

        // todo: switch this to coercebase64
        const challenge = makeAssertionOptions.challenge.replace(/-/g, "+").replace(/_/g, "/");
        makeAssertionOptions.challenge = Uint8Array.from(atob(challenge), c => (c as String).charCodeAt(0));

        // fix escaping. Change this to coerce
        makeAssertionOptions.allowCredentials.forEach(listItem => {
            var fixedId = listItem.id.replace(/\_/g, "/").replace(/\-/g, "+");
            listItem.id = Uint8Array.from(atob(fixedId), c => (c as String).charCodeAt(0));
        });

        console.log("Assertion options", makeAssertionOptions);

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
        let credential;
        try {
            credential = await navigator.credentials.get({ publicKey: makeAssertionOptions })
        } catch (err) {
            helper.showErrorAlert(err.message ? err.message : err);
        }

        try {
            await Login.verifyAssertionWithServer(credential);
        } catch (e) {
            helper.showErrorAlert("Could not verify assertion", e);
        }
    }

    private static async verifyAssertionWithServer(assertedCredential) {

        // Move data into Arrays incase it is super long
        let authData = new Uint8Array(assertedCredential.response.authenticatorData);
        let clientDataJSON = new Uint8Array(assertedCredential.response.clientDataJSON);
        let rawId = new Uint8Array(assertedCredential.rawId);
        let sig = new Uint8Array(assertedCredential.response.signature);
        const data = {
            id: assertedCredential.id,
            rawId: helper.coerceToBase64Url(rawId),
            type: assertedCredential.type,
            extensions: assertedCredential.getClientExtensionResults(),
            response: {
                authenticatorData: helper.coerceToBase64Url(authData),
                clientDataJson: helper.coerceToBase64Url(clientDataJSON),
                signature: helper.coerceToBase64Url(sig)
            }
        };

        let response;
        try {
            let res = await fetch("/makeAssertion", {
                method: 'POST', // or 'PUT'
                body: JSON.stringify(data), // data can be `string` or {object}!
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            response = await res.json();
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
        Swal.fire(modalOptions).then(_ => window.location.href = "home/registeredKeys/" + $("#loginUsername").val());
    }
}

export let login = new Login();