"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js";
const KAKAO_SDK_INTEGRITY = "sha384-zt/G7/KfaRQ9dT/QIkS0ujMtzouJqzuSJcXVQu50x0rl/+mD1dc70AeOejVbMD9E";

type KakaoSdk = {
  init: (javascriptKey: string) => void;
  isInitialized: () => boolean;
  Auth: {
    authorize: (options: {
      redirectUri: string;
      state: string;
      channelPublicId?: string;
      prompt?: "none";
    }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

type KakaoAuthButtonProps = {
  javascriptKey: string;
  channelPublicId: string;
  storeCode: string;
  returnTo: string;
  label?: string;
  className?: string;
  autoLogin?: boolean;
  autoLoginKey?: string;
  hidden?: boolean;
  onError?: (message: string) => void;
};

function initializeKakao(javascriptKey: string) {
  if (!window.Kakao || !javascriptKey) return false;
  if (!window.Kakao.isInitialized()) window.Kakao.init(javascriptKey);
  return window.Kakao.isInitialized();
}

export function KakaoAuthButton({
  javascriptKey,
  channelPublicId,
  storeCode,
  returnTo,
  label = "카카오로 1초 로그인",
  className = "kakao-login-button",
  autoLogin = false,
  autoLoginKey = "guest",
  hidden = false,
  onError,
}: KakaoAuthButtonProps) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const startLogin = useCallback(async (silent = false) => {
    if (!initializeKakao(javascriptKey) || !window.Kakao) {
      onError?.("카카오 로그인을 불러오는 중이에요. 잠시 후 다시 눌러주세요.");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({ storeCode, returnTo });
      const response = await fetch(`/api/auth/kakao/state?${params}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = (await response.json()) as { state?: string; error?: string };

      if (!response.ok || !result.state) {
        throw new Error(result.error ?? "로그인 준비에 실패했습니다.");
      }

      window.Kakao.Auth.authorize({
        redirectUri: `${window.location.origin}/api/auth/kakao/callback`,
        state: result.state,
        ...(channelPublicId ? { channelPublicId } : {}),
        ...(silent ? { prompt: "none" as const } : {}),
      });
    } catch (error) {
      setLoading(false);
      onError?.(error instanceof Error ? error.message : "카카오 로그인을 시작하지 못했어요.");
    }
  }, [channelPublicId, javascriptKey, onError, returnTo, storeCode]);

  useEffect(() => {
    if (!autoLogin || !ready) return;
    if (!/KAKAOTALK/i.test(window.navigator.userAgent)) return;
    if (new URLSearchParams(window.location.search).has("auth")) return;

    const guardKey = `kakaoSilentLogin:${storeCode}:${autoLoginKey}`;
    if (window.sessionStorage.getItem(guardKey) === "1") return;

    window.sessionStorage.setItem(guardKey, "1");
    const timer = window.setTimeout(() => void startLogin(true), 0);
    return () => window.clearTimeout(timer);
  }, [autoLogin, autoLoginKey, ready, startLogin, storeCode]);

  return (
    <>
      <Script
        src={KAKAO_SDK_URL}
        integrity={KAKAO_SDK_INTEGRITY}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onReady={() => setReady(initializeKakao(javascriptKey))}
        onError={() => onError?.("카카오 로그인 모듈을 불러오지 못했어요.")}
      />
      {!hidden && (
        <button
          type="button"
          className={className}
          disabled={!javascriptKey || loading}
          onClick={() => void startLogin(false)}
        >
          <span aria-hidden="true">K</span>
          {loading ? "카카오톡 여는 중…" : label}
        </button>
      )}
    </>
  );
}
