"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreConfig } from "../../lib/stores";

export type DetailSection = "attendance" | "coupons" | "points" | "store";

const detailMeta: Record<DetailSection, { eyebrow: string; title: string; description: string; icon: string; tone: string }> = {
  attendance: {
    eyebrow: "DAILY CHECK-IN",
    title: "출석체크",
    description: "매일 방문하고 포인트와 쿠폰을 받아보세요.",
    icon: "attendance",
    tone: "mint",
  },
  coupons: {
    eyebrow: "MY COUPONS",
    title: "내 쿠폰함",
    description: "사용할 수 있는 혜택을 한눈에 확인하세요.",
    icon: "ticket",
    tone: "coral",
  },
  points: {
    eyebrow: "MY POINTS",
    title: "포인트",
    description: "쌓고 사용한 포인트 내역을 확인하세요.",
    icon: "points",
    tone: "blue",
  },
  store: {
    eyebrow: "STORE INFO",
    title: "매장정보",
    description: "방문 전 위치와 영업시간을 확인하세요.",
    icon: "store",
    tone: "sand",
  },
};

type StoreDetailProps = {
  store: StoreConfig;
  section: DetailSection;
};

function DetailCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`detail-card ${className}`}>{children}</section>;
}

export function StoreDetail({ store, section }: StoreDetailProps) {
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(false);
  const [toast, setToast] = useState("");
  const meta = detailMeta[section];
  const theme = {
    "--navy": store.theme.navy,
    "--deep": store.theme.navy,
    "--blue": store.theme.blue,
    "--aqua": store.theme.aqua,
    "--coral": store.theme.coral,
    "--cream": store.theme.cream,
  } as CSSProperties;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  return (
    <main className="app-shell detail-shell" style={theme}>
      <header className="detail-header">
        <button className="detail-back" onClick={() => router.push(`/s/${store.publicCode}`)} aria-label="홈으로 돌아가기">
          ←
        </button>
        <div className="detail-brand">
          <strong>{store.displayName}</strong>
          <span>{store.branchName}</span>
        </div>
      </header>

      <section className="detail-intro">
        <div>
          <span className="detail-eyebrow">{meta.eyebrow}</span>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
        <span className={`quick-icon detail-main-icon ${meta.tone}`}>
          <span className={`menu-icon ${meta.icon}`} aria-hidden="true" />
        </span>
      </section>

      <div className="detail-content">
        {section === "attendance" && (
          <>
            <DetailCard className="attendance-card">
              <div className="detail-card-heading">
                <div><span>7월 출석 현황</span><strong>이번 달 2일 출석</strong></div>
                <b>2 / 7</b>
              </div>
              <div className="stamp-row">
                {["23", "24", "25", "26", "27", "28", "오늘"].map((day, index) => (
                  <div className={index < 2 || checkedIn && index === 6 ? "stamped" : ""} key={day}>
                    <span>{index < 2 || checkedIn && index === 6 ? "✓" : day}</span>
                    <small>{index === 6 ? "오늘" : `${day}일`}</small>
                  </div>
                ))}
              </div>
              <button
                className="detail-primary"
                disabled={checkedIn}
                onClick={() => {
                  setCheckedIn(true);
                  notify("출석 완료! 100P가 적립됐어요.");
                }}
              >
                {checkedIn ? "오늘 출석 완료" : "출석하고 100P 받기"}
              </button>
            </DetailCard>
            <DetailCard className="reward-card">
              <span className="mini-label">7 DAYS REWARD</span>
              <h2>7일 출석하면<br />매운탕 무료 쿠폰</h2>
              <div className="reward-progress"><span style={{ width: checkedIn ? "43%" : "29%" }} /></div>
              <p>{checkedIn ? "4번" : "5번"} 더 출석하면 쿠폰을 받을 수 있어요.</p>
            </DetailCard>
          </>
        )}

        {section === "coupons" && (
          <>
            <div className="detail-summary">
              <span>사용 가능 쿠폰</span>
              <strong>{store.coupons.length + 1}<small>장</small></strong>
              <p>기간이 짧은 쿠폰부터 사용해 보세요.</p>
            </div>
            <div className="coupon-list detail-coupon-list">
              {store.coupons.map((coupon, index) => (
                <article className="coupon" key={coupon.title}>
                  <div className={`coupon-badge ${coupon.color}`}>
                    <b>{coupon.discount}</b><span>COUPON</span>
                  </div>
                  <div className="coupon-copy">
                    <strong>{coupon.title}</strong><p>{coupon.description}</p>
                    <span>{coupon.due} · D-{index ? 12 : 5}</span>
                  </div>
                  <button className="coupon-use" onClick={() => notify("직원에게 이 화면을 보여주세요.")}>사용</button>
                </article>
              ))}
              <article className="coupon">
                <div className="coupon-badge coral"><b>3천원</b><span>COUPON</span></div>
                <div className="coupon-copy">
                  <strong>카카오 친구 감사 할인</strong><p>3만원 이상 주문 시 사용 가능</p><span>2026.08.31까지 · D-33</span>
                </div>
                <button className="coupon-use" onClick={() => notify("직원에게 이 화면을 보여주세요.")}>사용</button>
              </article>
            </div>
          </>
        )}

        {section === "points" && (
          <>
            <div className="point-balance">
              <span>사용 가능한 포인트</span>
              <strong>2,450<small>P</small></strong>
              <div><span>이번 달 적립 <b>+300P</b></span><span>이번 달 사용 <b>-1,000P</b></span></div>
            </div>
            <DetailCard>
              <div className="list-heading"><h2>포인트 내역</h2><button onClick={() => notify("최근 3개월 내역이에요.")}>최근 3개월⌄</button></div>
              <ul className="point-list">
                <li><span><b>매장 방문 적립</b><small>7월 29일 · 청주점</small></span><strong className="plus">+100P</strong></li>
                <li><span><b>모둠회 주문 적립</b><small>7월 21일 · 청주점</small></span><strong className="plus">+200P</strong></li>
                <li><span><b>쿠폰 교환</b><small>7월 12일 · 포인트 사용</small></span><strong>-1,000P</strong></li>
                <li><span><b>첫 친구 추가 적립</b><small>6월 30일 · 카카오 채널</small></span><strong className="plus">+500P</strong></li>
              </ul>
            </DetailCard>
          </>
        )}

        {section === "store" && (
          <>
            <DetailCard className="store-map-card">
              <div className="map-placeholder" aria-hidden="true"><span>어시장<br />브라더스</span><b>⌖</b></div>
              <div className="store-address">
                <span>{store.branchName}</span><h2>{store.displayName}</h2><p>{store.address}</p>
                <button onClick={() => notify("주소를 복사했어요.")}>주소 복사</button>
              </div>
            </DetailCard>
            <DetailCard>
              <dl className="store-details">
                <div><dt>영업시간</dt><dd><b>오늘 영업중</b><span>16:00 – 24:00</span></dd></div>
                <div><dt>라스트오더</dt><dd><span>23:00</span></dd></div>
                <div><dt>휴무일</dt><dd><span>매주 월요일</span></dd></div>
                <div><dt>편의정보</dt><dd><span>단체석 · 포장 · 주차</span></dd></div>
              </dl>
            </DetailCard>
            <div className="store-actions">
              <button onClick={() => notify("전화 연결 기능을 준비 중이에요.")}>전화하기</button>
              <button onClick={() => notify("지도 앱 연결 기능을 준비 중이에요.")}>길찾기</button>
            </div>
          </>
        )}
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
