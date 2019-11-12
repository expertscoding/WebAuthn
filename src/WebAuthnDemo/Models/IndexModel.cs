using System.ComponentModel;

namespace WebAuthnDemo.Models
{
    public class IndexModel
    {
        [DisplayName("Nombre de Usuario")]
        public string Username { get; set; }

        [DisplayName("Nombre para mostrar")]
        public string DisplayName { get; set; }
    }
}