import Link from "next/link";
import { DEFAULT_STORE_CODE } from "../lib/stores";

export default function NotFound() {
  return (
    <main className="not-found">
      <span>404</span>
      <h1>매장을 찾을 수 없어요</h1>
      <p>QR 코드가 손상됐거나 운영이 종료된 매장일 수 있어요.</p>
      <Link href={`/s/${DEFAULT_STORE_CODE}`}>기본 매장으로 이동</Link>
    </main>
  );
}
