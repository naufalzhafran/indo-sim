import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { getLanguage, localize, setLanguage, translate } from "./i18n";
import { date, number } from "./components";
import { overlays } from "./mapLayers";

afterEach(() => setLanguage("en"));
describe("regional economy localization", () => {
  it("localizes shared map labels and accessible names without changing identifiers", () => {
    setLanguage("id");
    const onClick = () => {};
    const button = localize(
      createElement(
        "button",
        {
          id: "Map layer",
          value: "Map layer",
          "aria-label": "Map layer",
          onClick,
        },
        "Map layer",
      ),
    ) as ReturnType<typeof createElement>;
    expect(button.props).toMatchObject({
      id: "Map layer",
      value: "Map layer",
      "aria-label": "Lapisan peta",
      onClick,
      children: "Lapisan peta",
    });
    for (const layer of Object.values(overlays))
      expect(translate(layer.name)).not.toBe(layer.name);
    expect(translate("Unknown player text")).toBe("Unknown player text");
    expect(translate("constructor")).toBe("constructor");
  });
  it("formats economic values and dates for the selected language", () => {
    setLanguage("id");
    expect(number(1234.5)).toBe("1.234,5");
    expect(date(1)).toBe("Februari 2025");
    setLanguage("en");
    expect(getLanguage()).toBe("en");
    expect(number(1234.5)).toBe("1,234.5");
    expect(date(1)).toBe("February 2025");
  });
});
