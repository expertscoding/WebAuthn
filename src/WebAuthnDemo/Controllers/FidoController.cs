using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Fido2NetLib;
using Fido2NetLib.Development;
using Fido2NetLib.Objects;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace WebAuthnDemo.Controllers
{
    [Produces("application/json")]
    [Route("[controller]")]
    [ApiController]
    public class FidoController : ControllerBase
    {
        private readonly IFido2 fido2;
        private readonly DevelopmentInMemoryStore fidoStore;

        public FidoController(IFido2 fido2, DevelopmentInMemoryStore fidoStore)
        {
            this.fido2 = fido2;
            this.fidoStore = fidoStore;
        }

        [HttpPost]
        [Route("[action]")]
        [Produces("application/json", Type = typeof(CredentialCreateOptions))]
        public ActionResult MakeCredentialOptions([FromForm] string username,
            [FromForm] string displayName,
            [FromForm] string attType,
            [FromForm] string authType,
            [FromForm] bool requireResidentKey,
            [FromForm] string userVerification)
        {
            try
            {

                if (string.IsNullOrEmpty(username))
                {
                    username = $"{displayName} (Usernameless user created at {DateTime.UtcNow})";
                }

                // 1. Get user from DB by username (in our example, auto create missing users)
                var user = fidoStore.GetOrAddUser(username, () => new Fido2User
                {
                    DisplayName = displayName,
                    Name = username,
                    Id = Encoding.UTF8.GetBytes(username) // byte representation of userID is required
                });

                // 2. Get user existing keys by username
                var existingKeys = fidoStore.GetCredentialsByUser(user).Select(c => c.Descriptor).ToList();

                // 3. Create options
                var authenticatorSelection = new AuthenticatorSelection
                {
                    RequireResidentKey = requireResidentKey,
                    UserVerification = userVerification.ToEnum<UserVerificationRequirement>()
                };

                if (!string.IsNullOrEmpty(authType))
                    authenticatorSelection.AuthenticatorAttachment = authType.ToEnum<AuthenticatorAttachment>();

                var exts = new AuthenticationExtensionsClientInputs()
                {
                    Extensions = true,
                    UserVerificationIndex = true,
                    Location = true,
                    UserVerificationMethod = true,
                    BiometricAuthenticatorPerformanceBounds = new AuthenticatorBiometricPerfBounds
                    {
                        FAR = float.MaxValue,
                        FRR = float.MaxValue
                    }
                };

                var options = fido2.RequestNewCredential(user, existingKeys, authenticatorSelection, attType.ToEnum<AttestationConveyancePreference>(), exts);

                // 4. Temporarily store options, session/in-memory cache/redis/db
                HttpContext.Session.SetString("fido2.attestationOptions", options.ToJson());

                // 5. return options to client
                return Ok(options);
            }
            catch (Exception e)
            {
                return BadRequest(new CredentialCreateOptions {Status = "error", ErrorMessage = FormatException(e)});

            }
        }

        [HttpPost]
        [Route("[action]")]
        [Produces("application/json", Type = typeof(Fido2.CredentialMakeResult))]
        public async Task<ActionResult> MakeCredential(
            [FromBody] AuthenticatorAttestationRawResponse attestationResponse)
        {
            try
            {
                // 1. get the options we sent the client
                var jsonOptions = HttpContext.Session.GetString("fido2.attestationOptions");
                var options = CredentialCreateOptions.FromJson(jsonOptions);

                // 2. Create callback so that lib can verify credential id is unique to this user
                IsCredentialIdUniqueToUserAsyncDelegate callback = async (IsCredentialIdUniqueToUserParams args) =>
                {
                    var users = await fidoStore.GetUsersByCredentialIdAsync(args.CredentialId);
                    if (users.Count > 0)
                        return false;

                    return true;
                };

                // 2. Verify and make the credentials
                var success = await fido2.MakeNewCredentialAsync(attestationResponse, options, callback);

                // 3. Store the credentials in db
                fidoStore.AddCredentialToUser(options.User, new StoredCredential
                {
                    Descriptor = new PublicKeyCredentialDescriptor(success.Result.CredentialId),
                    PublicKey = success.Result.PublicKey,
                    UserHandle = success.Result.User.Id,
                    SignatureCounter = success.Result.Counter,
                    CredType = success.Result.CredType,
                    RegDate = DateTime.Now,
                    AaGuid = success.Result.Aaguid
                });

                // 4. return "ok" to the client
                return Ok(success);
            }
            catch (Exception e)
            {
                return BadRequest(new Fido2.CredentialMakeResult {Status = "error", ErrorMessage = FormatException(e)});
            }
        }

        [HttpPost]
        [Route("[action]")]
        [Produces("application/json", Type = typeof(AssertionOptions))]
        public ActionResult AssertionOptionsPost([FromForm] string username, [FromForm] string userVerification)
        {
            try
            {
                var existingCredentials = new List<PublicKeyCredentialDescriptor>();

                if (!string.IsNullOrEmpty(username))
                {
                    // 1. Get user from DB
                    var user = fidoStore.GetUser(username);
                    if (user == null)
                        throw new ArgumentException("Username was not registered");

                    // 2. Get registered credentials from database
                    existingCredentials = fidoStore.GetCredentialsByUser(user).Select(c => c.Descriptor).ToList();
                }

                var exts = new AuthenticationExtensionsClientInputs()
                {
                    SimpleTransactionAuthorization = "FIDO",
                    GenericTransactionAuthorization = new TxAuthGenericArg
                    {
                        ContentType = "text/plain",
                        Content = new byte[] {0x46, 0x49, 0x44, 0x4F}
                    },
                    UserVerificationIndex = true,
                    Location = true,
                    UserVerificationMethod = true
                };

                // 3. Create options
                var uv = string.IsNullOrEmpty(userVerification)
                    ? UserVerificationRequirement.Discouraged
                    : userVerification.ToEnum<UserVerificationRequirement>();
                var options = fido2.GetAssertionOptions(
                    existingCredentials,
                    uv,
                    exts
                );

                // 4. Temporarily store options, session/in-memory cache/redis/db
                HttpContext.Session.SetString("fido2.assertionOptions", options.ToJson());

                // 5. Return options to client
                return Ok(options);
            }

            catch (Exception e)
            {
                return BadRequest(new AssertionOptions {Status = "error", ErrorMessage = FormatException(e)});
            }
        }

        [HttpPost]
        [Route("[action]")]
        [Produces("application/json", Type = typeof(AssertionVerificationResult))]
        public async Task<ActionResult> MakeAssertion([FromBody] AuthenticatorAssertionRawResponse clientResponse)
        {
            try
            {
                // 1. Get the assertion options we sent the client
                var jsonOptions = HttpContext.Session.GetString("fido2.assertionOptions");
                var options = AssertionOptions.FromJson(jsonOptions);

                // 2. Get registered credential from database
                var creds = fidoStore.GetCredentialById(clientResponse.Id);

                if (creds == null)
                {
                    throw new Exception("Unknown credentials");
                }

                // 3. Get credential counter from database
                var storedCounter = creds.SignatureCounter;

                // 4. Create callback to check if userhandle owns the credentialId
                IsUserHandleOwnerOfCredentialIdAsync callback = async (args) =>
                {
                    var storedCreds = await fidoStore.GetCredentialsByUserHandleAsync(args.UserHandle);
                    return storedCreds.Exists(c => c.Descriptor.Id.SequenceEqual(args.CredentialId));
                };

                // 5. Make the assertion
                var res = await fido2.MakeAssertionAsync(clientResponse, options, creds.PublicKey, storedCounter,
                    callback);

                // 6. Store the updated counter
                fidoStore.UpdateCounter(res.CredentialId, res.Counter);

                // 7. return OK to client
                return Ok(res);
            }
            catch (Exception e)
            {
                return BadRequest(new AssertionVerificationResult
                    {Status = "error", ErrorMessage = FormatException(e)});
            }
        }

        private string FormatException(Exception e)
        {
            return $"{e.Message}{(e.InnerException != null ? $" ({e.InnerException.Message})" : string.Empty)}";
        }
    }
}