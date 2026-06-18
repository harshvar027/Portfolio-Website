declare module "gsap-trial/SplitText" {
  export class SplitText {
    constructor(
      target: Element | string | Array<Element | string>,
      vars?: Record<string, unknown>
    );
    words: Element[];
    chars: Element[];
    lines: Element[];
    revert(): void;
  }
}
