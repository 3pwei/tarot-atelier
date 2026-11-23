import { BrowserServices } from "@/composition/BrowserServices";
import { HomePage } from "@/presentation/pages/HomePage";

export default function Page() {
  return (
    <BrowserServices>
      <HomePage />
    </BrowserServices>
  );
}
