using System.Collections.Generic;

namespace WebAuthnDemo.Data
{
    public class Fido2User : Fido2NetLib.Fido2User
    {
        public List<Fido2NetLib.Development.StoredCredential> Credentials { get; set; }
    }
}
