import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type {
  WebViewMessageEvent,
  WebViewNavigation,
} from "react-native-webview";

const BRIDGE_JS = `(function() {
  function isCdn(url) {
    return !!url && (url.indexOf('images.unsplash.com') !== -1 || url.indexOf('plus.unsplash.com') !== -1);
  }
  function srcFromImg(img) {
    if (!img) return '';
    var src = img.currentSrc || img.src || '';
    if (isCdn(src) && src.indexOf('profile-') === -1) return src;
    var srcset = img.getAttribute('srcset') || '';
    var parts = srcset.split(',');
    for (var i = 0; i < parts.length; i++) {
      var candidate = parts[i].trim().split(' ')[0];
      if (isCdn(candidate) && candidate.indexOf('profile-') === -1) return candidate;
    }
    return '';
  }
  function pickBest() {
    var dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      var dialogImgs = Array.from(dialog.querySelectorAll('img'));
      var bestDialog = '';
      var bestDialogArea = 0;
      dialogImgs.forEach(function(img) {
        var src = srcFromImg(img);
        if (!src) return;
        var area = (img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0);
        if (area >= bestDialogArea) {
          bestDialogArea = area;
          bestDialog = src;
        }
      });
      if (bestDialog) return bestDialog;
    }
    var imgs = Array.from(document.querySelectorAll('img'));
    var bestVisible = '';
    var bestVisibleArea = 0;
    var best = '';
    var bestArea = 0;
    imgs.forEach(function(img) {
      var src = srcFromImg(img);
      if (!src) return;
      var rect = img.getBoundingClientRect();
      var area = Math.max(0, rect.width) * Math.max(0, rect.height);
      if (area >= bestArea) {
        bestArea = area;
        best = src;
      }
      var visible = rect.bottom > 0 && rect.top < window.innerHeight && area > 80 * 80;
      if (visible && area >= bestVisibleArea) {
        bestVisibleArea = area;
        bestVisible = src;
      }
    });
    if (bestVisible) return bestVisible;
    var og = document.querySelector('meta[property="og:image"]');
    if (og && isCdn(og.content)) return og.content;
    var twitter = document.querySelector('meta[name="twitter:image"]');
    if (twitter && isCdn(twitter.content)) return twitter.content;
    return best;
  }
  window.__gymUnsplashPick = function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ url: pickBest() || '' }));
  };
  if (!window.__gymUnsplashClick) {
    window.__gymUnsplashClick = true;
    document.addEventListener('click', function(e) {
      var node = e.target;
      if (!node || !node.closest) return;
      var img = node.closest('img');
      if (!img) {
        var link = node.closest('a');
        if (link) img = link.querySelector('img');
      }
      if (!img) return;
      var src = srcFromImg(img);
      if (!src) return;
      var rect = img.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 80) return;
      e.preventDefault();
      e.stopPropagation();
      window.ReactNativeWebView.postMessage(JSON.stringify({ url: src }));
    }, true);
  }
  true;
})();`;

const EXTRACT_IMAGE_JS = `(function() {
  if (window.__gymUnsplashPick) {
    window.__gymUnsplashPick();
  } else {
    window.ReactNativeWebView.postMessage(JSON.stringify({ url: '' }));
  }
  true;
})();`;

const PHOTO_ID_RE =
  /((?:images|plus)\.unsplash\.com)\/((?:premium_)?photo-[a-zA-Z0-9_-]+)/i;

type UnsplashImagePickerProps = {
  visible: boolean;
  searchQuery?: string;
  width?: number;
  quality?: number;
  onCancel: () => void;
  onSelect: (url: string) => void;
};

function toUnsplashSearchUrl(query: string): string {
  const slug = query.trim().toLowerCase().replace(/\s+/g, "-") || "gym-workout";
  return `https://unsplash.com/s/photos/${encodeURIComponent(slug)}`;
}

function isUnsplashUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "unsplash.com" || host.endsWith(".unsplash.com");
  } catch {
    return false;
  }
}

export function normalizeUnsplashImageUrl(
  raw: string,
  width: number,
  quality: number,
): string | null {
  const match = raw.match(PHOTO_ID_RE);
  if (!match) {
    return null;
  }
  return `https://${match[1]}/${match[2]}?w=${width}&q=${quality}`;
}

