using System;
using System.Threading.Tasks;
using Fido2NetLib;
using Fido2NetLib.Development;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace WebAuthnDemo
{
    public static class FidoAspnetExtensions
    {
        public static void AddFido2(this IServiceCollection services, Action<Fido2Configuration> setupAction)
        {
            services.Configure(setupAction);
            
            services.AddTransient(
                resolver =>
                {
                    var fido2Configuration = resolver.GetRequiredService<IOptions<Fido2Configuration>>().Value;
                    //Don't do this in production under any circumstance
                    var request = resolver.GetRequiredService<IHttpContextAccessor>().HttpContext.Request;
                    var currentDomain = request.Host.Host;
                    fido2Configuration.Origin = $"{request.Scheme}://{currentDomain}{(request.Host.Port!=null?$":{request.Host.Port}":string.Empty)}";
                    fido2Configuration.ServerDomain = currentDomain;
                    return fido2Configuration;
                });

            services.AddTransient<IFido2, Fido2>();
            services.AddSingleton<IMetadataService, NullMetadataService>(); //We're not going to use MDS, so provide a Default null implementation
            services.AddTransient<IMetadataRepository, StaticMetadataRepository>();
            services.AddSingleton<DevelopmentInMemoryStore>();
        }
    }

    internal class NullMetadataService : IMetadataService
    {
        bool IMetadataService.ConformanceTesting()
        {
            return false;
        }

        MetadataTOCPayloadEntry IMetadataService.GetEntry(Guid aaguid)
        {
            return null;
        }

        Task IMetadataService.Initialize()
        {
            return Task.CompletedTask;
        }

        bool IMetadataService.IsInitialized()
        {
            return true;
        }
    }
}