"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import {
  initializeKakao,
  KAKAO_SDK_INTEGRITY,
  KAKAO_SDK_URL,
} from "./KakaoAuthButton";

type KakaoChannelButtonProps = {
  javascriptKey: string;
  channelPublicId: string;
  onReturn: () => void | Promise<void>;
  onError?: (message: string) => void;
};

export function KakaoChannelButton({
  javascriptKey,
  channelPublicId,
  onReturn,
  onError,
}: KakaoChannelButtonProps) {
  const [ready, setReady] = useState(false);
  const [waitingForReturn, setWaitingForReturn] = useState(false);
  const returnHandledRef = useRef(false);

  useEffect(() => {
    if (!waitingForReturn) return;

    const refreshAfterReturn = () => {
      if (document.visibilityState !== "visible" || returnHandledRef.current) return;
      returnHandledRef.current = true;
      setWaitingForReturn(false);
      window.setTimeout(() => void onReturn(), 900);
    };

    document.addEventListener("visibilitychange", refreshAfterReturn);
    window.addEventListener("focus", refreshAfterReturn);
    return () => {
      document.removeEventListener("visibilitychange", refreshAfterReturn);
      window.removeEventListener("focus", refreshAfterReturn);
    };
  }, [onReturn, waitingForReturn]);

  const addChannel = () => {
    if (!initializeKakao(javascriptKey) || !window.Kakao || !channelPublicId) {
      onError?.("카카오톡 채널 연결을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    returnHandledRef.current = false;
    setWaitingForReturn(true);
    window.Kakao.Channel.addChannel({ channelPublicId });
  };

  return (
    <>
      <Script
        src={KAKAO_SDK_URL}
        integrity={KAKAO_SDK_INTEGRITY}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onReady={() => setReady(initializeKakao(javascriptKey))}
        onError={() => onError?.("카카오톡 채널 모듈을 불러오지 못했어요.")}
      />
      <button
        type="button"
        className="member-channel-add"
        disabled={!javascriptKey || !channelPublicId || !ready || waitingForReturn}
        aria-busy={waitingForReturn}
        onClick={addChannel}
      >
        {waitingForReturn ? "카카오톡에서 추가해 주세요" : "친구 추가하기"}
      </button>
    </>
  );
}
