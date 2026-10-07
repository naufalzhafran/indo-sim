import { useLanguage } from "./i18n";
import type { Bilingual, PolicyKind } from "./engine/economy/types";

export const policyKindNames: Record<PolicyKind, Bilingual> = {
  program: { en: "Program", id: "Program" },
  build: { en: "One-time build", id: "Bangun sekali" },
  facility: { en: "Facility program", id: "Program fasilitas" },
};

export const policyKindDescriptions: Record<PolicyKind, Bilingual> = {
  program: {
    en: "Spends money each quarter. Its effects last only while it runs.",
    id: "Memakai dana tiap triwulan. Dampaknya hanya ada selama berjalan.",
  },
  build: {
    en: "Builds regional projects once. Completed gains are permanent, then the policy ends and cannot be launched again.",
    id: "Membangun proyek wilayah sekali. Manfaat yang selesai bersifat permanen, lalu kebijakan berakhir dan tidak dapat dijalankan lagi.",
  },
  facility: {
    en: "Builds facilities first. Their service works only while the policy is active; when stopped, they sit idle with a small upkeep.",
    id: "Membangun fasilitas lebih dahulu. Layanannya hanya bekerja selama kebijakan aktif; saat dihentikan, fasilitas menganggur dengan biaya perawatan kecil.",
  },
};

/** Compact type chip shown beside a policy's category. */
export function PolicyKindBadge({ kind }: { kind: PolicyKind }) {
  const language = useLanguage();
  return (
    <span className="eco-kind-badge" data-kind={kind}>
      {policyKindNames[kind][language]}
    </span>
  );
}
