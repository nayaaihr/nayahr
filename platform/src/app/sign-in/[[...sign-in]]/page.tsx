import { SignIn } from "@clerk/nextjs";
import { BrandLockup } from "@/app/brand-mark";

export default function Page() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "80vh", padding: "40px" }}>
      <div>
        <BrandLockup />
        <SignIn />
      </div>
    </div>
  );
}
