using System.Diagnostics;
using Fido2NetLib.Development;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebAuthnDemo.Models;

namespace WebAuthnDemo.Controllers
{
    public class HomeController : Controller
    {
        private readonly DevelopmentInMemoryStore fidoStore;

        public HomeController(DevelopmentInMemoryStore fidoStore)
        {
            this.fidoStore = fidoStore;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult RegisteredKeys(string id)
        {
            return View(new RegisteredKeysModel{Username = id});
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
