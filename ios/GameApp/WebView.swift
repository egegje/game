import SwiftUI
import WebKit

/// WKWebView-обёртка над game.eg.je.
/// Прогресс игр хранится в localStorage — постоянное хранилище (.default)
/// сохраняет его между запусками. Страница сама рисует safe-area
/// (viewport-fit=cover), поэтому вью растянуто на весь экран.
struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: cfg)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.allowsBackForwardNavigationGestures = false
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        webView.scrollView.backgroundColor = .systemBackground

        context.coordinator.appURL = url
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var appURL: URL?

        // Внешние ссылки — в Safari, само приложение живёт на своём домене.
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if navigationAction.navigationType == .linkActivated,
               let dest = navigationAction.request.url,
               dest.host != appURL?.host {
                UIApplication.shared.open(dest)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        // Старт без сети: повторяем загрузку через 2 секунды.
        func webView(_ webView: WKWebView,
                     didFailProvisionalNavigation navigation: WKNavigation!,
                     withError error: Error) {
            guard let url = appURL else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                if webView.url == nil {
                    webView.load(URLRequest(url: url))
                }
            }
        }
    }
}
