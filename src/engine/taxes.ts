import type { Bilingual } from "./economy/types";

export const TAX_IDS = [
  "personalIncome",
  "vat",
  "corporateIncome",
  "importDuty",
  "excise",
  "luxury",
] as const;
export const TAX_LEVELS = ["relief", "standard", "increased"] as const;
export type TaxId = (typeof TAX_IDS)[number];
export type TaxLevel = (typeof TAX_LEVELS)[number];
export type TaxSettings = Record<TaxId, TaxLevel>;
export type TaxDefinition = {
  id: TaxId;
  name: Bilingual;
  description: Bilingual;
  tradeoff: Bilingual;
  rates: Record<TaxLevel, number>;
};

export const taxLevelNames: Record<TaxLevel, Bilingual> = {
  relief: { en: "Relief", id: "Ringan" },
  standard: { en: "Standard", id: "Standar" },
  increased: { en: "Increased", id: "Tinggi" },
};

// These effective rates are game tuning, not statutory Indonesian tax rates.
export const taxDefinitions: TaxDefinition[] = [
  {
    id: "personalIncome",
    name: { en: "Personal income tax (PPh)", id: "PPh orang pribadi" },
    description: {
      en: "Tax on household labor earnings. Policy transfers are excluded.",
      id: "Pajak atas penghasilan kerja rumah tangga. Bantuan kebijakan tidak termasuk.",
    },
    tradeoff: {
      en: "Higher rates raise revenue but reduce take-home pay and growth.",
      id: "Tarif tinggi menambah penerimaan, tetapi mengurangi pendapatan bersih dan pertumbuhan.",
    },
    rates: { relief: 10, standard: 12, increased: 14 },
  },
  {
    id: "vat",
    name: { en: "Value-added tax (PPN)", id: "PPN" },
    description: {
      en: "A broad tax on household purchases.",
      id: "Pajak luas atas pembelian barang dan jasa rumah tangga.",
    },
    tradeoff: {
      en: "Higher rates raise revenue but reduce household purchasing power and consumption.",
      id: "Tarif tinggi menambah penerimaan, tetapi mengurangi daya beli dan konsumsi rumah tangga.",
    },
    rates: { relief: 11, standard: 12, increased: 14 },
  },
  {
    id: "corporateIncome",
    name: { en: "Corporate income tax (PPh badan)", id: "PPh badan" },
    description: {
      en: "Tax on company profits.",
      id: "Pajak atas laba perusahaan.",
    },
    tradeoff: {
      en: "Higher rates raise revenue but slow business growth and job creation.",
      id: "Tarif tinggi menambah penerimaan, tetapi memperlambat usaha dan penciptaan pekerjaan.",
    },
    rates: { relief: 15, standard: 18, increased: 20 },
  },
  {
    id: "importDuty",
    name: { en: "Import duty", id: "Bea masuk" },
    description: {
      en: "Tax on goods brought in from abroad.",
      id: "Pajak atas barang yang didatangkan dari luar negeri.",
    },
    tradeoff: {
      en: "Higher duties raise revenue, but imported inputs and household purchases cost more.",
      id: "Bea tinggi menambah penerimaan, tetapi bahan baku impor dan pembelian rumah tangga menjadi lebih mahal.",
    },
    rates: { relief: 3, standard: 5, increased: 8 },
  },
  {
    id: "excise",
    name: { en: "Excise", id: "Cukai" },
    description: {
      en: "Tax on products such as tobacco and alcohol.",
      id: "Pajak atas produk seperti tembakau dan alkohol.",
    },
    tradeoff: {
      en: "Higher excise raises revenue and household costs, reducing purchasing power and sales.",
      id: "Cukai tinggi menambah penerimaan dan biaya rumah tangga, sehingga mengurangi daya beli dan penjualan.",
    },
    rates: { relief: 5, standard: 8, increased: 12 },
  },
  {
    id: "luxury",
    name: { en: "Luxury goods tax (PPnBM)", id: "PPnBM" },
    description: {
      en: "Tax on luxury purchases, concentrated on wealthier households.",
      id: "Pajak pembelian barang mewah, terutama ditanggung rumah tangga kaya.",
    },
    tradeoff: {
      en: "Higher rates collect more from wealthy buyers but slow manufacturing and services.",
      id: "Tarif tinggi menarik lebih banyak dari pembeli kaya, tetapi memperlambat industri dan jasa.",
    },
    rates: { relief: 10, standard: 15, increased: 20 },
  },
];

export const defaultTaxes = (): TaxSettings => ({
  personalIncome: "standard",
  vat: "standard",
  corporateIncome: "standard",
  importDuty: "standard",
  excise: "standard",
  luxury: "standard",
});

export const taxSettingsEqual = (a: TaxSettings, b: TaxSettings) =>
  TAX_IDS.every((id) => a[id] === b[id]);
