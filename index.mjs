import DOTCOM_DEREF from "./generated/api.github.com.deref.json" with { type: "json" };
import DOTCOM from "./generated/api.github.com.json" with { type: "json" };
import GHEC_DEREF from "./generated/ghec.deref.json" with { type: "json" };
import GHEC from "./generated/ghec.json" with { type: "json" };
import GHES_310_DEREF from "./generated/ghes-3.10.deref.json" with { type: "json" };
import GHES_310 from "./generated/ghes-3.10.json" with { type: "json" };
import GHES_311_DEREF from "./generated/ghes-3.11.deref.json" with { type: "json" };
import GHES_311 from "./generated/ghes-3.11.json" with { type: "json" };
import GHES_312_DEREF from "./generated/ghes-3.12.deref.json" with { type: "json" };
import GHES_312 from "./generated/ghes-3.12.json" with { type: "json" };
import GHES_313_DEREF from "./generated/ghes-3.13.deref.json" with { type: "json" };
import GHES_313 from "./generated/ghes-3.13.json" with { type: "json" };
import GHAE_DEREF from "./generated/ggithub.ae.deref.json" with { type: "json" };
import GHAE from "./generated/github.ae.json" with { type: "json" };

export const schemas = {
  ["api.github.com.deref"]: DOTCOM_DEREF,
  ["api.github.com"]: DOTCOM,
  ["ghec.deref"]: GHEC_DEREF,
  ["ghec"]: GHEC,
  ["ghes-3.10.deref"]: GHES_310_DEREF,
  ["ghes-3.10"]: GHES_310,
  ["ghes-3.11.deref"]: GHES_311_DEREF,
  ["ghes-3.11"]: GHES_311,
  ["ghes-3.12.deref"]: GHES_312_DEREF,
  ["ghes-3.12"]: GHES_312,
  ["ghes-3.13.deref"]: GHES_313_DEREF,
  ["ghes-3.13"]: GHES_313,
  ["github.ae.deref"]: GHAE_DEREF,
  ["github.ae"]: GHAE,
};
