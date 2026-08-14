"use client";

import Image from "next/image";
import Script from "next/script";
import { useCallback, useState } from "react";

export const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js";
export const KAKAO_SDK_INTEGRITY = "sha384-zt/G7/KfaRQ9dT/QIkS0ujMtzouJqzuSJcXVQu50x0rl/+mD1dc70AeOejVbMD9E";
export const KAKAO_MEMBERSHIP_SCOPE = "profile_nickname,plusfriends";
const KAKAO_LOGIN_BUTTON_IMAGE =
  "https://developers.kakao.com/tool/resource/static/img/button/login/full/ko/kakao_login_large_wide.png";

export type KakaoSdk = {
  init: (javascriptKey: string) => void;
  isInitialized: () => boolean;
  Auth: {
    authorize: (options: {
      redirectUri: string;
      state: string;
      channelPublicId?: string;
      scope?: string;
    }) => void;
  };
  Channel: {
    addChannel: (options: { channelPublicId: string }) => void;
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
  scope?: string;
  onError?: (message: string) => void;
};

export function initializeKakao(javascriptKey: string) {
  if (!window.Kakao || !javascriptKey) return false;
  if (!window.Kakao.isInitialized()) window.Kakao.init(javascriptKey);
  return window.Kakao.isInitialized();
}

export function KakaoAuthButton({
  javascriptKey,
  channelPublicId,
  storeCode,
  returnTo,
  scope,
  onError,
}: KakaoAuthButtonProps) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const startLogin = useCallback(async () => {
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
        scope: scope ?? KAKAO_MEMBERSHIP_SCOPE,
      });
    } catch (error) {
      setLoading(false);
      onError?.(error instanceof Error ? error.message : "카카오 로그인을 시작하지 못했어요.");
    }
  }, [channelPublicId, javascriptKey, onError, returnTo, scope, storeCode]);

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
      <button
        type="button"
        className="kakao-login-button"
        disabled={!javascriptKey || !ready || loading}
        aria-label={loading ? "카카오 로그인 진행 중" : "카카오 로그인"}
        aria-busy={loading}
        onClick={() => void startLogin()}
      >
        <Image
          className="kakao-login-resource"
          src={KAKAO_LOGIN_BUTTON_IMAGE}
          alt=""
          width={600}
          height={90}
          unoptimized
        />
      </button>
    </>
  );
}
