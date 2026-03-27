import Foundation

struct CheckFailure: Error {
  let message: String
}

struct FooterLink: Decodable {
  let href: String
  let label: String
}

struct SiteSettings: Decodable {
  let site_url: String
  let styles_version: String
  let scripts_version: String
  let footer_links: [FooterLink]
  let footer_note: String
}

func loadPageNames(from manifestURL: URL) throws -> [String] {
  let raw = try String(contentsOf: manifestURL, encoding: .utf8)

  let pageNames = raw
    .split(whereSeparator: \.isNewline)
    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
    .filter { !$0.isEmpty && !$0.hasPrefix("#") }

  guard !pageNames.isEmpty else {
    throw CheckFailure(message: "No page names found in \(manifestURL.path)")
  }

  return pageNames
}

func loadSiteSettings(from settingsURL: URL) throws -> SiteSettings {
  let data = try Data(contentsOf: settingsURL)
  return try JSONDecoder().decode(SiteSettings.self, from: data)
}

func localReferenceTargets(in html: String) -> [String] {
  let pattern = #"(?:href|src)=["']([^"']+)["']"#
  guard let regex = try? NSRegularExpression(pattern: pattern) else {
    return []
  }

  let nsRange = NSRange(html.startIndex..<html.endIndex, in: html)
  return regex.matches(in: html, range: nsRange).compactMap { match in
    guard
      match.numberOfRanges > 1,
      let range = Range(match.range(at: 1), in: html)
    else {
      return nil
    }

    return String(html[range])
  }
}

func normalizedLocalPath(for reference: String) -> String? {
  if reference.isEmpty {
    return nil
  }

  let lowercased = reference.lowercased()
  if lowercased.hasPrefix("http://")
    || lowercased.hasPrefix("https://")
    || lowercased.hasPrefix("mailto:")
    || lowercased.hasPrefix("tel:")
    || lowercased.hasPrefix("data:")
    || lowercased.hasPrefix("javascript:")
    || reference.hasPrefix("#")
  {
    return nil
  }

  let trimmed = reference
    .split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false)
    .first
    .map(String.init)?
    .split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
    .first
    .map(String.init)?
    .replacingOccurrences(of: "./", with: "")
    ?? ""

  return trimmed.isEmpty ? nil : trimmed
}

func findSharedVersion(in html: String, assetName: String) -> String? {
  let escapedAssetName = NSRegularExpression.escapedPattern(for: assetName)
  let pattern = escapedAssetName + #"\?v=([^"' ]+)"#

  guard let regex = try? NSRegularExpression(pattern: pattern) else {
    return nil
  }

  let nsRange = NSRange(html.startIndex..<html.endIndex, in: html)
  guard
    let match = regex.firstMatch(in: html, range: nsRange),
    match.numberOfRanges > 1,
    let range = Range(match.range(at: 1), in: html)
  else {
    return nil
  }

  return String(html[range])
}

func expectedCanonicalURL(for pageName: String, siteURL: String) -> String {
  let trimmedSiteURL = siteURL.hasSuffix("/") ? String(siteURL.dropLast()) : siteURL
  if pageName == "index.html" {
    return "\(trimmedSiteURL)/"
  }

  return "\(trimmedSiteURL)/\(pageName)"
}

func matchedAttribute(in html: String, pattern: String) -> String? {
  guard let regex = try? NSRegularExpression(pattern: pattern) else {
    return nil
  }

  let nsRange = NSRange(html.startIndex..<html.endIndex, in: html)
  guard
    let match = regex.firstMatch(in: html, range: nsRange),
    match.numberOfRanges > 1,
    let range = Range(match.range(at: 1), in: html)
  else {
    return nil
  }

  return String(html[range])
}

