import { SignUp } from "@clerk/nextjs";
import { BrandLockup } from "@/app/brand-mark";

export default function Page() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "80vh", padding: "40px" }}>
      <div>
        <BrandLockup />
        <SignUp />
      </div>
    </div>
  );
}
