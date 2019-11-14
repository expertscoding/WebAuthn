using System.Net;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Server.Kestrel.Transport.Abstractions.Internal;
using Microsoft.Extensions.Configuration;

namespace WebAuthnDemo
{
    public class Program
    {
        private static int basePort = 5000;
        private static IPAddress address = IPAddress.Loopback;

        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
                .UseKestrel()
/*
                .UseKestrel((context, options) =>
                {
                    basePort = context.Configuration.GetValue<int?>(nameof(basePort)) ?? 5000;
                    var configAddress = context.Configuration.GetValue<string>(nameof(address));
                    if (IPAddress.TryParse(configAddress, out var parsedAddress))
                    {
                        address = parsedAddress;
                    }

                    // Run callbacks on the transport thread
                    options.ApplicationSchedulingMode = SchedulingMode.Inline;

                    void Configure(ListenOptions listenOptions)
                    {
                        // This only works becuase InternalsVisibleTo is enabled for this sample.
                        listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
                        listenOptions.UseHttps("localhost-demo.p12");
                        listenOptions.UseConnectionLogging();
                    }

                    if (IPAddress.IsLoopback(address))
                        options.ListenLocalhost(basePort, Configure);
                    else
                        options.Listen(address, basePort, Configure);
                })
*/
                .UseStartup<Startup>();
    }
}