func canonicalHref(in html: String) -> String? {
  matchedAttribute(in: html, pattern: #"<link[^>]+rel="canonical"[^>]+href="([^"]+)""#)
}

func metaPropertyContent(in html: String, property: String) -> String? {
  let escapedProperty = NSRegularExpression.escapedPattern(for: property)
  return matchedAttribute(
    in: html,
    pattern: #"<meta[^>]+property=""# + escapedProperty + #""[^>]+content="([^"]+)""#
  )
}

let rootURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
let manifestURL = rootURL.appendingPathComponent("tools/site-pages.txt")
let settingsURL = rootURL.appendingPathComponent("tools/site-settings.json")

do {
  let expectedPages = try loadPageNames(from: manifestURL)
  let settings = try loadSiteSettings(from: settingsURL)
  let expectedPageSet = Set(expectedPages)

  let actualPages = try FileManager.default.contentsOfDirectory(at: rootURL, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension == "html" }
    .map(\.lastPathComponent)
    .sorted()
  let actualPageSet = Set(actualPages)

  var failures: [String] = []

  let missingFromManifest = actualPageSet.subtracting(expectedPageSet).sorted()
  if !missingFromManifest.isEmpty {
    failures.append("Add these HTML files to tools/site-pages.txt: \(missingFromManifest.joined(separator: ", "))")
  }

  let missingFromRoot = expectedPageSet.subtracting(actualPageSet).sorted()
  if !missingFromRoot.isEmpty {
    failures.append("These manifest pages do not exist in the repo root: \(missingFromRoot.joined(separator: ", "))")
  }

  var stylesheetVersions: [String: [String]] = [:]
  var scriptVersions: [String: [String]] = [:]

  for pageName in actualPages {
    let pageURL = rootURL.appendingPathComponent(pageName)
    let html = try String(contentsOf: pageURL, encoding: .utf8)
    let expectedCanonical = expectedCanonicalURL(for: pageName, siteURL: settings.site_url)

    if let stylesheetVersion = findSharedVersion(in: html, assetName: "styles.css") {
      stylesheetVersions[stylesheetVersion, default: []].append(pageName)
      if stylesheetVersion != settings.styles_version {
        failures.append("\(pageName) uses styles.css version \(stylesheetVersion), expected \(settings.styles_version)")
      }
    } else {
      failures.append("\(pageName) is missing a versioned styles.css reference.")
    }

    if let scriptVersion = findSharedVersion(in: html, assetName: "scripts.js") {
      scriptVersions[scriptVersion, default: []].append(pageName)
      if scriptVersion != settings.scripts_version {
        failures.append("\(pageName) uses scripts.js version \(scriptVersion), expected \(settings.scripts_version)")
      }
    } else {
      failures.append("\(pageName) is missing a versioned scripts.js reference.")
    }

    let canonicalURL = canonicalHref(in: html)
    if canonicalURL != expectedCanonical {
      failures.append("\(pageName) has canonical \(canonicalURL ?? "missing"), expected \(expectedCanonical)")
    }

    let ogURL = metaPropertyContent(in: html, property: "og:url")
    if ogURL != expectedCanonical {
      failures.append("\(pageName) has og:url \(ogURL ?? "missing"), expected \(expectedCanonical)")
    }

    for reference in localReferenceTargets(in: html) {
      guard let normalizedPath = normalizedLocalPath(for: reference) else {
        continue
      }

      let targetURL = pageURL.deletingLastPathComponent().appendingPathComponent(normalizedPath)
      if !FileManager.default.fileExists(atPath: targetURL.path) {
        failures.append("\(pageName) references missing local file \(normalizedPath)")
      }
    }
  }

  if stylesheetVersions.count > 1 {
    let summary = stylesheetVersions
      .sorted { $0.key < $1.key }
      .map { version, pages in
        "\(version): \(pages.sorted().joined(separator: ", "))"
      }
      .joined(separator: " | ")
    failures.append("styles.css version tokens do not match across pages: \(summary)")
  }

  if scriptVersions.count > 1 {
    let summary = scriptVersions
      .sorted { $0.key < $1.key }
      .map { version, pages in
        "\(version): \(pages.sorted().joined(separator: ", "))"
      }
      .joined(separator: " | ")
    failures.append("scripts.js version tokens do not match across pages: \(summary)")
  }

  if !failures.isEmpty {
    fputs("Static site check failed:\n", stderr)
    failures.forEach { failure in
      fputs("- \(failure)\n", stderr)
    }
    exit(1)
  }

  print("Static site check passed.")
  print("Pages checked: \(actualPages.count)")
  if let stylesheetVersion = stylesheetVersions.keys.sorted().first {
    print("Shared styles version: \(stylesheetVersion)")
  }
  if let scriptVersion = scriptVersions.keys.sorted().first {
    print("Shared script version: \(scriptVersion)")
  }
} catch let error as CheckFailure {
  fputs("\(error.message)\n", stderr)
  exit(1)
} catch {
  fputs("Static site check failed: \(error)\n", stderr)
  exit(1)
}
