# WebAuthn Demo

In this repo, you can find the demos showed at the Commit Conf 2019. It's a simple web to demonstrate the use of WebAuthn API in the browser, supporting multiplatform authenticators.

## Running the project

Only a few requirements are needed to build and run the project is .Net Core 2.2 or above (You can download it from https://dotnet.microsoft.com/download) and a modern browser to have fun!

Once installed, just clone the repo, then in the console of your choice run the following commands:
```
npm install
```
To install the necessary dependencies to compile the TypeScript files and copy modules.

```
npm start
```
This will run the gulp tasks, then the dotnet server locally.

## Using outside your localhost

If you want to access the site from the internet, for example, to try the capabilities of your mobile phone regardless of WebAuthn, then you need some kind of tunnel to your host.

In this case, I'll recommend two options: [ngrok](https://ngrok.com/) or [localtunnel.me](https://github.com/localtunnel/localtunnel)  
The first one has some free tier, but https it's a premium feature, works like a charm.  
The second one it's free, even the https redirection to your localhost, but sometimes fails.

There are other options out there, take a look and choose whatever you want!