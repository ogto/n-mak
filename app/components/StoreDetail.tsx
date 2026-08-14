"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberView, PublicKakaoConfig } from "../../lib/auth/types";
import type { MembershipCouponView, MembershipDetailView } from "../../lib/membership";
import type { StoreConfig } from "../../lib/stores";
import { KakaoAuthButton } from "./KakaoAuthButton";

export type DetailSection = "attendance" | "coupons" | "points" | "store";

const detailMeta: Record<DetailSection, { eyebrow: string; title: string; description: string; icon: string; tone: string }> = {
  attendance: {
    eyebrow: "DAILY CHECK-IN",
    title: "출석체크",
    description: "하루 한 번 출석하고 100P를 받아보세요.",
    icon: "attendance",
    tone: "mint",
  },
  coupons: {
    eyebrow: "MY COUPONS",
    title: "내 쿠폰함",
    description: "게임과 이벤트로 받은 쿠폰을 확인하세요.",
    icon: "ticket",
    tone: "coral",
  },
  points: {
    eyebrow: "MY POINTS",
    title: "포인트",
    description: "적립한 포인트와 이용 내역을 확인하세요.",
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
  member: MemberView | null;
  membership: MembershipDetailView | null;
  kakao: PublicKakaoConfig;
};

type CheckinResponse = {
  awarded?: boolean;
  pointsBalance?: number;
  visitCount?: number;
  visitDate?: string;
  error?: string;
};

type RedeemCouponResponse = {
  redeemed?: boolean;
  couponId?: string;
  error?: string;
};

function DetailCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`detail-card ${className}`}>{children}</section>;
}

function seoulDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function recentSevenDays() {
  const todayKey = seoulDateKey();
  const base = new Date(`${todayKey}T00:00:00Z`);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      day: String(date.getUTCDate()),
      label: index === 6 ? "오늘" : ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()],
    };
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function StoreDetail({ store, section, member, membership, kakao }: StoreDetailProps) {
  const router = useRouter();
  const [data, setData] = useState(membership);
  const [checkingIn, setCheckingIn] = useState(false);
  const [redeemingCoupon, setRedeemingCoupon] = useState<MembershipCouponView | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [toast, setToast] = useState("");
  const meta = detailMeta[section];
  const days = recentSevenDays();
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
    window.setTimeout(() => setToast(""), 2200);
  };

  const checkIn = async () => {
    if (!data || checkingIn || data.checkedInToday) return;
    setCheckingIn(true);

    try {
      const response = await fetch("/api/membership/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCode: store.publicCode }),
      });
      const result = await response.json() as CheckinResponse;

      if (!response.ok || typeof result.pointsBalance !== "number" || typeof result.visitCount !== "number") {
        throw new Error(result.error ?? "출석 처리에 실패했습니다.");
      }

      const visitDate = result.visitDate ?? seoulDateKey();
      setData((current) => current ? {
        ...current,
        pointsBalance: result.pointsBalance as number,
        lifetimePoints: current.lifetimePoints + (result.awarded ? 100 : 0),
        visitCount: result.visitCount as number,
        checkedInToday: true,
        checkinDates: current.checkinDates.includes(visitDate)
          ? current.checkinDates
          : [visitDate, ...current.checkinDates],
        pointTransactions: result.awarded ? [{
          id: `checkin-${visitDate}`,
          amount: 100,
          balanceAfter: result.pointsBalance as number,
          description: "일일 출석체크",
          createdAt: new Date().toISOString(),
        }, ...current.pointTransactions] : current.pointTransactions,
      } : current);
      notify(result.awarded ? "출석 완료! 100P가 적립됐어요." : "오늘은 이미 출석했어요.");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "출석 처리에 실패했습니다.");
    } finally {
      setCheckingIn(false);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(store.address);
      notify("주소를 복사했어요.");
    } catch {
      notify(store.address);
    }
  };

  const redeemCoupon = async () => {
    if (!redeemingCoupon || redeeming) return;
    setRedeeming(true);

    try {
      const response = await fetch(`/api/membership/coupons/${redeemingCoupon.id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCode: store.publicCode }),
      });
      const result = await response.json() as RedeemCouponResponse;

      if (!response.ok || !result.redeemed || result.couponId !== redeemingCoupon.id) {
        throw new Error(result.error ?? "쿠폰을 사용 처리하지 못했습니다.");
      }

      setData((current) => current ? {
        ...current,
        coupons: current.coupons.map((coupon) => coupon.id === redeemingCoupon.id
          ? { ...coupon, status: "used" as const }
          : coupon),
      } : current);
      setRedeemingCoupon(null);
      notify("쿠폰 사용이 완료됐어요.");
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "쿠폰을 사용 처리하지 못했습니다.");
    } finally {
      setRedeeming(false);
    }
  };

  const privateSection = section !== "store";
  const checkinDateSet = new Set(data?.checkinDates ?? []);
  const recentCheckinCount = days.filter((day) => checkinDateSet.has(day.key)).length;
  const availableCoupons = data?.coupons.filter((coupon) => coupon.status === "available") ?? [];

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
        {privateSection && (!member || !data) && (
          <DetailCard className="detail-login-card">
            <span className="auth-bubble" aria-hidden="true">K</span>
            <h2>카카오로 로그인해 주세요</h2>
            <p>내 출석, 쿠폰, 포인트를 안전하게 불러올게요.</p>
            <KakaoAuthButton
              javascriptKey={kakao.javascriptKey}
              channelPublicId={kakao.channelPublicId}
              storeCode={store.publicCode}
              returnTo={`/s/${store.publicCode}/${section}`}
              onError={notify}
            />
          </DetailCard>
        )}

        {section === "attendance" && data && (
          <>
            <DetailCard className="attendance-card">
              <div className="detail-card-heading">
                <div><span>최근 7일 출석 현황</span><strong>누적 방문 {data.visitCount}회</strong></div>
                <b>{recentCheckinCount} / 7</b>
              </div>
              <div className="stamp-row">
                {days.map((day) => {
                  const stamped = checkinDateSet.has(day.key);
                  return (
                    <div className={stamped ? "stamped" : ""} key={day.key}>
                      <span>{stamped ? "✓" : day.day}</span>
                      <small>{day.label}</small>
                    </div>
                  );
                })}
              </div>
              <button
                className="detail-primary"
                disabled={data.checkedInToday || checkingIn}
                onClick={checkIn}
              >
                {data.checkedInToday ? "오늘 출석 완료" : checkingIn ? "출석 처리 중…" : "출석하고 100P 받기"}
              </button>
            </DetailCard>
            <DetailCard className="reward-card">
              <span className="mini-label">MEMBERSHIP POINT</span>
              <h2>출석할 때마다<br />100P가 바로 적립돼요</h2>
              <div className="reward-progress"><span style={{ width: `${Math.max(8, recentCheckinCount / 7 * 100)}%` }} /></div>
              <p>현재 사용 가능한 포인트는 {data.pointsBalance.toLocaleString()}P예요.</p>
            </DetailCard>
          </>
        )}

        {section === "coupons" && data && (
          <>
            <div className="detail-summary">
              <span>사용 가능한 쿠폰</span>
              <strong>{availableCoupons.length}<small>장</small></strong>
              <p>게임과 매장 이벤트에서 받은 쿠폰이 여기에 저장돼요.</p>
            </div>
            {availableCoupons.length > 0 ? (
              <div className="coupon-list detail-coupon-list">
                {availableCoupons.map((coupon, index) => (
                  <article className="coupon" key={coupon.id}>
                    <div className={`coupon-badge ${index % 2 === 0 ? "navy" : "coral"}`}>
                      <b>혜택</b><span>COUPON</span>
                    </div>
                    <div className="coupon-copy">
                      <strong>{coupon.title}</strong>
                      <p>{coupon.description ?? "매장에서 사용할 수 있는 멤버십 쿠폰"}</p>
                      <span>{formatDate(coupon.expiresAt)}까지</span>
                    </div>
                    <button className="coupon-use" onClick={() => setRedeemingCoupon(coupon)}>사용</button>
                  </article>
                ))}
              </div>
            ) : (
              <DetailCard className="detail-empty-card">
                <span className="quick-icon coral"><span className="menu-icon ticket" aria-hidden="true" /></span>
                <h2>아직 받은 쿠폰이 없어요</h2>
                <p>낚시 게임에 참여하면 당첨 쿠폰이 자동으로 보관돼요.</p>
                <button className="detail-primary" onClick={() => router.push(`/s/${store.publicCode}/game`)}>게임 하러 가기</button>
              </DetailCard>
            )}
          </>
        )}

        {section === "points" && data && (
          <>
            <div className="point-balance">
              <span>사용 가능한 포인트</span>
              <strong>{data.pointsBalance.toLocaleString()}<small>P</small></strong>
              <div>
                <span>누적 적립 <b>+{data.lifetimePoints.toLocaleString()}P</b></span>
                <span>누적 방문 <b>{data.visitCount}회</b></span>
              </div>
            </div>
            <DetailCard>
              <div className="list-heading"><h2>포인트 내역</h2><span>최근 30건</span></div>
              {data.pointTransactions.length > 0 ? (
                <ul className="point-list">
                  {data.pointTransactions.map((transaction) => (
                    <li key={transaction.id}>
                      <span>
                        <b>{transaction.description}</b>
                        <small>{formatDate(transaction.createdAt)} · 잔액 {transaction.balanceAfter.toLocaleString()}P</small>
                      </span>
                      <strong className={transaction.amount > 0 ? "plus" : ""}>
                        {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()}P
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="detail-empty-inline">아직 포인트 내역이 없어요.</div>
              )}
            </DetailCard>
          </>
        )}

        {section === "store" && (
          <>
            <DetailCard className="store-map-card">
              <div className="map-placeholder" aria-hidden="true"><span>어시장<br />브라더스</span><b>⌖</b></div>
              <div className="store-address">
                <span>{store.branchName}</span><h2>{store.displayName}</h2><p>{store.address}</p>
                <button onClick={copyAddress}>주소 복사</button>
              </div>
            </DetailCard>
            <DetailCard>
              <dl className="store-details">
                <div><dt>영업시간</dt><dd><b>오늘 영업중</b><span>{store.businessHours ?? "11:00 – 23:00"}</span></dd></div>
                <div><dt>라스트오더</dt><dd><span>{store.lastOrder ?? "22:00"}</span></dd></div>
                <div><dt>휴무일</dt><dd><span>{store.closedDays ?? "연중무휴"}</span></dd></div>
                <div><dt>편의정보</dt><dd><span>단체석 · 포장 · 주차</span></dd></div>
              </dl>
            </DetailCard>
          </>
        )}
      </div>

      {redeemingCoupon && (
        <div className="modal-backdrop coupon-confirm-backdrop" onClick={() => !redeeming && setRedeemingCoupon(null)}>
          <section
            className="coupon-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="quick-icon coral" aria-hidden="true">
              <span className="menu-icon ticket" />
            </span>
            <span className="detail-eyebrow">COUPON USE</span>
            <h2 id="coupon-confirm-title">{redeemingCoupon.title}</h2>
            <p>직원에게 이 화면을 보여드린 뒤 사용 완료를 눌러주세요. 처리 후에는 되돌릴 수 없어요.</p>
            <button className="detail-primary" disabled={redeeming} onClick={redeemCoupon}>
              {redeeming ? "사용 처리 중…" : "직원 확인 · 사용 완료"}
            </button>
            <button className="coupon-confirm-cancel" disabled={redeeming} onClick={() => setRedeemingCoupon(null)}>
              취소
            </button>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
