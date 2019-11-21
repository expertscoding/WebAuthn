<p align="center">
  <img src="ec_logo.png" width="100" alt="Experts Coding logo" title="Experts Coding logo">
</p>

# WebAuthn Demo

In this repo, you can find the demos showed at the Commit Conf 2019. It's a simple web to demonstrate the use of [WebAuthn API](https://www.w3.org/TR/webauthn/) in the browser, supporting multiplatform authenticators.  
The backend is a .Net Core web app using the [Fido2](https://github.com/abergs/fido2-net-lib) library to implement the cryptography plumbing and some models to communicate with the frontend.  
The frontend is just Html and TypeScript (obviously compiled to JS) using the integrated APIs in your browser.

Also, take a look at the [slides](WebAuthn_No_mas_passwords.pdf) presented in the talk for a complete reference and a lot of stuff of the protocols, libraries, etc.

## Running the project

Only a few requirements are needed to build and run the project: .Net Core 2.2 SDK (You can download it from https://dotnet.microsoft.com/download) and a modern browser to have fun!

Once installed, just clone the repo, then, in the console of your choice run the following commands:
```dos
npm install
```
It'll install the necessary dependencies to compile the TypeScript files and copy modules.

```dos
npm start
```
This will run the gulp tasks, then the dotnet server locally.

## Using outside your localhost

If you want to access the site from the internet, for example, to try the capabilities of your mobile phone regardless of WebAuthn, then you need some kind of tunnel to your host.

In this case, I'll recommend two options: [ngrok](https://ngrok.com/) or [localtunnel.me](https://github.com/localtunnel/localtunnel)  
The first one has some free tier, but https it's a premium feature. It works like a charm.  
The second one it's free, even the https redirection to your localhost, but sometimes fails. 😔

Finally, if you go with [localtunnel.me](https://github.com/localtunnel/localtunnel), after install the npm package (please refer to the repository), the command to establish the tunnel is:
```dos
lt -p 5000 --local-https local-cert .\localhost-demo.p12 --allow-invalid-cert
```

This will create the tunnel to port 5000 (the one where the demo app is running) enabling https redirect and ignoring invalid certificates.


There are other options out there, take a look and choose whatever you want!

## License
This work is licensed under the [MIT License](LICENSE)