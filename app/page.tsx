import { redirect } from "next/navigation";
import { DEFAULT_STORE_CODE } from "../lib/stores";

export default function Home() {
  redirect(`/s/${DEFAULT_STORE_CODE}`);
}