export function UnsplashImagePicker({
  visible,
  searchQuery = "gym workout",
  width = 900,
  quality = 80,
  onCancel,
  onSelect,
}: UnsplashImagePickerProps) {
  const isWeb = process.env.EXPO_OS === "web";
  const webViewRef = useRef<WebView>(null);
  const extractTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingExtractRef = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const uri = useMemo(() => toUnsplashSearchUrl(searchQuery), [searchQuery]);

  useEffect(() => {
    if (!visible) {
      pendingExtractRef.current = false;
      setExtracting(false);
      setCanGoBack(false);
      if (extractTimeoutRef.current) {
        clearTimeout(extractTimeoutRef.current);
        extractTimeoutRef.current = null;
      }
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (extractTimeoutRef.current) {
        clearTimeout(extractTimeoutRef.current);
      }
    };
  }, []);

  const clearPendingExtract = () => {
    pendingExtractRef.current = false;
    setExtracting(false);
    if (extractTimeoutRef.current) {
      clearTimeout(extractTimeoutRef.current);
      extractTimeoutRef.current = null;
    }
  };

  const handleNavigation = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleShouldStart = (request: { url: string }) => {
    if (
      request.url.startsWith("about:") ||
      request.url.startsWith("blob:") ||
      request.url.startsWith("data:")
    ) {
      return true;
    }
    return isUnsplashUrl(request.url);
  };

  const handleOpenWindow = (event: { nativeEvent: { targetUrl: string } }) => {
    const targetUrl = event.nativeEvent.targetUrl;
    if (!isUnsplashUrl(targetUrl)) {
      return;
    }
    webViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(targetUrl)}; true;`,
    );
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    const wasExtracting = pendingExtractRef.current;
    clearPendingExtract();
    let raw = "";
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as { url?: string };
      raw = parsed.url ?? "";
    } catch {
      raw = event.nativeEvent.data;
    }
    const normalized = normalizeUnsplashImageUrl(raw, width, quality);
    if (!normalized) {
      if (wasExtracting) {
        Alert.alert(
          "Toca una foto",
          "Toca la imagen que quieres usar, o abre la foto y pulsa Usar esta imagen.",
        );
      }
      return;
    }
    onSelect(normalized);
  };

  const useCurrentImage = () => {
    pendingExtractRef.current = true;
    setExtracting(true);
    webViewRef.current?.injectJavaScript(EXTRACT_IMAGE_JS);
    extractTimeoutRef.current = setTimeout(() => {
      if (!pendingExtractRef.current) {
        return;
      }
      clearPendingExtract();
      Alert.alert(
        "Toca una foto",
        "Toca la imagen que quieres usar, o abre la foto y pulsa Usar esta imagen.",
      );
    }, 2500);
  };

  const openUnsplashInBrowser = () => {
    void Linking.openURL(uri);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (canGoBack) {
          webViewRef.current?.goBack();
          return;
        }
        onCancel();
      }}
    >
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-row items-center gap-2 border-b border-border px-3 py-2">
          {isWeb ? null : (
            <Pressable
              onPress={() => webViewRef.current?.goBack()}
              disabled={!canGoBack}
              className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface"
              accessibilityLabel="Atras"
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={canGoBack ? "#FFFFFF" : "#666666"}
              />
            </Pressable>
          )}
          <View className="flex-1">
            <Text className="text-base font-bold text-white">Elegir imagen</Text>
            <Text className="text-xs text-gray-400">
              Toca una foto para seleccionarla
            </Text>
          </View>
          <Pressable
            onPress={onCancel}
            className="rounded-xl border border-border bg-surface px-3 py-2"
            accessibilityLabel="Cerrar"
          >
            <Text className="text-xs font-bold text-gray-300">Cerrar</Text>
          </Pressable>
        </View>

        {isWeb ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-base font-bold text-white">
              Unsplash no se puede mostrar en web
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-gray-400">
              Abre Unsplash, copia la URL de la imagen y pegala en el campo.
            </Text>
            <Pressable
              onPress={openUnsplashInBrowser}
              className="mt-5 rounded-xl bg-accent-cyan px-5 py-3"
            >
              <Text className="font-semibold text-black">Abrir Unsplash</Text>
            </Pressable>
          </View>
        ) : visible ? (
          <WebView
            ref={webViewRef}
            source={{ uri }}
            style={{ flex: 1, backgroundColor: "#0A0A0A" }}
            startInLoadingState
            javaScriptEnabled
            setSupportMultipleWindows
            originWhitelist={["*"]}
            injectedJavaScript={BRIDGE_JS}
            onLoadEnd={() => {
              webViewRef.current?.injectJavaScript(BRIDGE_JS);
            }}
            onNavigationStateChange={handleNavigation}
            onShouldStartLoadWithRequest={handleShouldStart}
            onOpenWindow={handleOpenWindow}
            onMessage={handleMessage}
            renderLoading={() => (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#0A0A0A",
                }}
              >
                <ActivityIndicator color="#22D3EE" />
              </View>
            )}
          />
        ) : (
          <View className="flex-1 bg-background" />
        )}

        {isWeb ? null : (
          <View className="border-t border-border px-4 py-3">
            <Pressable
              onPress={useCurrentImage}
              disabled={extracting}
              className={`h-12 items-center justify-center rounded-xl bg-accent-cyan ${extracting ? "opacity-50" : ""}`}
            >
              {extracting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text className="text-base font-semibold text-black">
                  Usar esta imagen
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
