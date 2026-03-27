import Foundation

struct SyncError: Error {
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
    throw SyncError(message: "No page names found in \(manifestURL.path)")
  }

  return pageNames
}

func loadSiteSettings(from settingsURL: URL) throws -> SiteSettings {
  let data = try Data(contentsOf: settingsURL)
  return try JSONDecoder().decode(SiteSettings.self, from: data)
}

func firstMatchRange(
  in source: String,
  pattern: String,
  options: NSRegularExpression.Options = []
) throws -> Range<String.Index>? {
  let regex = try NSRegularExpression(pattern: pattern, options: options)
  let nsRange = NSRange(source.startIndex..<source.endIndex, in: source)

  guard let match = regex.firstMatch(in: source, range: nsRange) else {
    return nil
  }

  return Range(match.range, in: source)
}

func replacingMatches(
  in source: String,
  pattern: String,
  with replacement: String,
  options: NSRegularExpression.Options = []
) throws -> String {
  let regex = try NSRegularExpression(pattern: pattern, options: options)
  let nsRange = NSRange(source.startIndex..<source.endIndex, in: source)
  return regex.stringByReplacingMatches(in: source, range: nsRange, withTemplate: replacement)
}

func replaceOrInsertLine(
  in source: String,
  pattern: String,
  replacementLine: String,
  anchorPattern: String
) throws -> String {
  let lineOptions: NSRegularExpression.Options = [.anchorsMatchLines]

  if let range = try firstMatchRange(in: source, pattern: pattern, options: lineOptions) {
    return source.replacingCharacters(in: range, with: replacementLine)
  }

  guard let anchorRange = try firstMatchRange(in: source, pattern: anchorPattern, options: lineOptions) else {
    throw SyncError(message: "Could not find insertion anchor for pattern \(anchorPattern)")
  }

  return source.replacingCharacters(
    in: anchorRange,
    with: String(source[anchorRange]) + "\n" + replacementLine
  )
}

func canonicalURL(for pageName: String, siteURL: String) -> String {
  let trimmedSiteURL = siteURL.hasSuffix("/") ? String(siteURL.dropLast()) : siteURL
  if pageName == "index.html" {
    return "\(trimmedSiteURL)/"
  }

  return "\(trimmedSiteURL)/\(pageName)"
}

func footerLinksMarkup(from links: [FooterLink]) -> String {
  let lines = links.map { link in
    "          <a href=\"\(link.href)\">\(link.label)</a>"
  }

  return (["        <div class=\"footer-links\">"] + lines + ["        </div>"]).joined(separator: "\n")
}

let rootURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
let manifestURL = rootURL.appendingPathComponent("tools/site-pages.txt")
let settingsURL = rootURL.appendingPathComponent("tools/site-settings.json")

do {
  let pageNames = try loadPageNames(from: manifestURL)
  let settings = try loadSiteSettings(from: settingsURL)
  let canonicalLinePattern = #"^\s*<link rel="canonical" href="[^"]+" />\s*$"#
  let canonicalAnchorPattern = #"^\s*<meta name="color-scheme" content="[^"]+" />\s*$"#
  let ogURLLinePattern = #"^\s*<meta property="og:url" content="[^"]+" />\s*$"#
  let ogTypeAnchorPattern = #"^\s*<meta property="og:type" content="[^"]+" />\s*$"#
  let footerLinksPattern = #"[ \t]*<div class="footer-links">\s*(?:[ \t]*<a href="[^"]+">[^<]+</a>\s*)+[ \t]*</div>"#
  let footerNotePattern = #"^\s*<p class="footer-note">.*</p>\s*$"#

  for pageName in pageNames {
    let pageURL = rootURL.appendingPathComponent(pageName)

    guard FileManager.default.fileExists(atPath: pageURL.path) else {
      throw SyncError(message: "Cannot sync missing page \(pageName)")
    }

    var html = try String(contentsOf: pageURL, encoding: .utf8)
    let canonicalLine = "    <link rel=\"canonical\" href=\"\(canonicalURL(for: pageName, siteURL: settings.site_url))\" />"
    let ogURLLine = "    <meta property=\"og:url\" content=\"\(canonicalURL(for: pageName, siteURL: settings.site_url))\" />"

    html = try replacingMatches(
      in: html,
      pattern: #"styles\.css\?v=[^"]+"#,
      with: "styles.css?v=\(settings.styles_version)"
    )
    html = try replacingMatches(
      in: html,
      pattern: #"scripts\.js\?v=[^"]+"#,
      with: "scripts.js?v=\(settings.scripts_version)"
    )

    html = try replaceOrInsertLine(
      in: html,
      pattern: canonicalLinePattern,
      replacementLine: canonicalLine,
      anchorPattern: canonicalAnchorPattern
    )
    html = try replaceOrInsertLine(
      in: html,
      pattern: ogURLLinePattern,
      replacementLine: ogURLLine,
      anchorPattern: ogTypeAnchorPattern
    )

    html = try replacingMatches(
      in: html,
      pattern: footerLinksPattern,
      with: footerLinksMarkup(from: settings.footer_links),
      options: [.dotMatchesLineSeparators]
    )
    html = try replaceOrInsertLine(
      in: html,
      pattern: footerNotePattern,
      replacementLine: "        <p class=\"footer-note\">\(settings.footer_note)</p>",
      anchorPattern: #"^\s*</div>\s*$"#
    )

    try html.write(to: pageURL, atomically: true, encoding: .utf8)
  }

  print("Synced shared page metadata and footer content across \(pageNames.count) pages.")
} catch let error as SyncError {
  fputs("\(error.message)\n", stderr)
  exit(1)
} catch {
  fputs("Sync failed: \(error)\n", stderr)
  exit(1)
}
