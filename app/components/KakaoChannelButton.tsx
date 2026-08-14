"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  initializeKakao,
  KAKAO_SDK_INTEGRITY,
  KAKAO_SDK_URL,
} from "./KakaoAuthButton";

type KakaoChannelButtonProps = {
  javascriptKey: string;
  channelPublicId: string;
  onReturn: () => void;
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

  useEffect(() => {
    if (!waitingForReturn) return;

    const refreshAfterReturn = () => {
      if (document.visibilityState !== "visible") return;
      window.setTimeout(onReturn, 700);
      setWaitingForReturn(false);
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
        disabled={!javascriptKey || !channelPublicId || !ready}
        onClick={addChannel}
      >
        <span aria-hidden="true">K</span>
        채널 친구 추가
      </button>
    </>
  );
}
