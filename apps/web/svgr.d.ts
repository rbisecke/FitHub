// SVGR module declaration (0.24). Importing a `*.svg` yields a React component,
// per the Turbopack `@svgr/webpack` rule in next.config.ts.
declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}
