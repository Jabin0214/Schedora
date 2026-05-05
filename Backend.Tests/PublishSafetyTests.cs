using System.Diagnostics;

namespace Backend.Tests;

public class PublishSafetyTests
{
    [Fact]
    public async Task PublishDoesNotIncludeLocalSecrets()
    {
        var repoRoot = FindRepoRoot();
        var publishDir = Path.Combine(Path.GetTempPath(), "schedora-publish-safety", Guid.NewGuid().ToString("N"));

        try
        {
            var result = await RunDotnetAsync(
                "publish",
                Path.Combine(repoRoot, "Backend", "InspectionApi.csproj"),
                "-c",
                "Release",
                "-o",
                publishDir);

            Assert.True(result.ExitCode == 0, result.Output);
            Assert.False(File.Exists(Path.Combine(publishDir, "appsettings.local.json")));
            Assert.False(File.Exists(Path.Combine(publishDir, "google-credentials.json")));
        }
        finally
        {
            if (Directory.Exists(publishDir))
                Directory.Delete(publishDir, recursive: true);
        }
    }

    private static string FindRepoRoot()
    {
        var current = AppContext.BaseDirectory;

        while (!string.IsNullOrEmpty(current))
        {
            if (File.Exists(Path.Combine(current, "Schedora.sln")))
                return current;

            current = Directory.GetParent(current)?.FullName ?? "";
        }

        throw new DirectoryNotFoundException("Could not find Schedora.sln");
    }

    private static async Task<(int ExitCode, string Output)> RunDotnetAsync(params string[] args)
    {
        var startInfo = new ProcessStartInfo("dotnet")
        {
            RedirectStandardError = true,
            RedirectStandardOutput = true,
        };

        foreach (var arg in args)
            startInfo.ArgumentList.Add(arg);

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Failed to start dotnet");

        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();

        return (process.ExitCode, $"{await stdout}{await stderr}");
    }
}
