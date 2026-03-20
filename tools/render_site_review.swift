import AppKit
import Foundation
import PDFKit
import WebKit

final class SiteReviewRenderer: NSObject, WKNavigationDelegate {
  private let pageNames: [String]
  private let rootURL: URL
  private let pagesDir: URL
  private let combinedURL: URL
  private let viewportWidth: CGFloat = 1440
  private var currentIndex = 0
  private var renderedPageURLs: [URL] = []
  private var webView: WKWebView?

  init(pageNames: [String], rootURL: URL, outputDir: URL) {
    self.pageNames = pageNames
    self.rootURL = rootURL
    self.pagesDir = outputDir.appendingPathComponent("pages", isDirectory: true)
    self.combinedURL = outputDir.appendingPathComponent("Parl-AI-ment-site-review.pdf")
    super.init()
  }

  func start() throws {
    try FileManager.default.createDirectory(at: pagesDir, withIntermediateDirectories: true)
    renderNextPage()
  }

  private func renderNextPage() {
    guard currentIndex < pageNames.count else {
      combineAndFinish()
      return
    }

    let pageName = pageNames[currentIndex]
    let pageURL = rootURL.appendingPathComponent(pageName)

    let config = WKWebViewConfiguration()
    config.preferences.setValue(true, forKey: "developerExtrasEnabled")

    let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: viewportWidth, height: 1200), configuration: config)
    webView.navigationDelegate = self
    webView.setValue(false, forKey: "drawsBackground")
    self.webView = webView
    webView.loadFileURL(pageURL, allowingReadAccessTo: rootURL)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) {
      self.createPDF(for: webView)
    }
  }

  private func createPDF(for webView: WKWebView) {
    let pageName = pageNames[currentIndex]
    let safeBaseName = pageName.replacingOccurrences(of: ".html", with: "")
    let outputURL = pagesDir.appendingPathComponent("\(safeBaseName).pdf")
    let script = """
    Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    """

    webView.evaluateJavaScript(script) { result, error in
      if let error {
        fputs("Failed measuring \(pageName): \(error)\n", stderr)
        NSApp.terminate(nil)
        return
      }

      let jsHeight = (result as? NSNumber)?.doubleValue ?? 1200
      let contentHeight = max(CGFloat(jsHeight), 1200)
      let configuration = WKPDFConfiguration()
      configuration.rect = CGRect(x: 0, y: 0, width: self.viewportWidth, height: contentHeight)

      webView.createPDF(configuration: configuration) { result in
        switch result {
        case .success(let data):
          do {
            try data.write(to: outputURL)
            self.renderedPageURLs.append(outputURL)
            self.currentIndex += 1
            self.renderNextPage()
          } catch {
            fputs("Failed writing PDF for \(pageName): \(error)\n", stderr)
            NSApp.terminate(nil)
          }
        case .failure(let error):
          fputs("Failed rendering \(pageName): \(error)\n", stderr)
          NSApp.terminate(nil)
        }
      }
    }
  }

  private func combineAndFinish() {
    let combined = PDFDocument()
    var insertIndex = 0

    for pageURL in renderedPageURLs {
      guard let doc = PDFDocument(url: pageURL) else { continue }
      for pageIndex in 0..<doc.pageCount {
        guard let page = doc.page(at: pageIndex) else { continue }
        combined.insert(page, at: insertIndex)
        insertIndex += 1
      }
    }

    if combined.write(to: combinedURL) {
      print("Combined PDF created at \(combinedURL.path)")
      print("Individual PDFs created in \(pagesDir.path)")
    } else {
      fputs("Failed writing combined PDF\n", stderr)
    }

    NSApp.terminate(nil)
  }
}

let pageNames = [
  "index.html",
  "why-now.html",
  "waitlist.html",
  "reports.html",
  "matters.html",
  "matter-detail.html",
  "chamber.html",
  "hans-ai-rd.html",
  "record.html",
  "bring-your-agent.html",
  "lords.html",
  "memory-and-safety.html",
  "how-it-works.html",
  "submit-a-matter.html",
  "verification.html",
  "agent-join-spec.html",
  "charter.html",
]

let rootURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
let outputDir = rootURL.appendingPathComponent("output/site-review", isDirectory: true)

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

do {
  try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)
  let renderer = SiteReviewRenderer(pageNames: pageNames, rootURL: rootURL, outputDir: outputDir)
  try renderer.start()
  app.run()
} catch {
  fputs("Failed preparing output directory: \(error)\n", stderr)
  exit(1)
}
