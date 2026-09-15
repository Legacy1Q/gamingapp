using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;

namespace GamingApp.api.Models;

public class PlayerProfile
{
    [Key]
    public string UserId { get; set; } = "";
    [MaxLength(30)]
    public string DisplayName { get; set; } = "";
    [MaxLength(30)]
    public string NormalizedName { get; set; } = "";

    public static string DefaultName(string id) => "Player " + Convert.ToHexString(
        SHA256.HashData(Encoding.UTF8.GetBytes(id)))[..8];
}
