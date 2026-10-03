import { Suspense } from "react";
import { HomeClient } from "../../features/expenses/components/home-client";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  );
}
