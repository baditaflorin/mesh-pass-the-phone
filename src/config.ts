import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-pass-the-phone",
  description: "A browser-local rotating prompt game for a room of peers.",
  accentHex: "#7c3aed",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
