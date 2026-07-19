import SwiftUI

@main
struct GameApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://game.eg.je/")!)
            .ignoresSafeArea()
    }
}
