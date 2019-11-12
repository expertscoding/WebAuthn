using Fido2NetLib.Development;
using Microsoft.EntityFrameworkCore;

namespace WebAuthnDemo.Data
{
    public class Fido2DbContext : DbContext
    {
        public DbSet<Fido2User> Users { get; set; }

        public DbSet<StoredCredential> Credentials { get; set; }

        public Fido2DbContext(DbContextOptions options) : base(options)
        {
        }
    }
}