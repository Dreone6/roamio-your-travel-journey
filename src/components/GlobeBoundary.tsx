import { Component, type ReactNode } from "react";

/** Keeps a failed globe load from blanking the whole page. */
export class GlobeBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("Globe failed to load", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
